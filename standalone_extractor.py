from __future__ import annotations

import ast
import json
import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import fnmatch


# Restricted v1 scope: keep this list small for fast wins
DEFAULT_INCLUDE_FILES = [
    "gdwebgen.py",
    "pipeline/build.py",
    "generate.py",
    "hoover.py",
    "typ.py",
    "pipeline/site.py",
    "obsidian_utils.py",
    "feeds.py",
    "sitemap.py",
    "redirects.py",
]

DEFAULT_OUTPUT = "gdviz/out/codebase_graph.json"

# Optional user config: gdviz/gdviz_conf.py (loaded dynamically to avoid static import errors)
import importlib

try:
    _GDVIZ = importlib.import_module("gdviz.gdviz_conf")
except Exception:
    _GDVIZ = None

EXCLUDE_MODULES: Set[str] = set(getattr(_GDVIZ, "EXCLUDE_MODULES", []))
EXCLUDE_FILE_GLOBS: List[str] = list(getattr(_GDVIZ, "EXCLUDE_FILE_GLOBS", []))
INCLUDE_FILES_OVERRIDE: Optional[List[str]] = getattr(_GDVIZ, "INCLUDE_FILES", None)
DEFAULT_MODE: str = str(getattr(_GDVIZ, "DEFAULT_MODE", "default"))


@dataclass
class Node:
    id: str
    label: str
    file: str
    line: int | None
    module: str
    kind: str = "function"
    tags: Dict[str, List[str]] = field(default_factory=dict)
    signature: Optional[str] = None
    doc: Optional[str] = None


@dataclass
class Edge:
    source: str
    target: str
    kind: str = "calls"
    conditions: List[str] = field(default_factory=list)
    order: Optional[int] = None


def _read_file_text(path: Path) -> str:
    try:
        return path.read_text()
    except Exception:
        return ""


def _module_name(path: Path, root: Path) -> str:
    # Convert path to module name relative to repo root
    try:
        rel = path.resolve().relative_to(root.resolve())
    except Exception:
        rel = path
    if rel.suffix == ".py":
        return ".".join(rel.with_suffix("").parts)
    return ".".join(rel.parts)


def _parse_gdviz_comments(text: str) -> Dict[int, Dict[str, List[str]]]:
    # Lines like:  # gdviz: datastructures=Page,Frontmatter phase=generate
    hints: Dict[int, Dict[str, List[str]]] = {}
    pattern = re.compile(r"#\s*gdviz:\s*(.*)$")
    for i, line in enumerate(text.splitlines(), start=1):
        m = pattern.search(line)
        if not m:
            continue
        payload = m.group(1)
        kv: Dict[str, List[str]] = {}
        for token in re.split(r"\s+", payload.strip()):
            if "=" in token:
                key, val = token.split("=", 1)
                values = [v.strip() for v in val.split(",") if v.strip()]
                if values:
                    kv[key.strip()] = values
        if kv:
            hints[i] = kv
    return hints


class CallsCollector(ast.NodeVisitor):
    def __init__(
        self, module: str, file_path: Path, gdviz_hints: Dict[int, Dict[str, List[str]]]
    ):
        self.module = module
        self.file_path = file_path
        self.gdviz_hints = gdviz_hints
        self.current_fn: Optional[str] = None
        self.functions: Dict[str, Tuple[str, int]] = {}
        self.edges: List[Edge] = []
        self.fn_tags_by_lineno: Dict[int, Dict[str, List[str]]] = {}
        self.fn_sig_by_lineno: Dict[int, str] = {}
        self.fn_doc_by_lineno: Dict[int, str] = {}
        # Heuristics for datastructure tagging
        self._current_fn_lineno: Optional[int] = None
        self._param_names: Set[str] = set()
        self._writes_to: Set[str] = set()

    def _format_annotation(self, ann: Optional[ast.AST]) -> Optional[str]:
        if ann is None:
            return None
        try:
            return ast.unparse(ann)
        except Exception:
            return None

    def _format_default(self, default: Optional[ast.AST]) -> Optional[str]:
        if default is None:
            return None
        try:
            return ast.unparse(default)
        except Exception:
            return None

    def _build_signature(self, node: ast.FunctionDef) -> str:
        args = node.args
        parts: List[str] = []
        # positional-only + positional args
        posonly = list(getattr(args, "posonlyargs", []) or [])
        normal = list(getattr(args, "args", []) or [])
        positional = posonly + normal
        defaults = list(getattr(args, "defaults", []) or [])
        default_offset = len(positional) - len(defaults)
        for i, a in enumerate(positional):
            name = a.arg
            ann = self._format_annotation(getattr(a, "annotation", None))
            seg = name
            if ann:
                seg += f": {ann}"
            if i >= default_offset:
                dv = self._format_default(defaults[i - default_offset])
                if dv is not None:
                    seg += f"={dv}"
            parts.append(seg)
        # vararg
        if getattr(args, "vararg", None) is not None:
            va = args.vararg
            name = getattr(va, "arg", None) or "args"
            seg = f"*{name}"
            ann = self._format_annotation(getattr(va, "annotation", None))
            if ann:
                seg += f": {ann}"
            parts.append(seg)
        # kw-only
        kwonly = list(getattr(args, "kwonlyargs", []) or [])
        kw_defaults = list(getattr(args, "kw_defaults", []) or [])
        for a, d in zip(kwonly, kw_defaults):
            seg = a.arg
            ann = self._format_annotation(getattr(a, "annotation", None))
            if ann:
                seg += f": {ann}"
            dv = self._format_default(d)
            if dv is not None:
                seg += f"={dv}"
            parts.append(seg)
        # **kwargs
        if getattr(args, "kwarg", None) is not None:
            ka = args.kwarg
            name = getattr(ka, "arg", None) or "kwargs"
            seg = f"**{name}"
            ann = self._format_annotation(getattr(ka, "annotation", None))
            if ann:
                seg += f": {ann}"
            parts.append(seg)
        ret_ann = self._format_annotation(getattr(node, "returns", None))
        sig = f"{node.name}(" + ", ".join(parts) + ")"
        if ret_ann:
            sig += f" -> {ret_ann}"
        return sig

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        fn_id = f"{self.module}.{node.name}"
        self.functions[fn_id] = (
            str(self.file_path),
            getattr(node, "lineno", None) or 0,
        )
        # collect gdviz tags attached to function signature line
        if node.lineno in self.gdviz_hints:
            self.fn_tags_by_lineno[node.lineno] = self.gdviz_hints[node.lineno]
        # collect signature and docstring
        try:
            self.fn_sig_by_lineno[node.lineno] = self._build_signature(node)
        except Exception:
            pass
        try:
            doc = ast.get_docstring(node, clean=True)
            if doc:
                self.fn_doc_by_lineno[node.lineno] = doc
        except Exception:
            pass
        # Prepare datastructure parameter heuristics
        self._param_names = set(
            [
                getattr(a, "arg", "")
                for a in (
                    list(getattr(node.args, "posonlyargs", []) or [])
                    + list(getattr(node.args, "args", []) or [])
                    + list(getattr(node.args, "kwonlyargs", []) or [])
                )
            ]
        )
        self._writes_to = set()
        prev = self.current_fn
        self.current_fn = fn_id
        self._current_fn_lineno = getattr(node, "lineno", None) or 0
        self.generic_visit(node)
        self.current_fn = prev
        # After visiting body, attach datastructure tags if any
        try:
            ds_tags: List[str] = []
            pn = {p.lower() for p in self._param_names}
            if any(x in pn for x in ["page", "pages", "p"]):
                ds_tags.append("Page")
            if any(x in pn for x in ["frontmatter", "fm", "f"]):
                ds_tags.append("Frontmatter")
            if any(x in pn for x in ["site", "s"]):
                ds_tags.append("Site")
            if ds_tags and self._current_fn_lineno:
                self.fn_tags_by_lineno.setdefault(self._current_fn_lineno, {})
                self.fn_tags_by_lineno[self._current_fn_lineno].setdefault(
                    "datastructures", []
                )
                for v in ds_tags:
                    if (
                        v
                        not in self.fn_tags_by_lineno[self._current_fn_lineno][
                            "datastructures"
                        ]
                    ):
                        self.fn_tags_by_lineno[self._current_fn_lineno][
                            "datastructures"
                        ].append(v)
            if self._writes_to and self._current_fn_lineno:
                self.fn_tags_by_lineno.setdefault(self._current_fn_lineno, {})
                self.fn_tags_by_lineno[self._current_fn_lineno].setdefault("writes", [])
                for v in sorted(self._writes_to):
                    if (
                        v
                        not in self.fn_tags_by_lineno[self._current_fn_lineno]["writes"]
                    ):
                        self.fn_tags_by_lineno[self._current_fn_lineno][
                            "writes"
                        ].append(v)
        except Exception:
            pass

    def visit_Call(self, node: ast.Call) -> None:
        if self.current_fn is None:
            return
        # Try to resolve simple names like foo(), module.foo(), obj.method()
        target_name = None
        if isinstance(node.func, ast.Name):
            target_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            # Walk attribute chain to build a dotted name
            parts: List[str] = []
            attr = node.func
            while isinstance(attr, ast.Attribute):
                parts.append(attr.attr)
                attr = attr.value
            if isinstance(attr, ast.Name):
                parts.append(attr.id)
                target_name = ".".join(reversed(parts))
        if target_name:
            # We keep the target as relative; it may be qualified later when we merge modules
            self.edges.append(
                Edge(source=self.current_fn, target=f"{self.module}.{target_name}")
            )
        self.generic_visit(node)

    # Detect writes to key datastructures by attribute assignment
    def visit_Assign(self, node: ast.Assign) -> None:
        try:
            targets = node.targets
        except Exception:
            targets = []
        for t in targets:
            self._check_target_for_write(t)
        self.generic_visit(node)

    def visit_AugAssign(self, node: ast.AugAssign) -> None:
        self._check_target_for_write(node.target)
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if getattr(node, "target", None) is not None:
            self._check_target_for_write(node.target)
        self.generic_visit(node)

    def _check_target_for_write(self, target: ast.AST) -> None:
        try:
            if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name):
                base = target.value.id.lower()
                if base in {"page", "pages", "p"}:
                    self._writes_to.add("Page")
                elif base in {"frontmatter", "fm", "f"}:
                    self._writes_to.add("Frontmatter")
                elif base in {"site", "s"}:
                    self._writes_to.add("Site")
        except Exception:
            pass


def extract_with_ast(py_file: Path, root: Path) -> Tuple[List[Node], List[Edge]]:
    text = _read_file_text(py_file)
    module = _module_name(py_file, root)
    hints = _parse_gdviz_comments(text)
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return [], []
    collector = CallsCollector(module, py_file, hints)
    collector.visit(tree)
    nodes: List[Node] = []
    for fn_id, (file_str, lineno) in collector.functions.items():
        # Attach gdviz tags if present on that line
        tags = collector.fn_tags_by_lineno.get(lineno, {})
        sig = collector.fn_sig_by_lineno.get(lineno)
        doc = collector.fn_doc_by_lineno.get(lineno)
        nodes.append(
            Node(
                id=fn_id,
                label=fn_id.split(".")[-1],
                file=file_str,
                line=lineno or None,
                module=module,
                tags=tags,
                signature=sig,
                doc=doc,
            )
        )
    return nodes, collector.edges


def run_code2flow(py_files: List[Path]) -> Optional[dict]:
    try:
        cmd = ["code2flow", "--format", "json"] + [str(p) for p in py_files]
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode != 0:
            return None
        return json.loads(proc.stdout)
    except Exception:
        return None


def normalize_from_code2flow(
    c2f_json: dict, root: Path
) -> Tuple[List[Node], List[Edge]]:
    nodes: List[Node] = []
    edges: List[Edge] = []
    graph = c2f_json.get("graph", {})
    for n in graph.get("nodes", []):
        nid = n.get("id") or ""
        filename = n.get("filename") or ""
        line = n.get("line")
        try:
            rel = Path(filename).resolve().relative_to(root.resolve())
        except Exception:
            rel = Path(filename)
        module = ".".join(rel.with_suffix("").parts)
        nodes.append(
            Node(
                id=nid,
                label=nid.split(".")[-1],
                file=str(Path(filename)),
                line=line,
                module=module,
            )
        )
    for e in graph.get("edges", []):
        src = e.get("source")
        tgt = e.get("target")
        if src and tgt:
            edges.append(Edge(source=src, target=tgt))
    return nodes, edges


def _collect_module_imports(py_file: Path, root: Path) -> List[Tuple[str, str]]:
    """Return list of (source_module, target_module) import relations for a file."""
    text = _read_file_text(py_file)
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return []
    src_module = _module_name(py_file, root)
    out: List[Tuple[str, str]] = []
    for node in ast.walk(tree):
        try:
            if isinstance(node, ast.Import):
                for alias in node.names:
                    mod = alias.name.split(".")[0] if alias.name else ""
                    if mod:
                        out.append((src_module, alias.name))
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    out.append((src_module, node.module))
        except Exception:
            pass
    return out


def _resolve_import_aliases(tree: ast.AST, current_module: str) -> Dict[str, str]:
    """Map local names used in file to fully-qualified module.function names.

    Only handles 'from X import y as z' or 'from X import y' patterns which are
    sufficient for pipeline/build.py.
    """
    mapping: Dict[str, str] = {}
    for node in tree.body if isinstance(tree, ast.Module) else []:
        if isinstance(node, ast.ImportFrom) and node.module:
            for alias in node.names:
                local = alias.asname or alias.name
                mapping[local] = f"{node.module}.{alias.name}"
        elif isinstance(node, ast.Import):
            # "import module as m" -> map module alias to module
            for alias in node.names:
                local = alias.asname or alias.name
                mapping[local] = alias.name
    return mapping


def extract_run_build_flow(py_file: Path, root: Path) -> List[Edge]:
    """Extract ordered, condition-tagged edges from run_build in pipeline/build.py.

    Returns edges of kind 'build_step' with optional conditions and order.
    """
    text = _read_file_text(py_file)
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return []

    module_name = _module_name(py_file, root)
    src_id = f"{module_name}.run_build"

    alias_map = _resolve_import_aliases(tree, module_name)

    def qualify(name: str) -> Optional[str]:
        tgt = alias_map.get(name)
        if tgt is None:
            # Might be defined in same file (e.g., run_build -> generate via 'from generate import generate')
            # If not in alias_map, we fallback to module-local resolution
            if "." in name:
                return name
            return f"{module_name}.{name}"
        return tgt

    # Identify the run_build function
    fn_node: Optional[ast.FunctionDef] = None
    for n in tree.body:
        if isinstance(n, ast.FunctionDef) and n.name == "run_build":
            fn_node = n
            break
    if fn_node is None:
        return []

    edges: List[Edge] = []
    order_counter = 1

    def parse_condition(test: ast.AST) -> Optional[str]:
        try:
            # if not quick
            if (
                isinstance(test, ast.UnaryOp)
                and isinstance(test.op, ast.Not)
                and isinstance(test.operand, ast.Name)
            ):
                return f"not {test.operand.id}"
            # if postflight / if persist_publish_dts_flag
            if isinstance(test, ast.Name):
                return test.id
        except Exception:
            pass
        return None

    def detect_phase(target: str, call: ast.Call) -> Optional[str]:
        try:
            if target.endswith("pipeline.clean.clean_output_directory"):
                return "clean"
            if target.endswith("pipeline.copy.copy_in_directly"):
                # Disambiguate content vs direct by first arg
                if call.args:
                    a0 = call.args[0]
                    if (
                        isinstance(a0, ast.Subscript)
                        and isinstance(a0.value, ast.Name)
                        and a0.value.id == "config"
                    ):
                        # Slice string varies; handle Constant and Name cases defensively
                        key = None
                        try:
                            sl = a0.slice
                            # Python <=3.8 used Index; 3.9+ uses slice directly
                            if hasattr(sl, "value"):
                                sl = sl.value  # type: ignore[attr-defined]
                            if isinstance(sl, ast.Constant):
                                key = sl.value
                            elif isinstance(sl, ast.Str):  # pragma: no cover - old AST
                                key = sl.s
                        except Exception:
                            key = None
                        if key == "CONTENT_DIR":
                            return "copy_content"
                        if key == "DIRECT_COPY_DIR":
                            return "copy_direct"
                return "copy"
            if target.endswith(
                "redirects.load_redirect_tuples_from_tsv"
            ) or target.endswith("redirects.write_redirect_tuples_to_html_filens"):
                return "redirects"
            if target.endswith("generate.generate"):
                return "generate"
            if (
                target.endswith("obsidian_utils.persist_missing_publish_dts")
                or target.endswith("obsidian_utils.update_missing_slugs")
                or target.endswith("sitemap.generate_xml_sitemap")
            ):
                return "post_generate_updates"
            if target.startswith("feeds."):
                return "feeds"
            if target.endswith("pipeline.postflight.check_broken_links_filesystem"):
                return "postflight"
        except Exception:
            pass
        return None

    def walk_statements(stmts: List[ast.stmt], conds: List[str]) -> None:
        nonlocal order_counter
        for s in stmts:
            if isinstance(s, ast.If):
                cond = parse_condition(s.test)
                new_conds = conds + ([cond] if cond else [])
                walk_statements(list(getattr(s, "body", []) or []), new_conds)
                # We intentionally ignore else blocks for this flow extraction
                continue
            if isinstance(s, ast.Try):
                walk_statements(list(getattr(s, "body", []) or []), conds)
                continue
            # Collect calls in this statement
            for node in ast.walk(s):
                if isinstance(node, ast.Call):
                    func = node.func
                    target_name: Optional[str] = None
                    if isinstance(func, ast.Name):
                        target_name = func.id
                    elif isinstance(func, ast.Attribute) and isinstance(
                        func.value, ast.Name
                    ):
                        target_name = f"{func.value.id}.{func.attr}"
                    if not target_name:
                        continue
                    q = qualify(target_name)
                    if not q:
                        continue
                    # Restrict to our imported/known functions to avoid noise
                    # Heuristic: only consider qualified names that include a dot path beyond current module
                    if q in alias_map.values() or q.endswith("generate"):
                        e = Edge(
                            source=src_id,
                            target=q,
                            kind="build_step",
                            conditions=list(conds),
                            order=order_counter,
                        )
                        # attach phase as a condition tag for easy filtering
                        ph = detect_phase(q, node)
                        if ph:
                            e.conditions.append(ph)
                        edges.append(e)
                        order_counter += 1

    walk_statements(list(getattr(fn_node, "body", []) or []), [])
    return edges


def parse_bash_entrypoint(bash_file: Path) -> List[Edge]:
    # Minimal linkage: gd-publish-www.sh -> gdwebgen.py build generate
    text = _read_file_text(bash_file)
    edges: List[Edge] = []
    if "gdwebgen.py build generate" in text:
        edges.append(
            Edge(
                source=str(bash_file),
                target="gdwebgen.build_generate",
                kind="bash_entry",
            )
        )
    return edges


def phase_tags_for_edges(edge: Edge) -> List[str]:
    # Tag common phases by simple name matching for v1
    target = edge.target
    if ".run_build" in target:
        return ["build"]
    if ".generate" in target:
        return ["generate"]
    return []


def main():
    repo_root = Path(__file__).parent
    if INCLUDE_FILES_OVERRIDE:
        include_files = [
            repo_root / f for f in INCLUDE_FILES_OVERRIDE if (repo_root / f).exists()
        ]
    else:
        include_files = [
            repo_root / f for f in DEFAULT_INCLUDE_FILES if (repo_root / f).exists()
        ]
    # Apply file-level excludes via glob patterns
    if EXCLUDE_FILE_GLOBS:
        filtered: List[Path] = []
        for p in include_files:
            rel = str(p.relative_to(repo_root))
            if any(fnmatch.fnmatch(rel, g) for g in EXCLUDE_FILE_GLOBS):
                continue
            filtered.append(p)
        include_files = filtered
    if not include_files:
        raise SystemExit("No include files found for extraction.")

    # Try code2flow first (best-effort)
    c2f = run_code2flow(include_files)
    nodes: Dict[str, Node] = {}
    edges: List[Edge] = []
    if c2f:
        n2, e2 = normalize_from_code2flow(c2f, repo_root)
        for n in n2:
            nodes[n.id] = n
        edges.extend(e2)

    # AST fallback and enrichment (always run to pick up gdviz hints and fill gaps)
    for py in include_files:
        if py.suffix != ".py":
            continue
        n_ast, e_ast = extract_with_ast(py, repo_root)
        for n in n_ast:
            if n.id not in nodes:
                nodes[n.id] = n
            else:
                # Merge tags from gdviz hints if any
                if n.tags:
                    existing = nodes[n.id].tags
                    for k, vals in n.tags.items():
                        existing.setdefault(k, [])
                        for v in vals:
                            if v not in existing[k]:
                                existing[k].append(v)
        edges.extend(e_ast)

    # Add ordered build flow edges from pipeline/build.py if present
    try:
        build_file = repo_root / "pipeline" / "build.py"
        if build_file.exists():
            edges.extend(extract_run_build_flow(build_file, repo_root))
    except Exception:
        pass

    # Add bash linkage
    bash = repo_root / "gd-publish-www.sh"
    if bash.exists():
        edges.extend(parse_bash_entrypoint(bash))

    # Normalize IDs by stripping a common path-like prefix from code2flow outputs
    id_prefix = ""
    try:
        weird_ids = [
            nid for nid in nodes.keys() if isinstance(nid, str) and nid.startswith("/.")
        ]
        if weird_ids:
            cp = os.path.commonprefix(weird_ids)
            # Trim to the last dot to avoid partial segment cuts
            dot_idx = cp.rfind(".")
            if dot_idx != -1:
                id_prefix = cp[: dot_idx + 1]
            else:
                id_prefix = cp
        if id_prefix:
            new_nodes: Dict[str, Node] = {}
            for nid, n in list(nodes.items()):
                if nid.startswith(id_prefix):
                    new_id = nid[len(id_prefix) :]
                    n.id = new_id
                    new_nodes[new_id] = n
                else:
                    new_nodes[nid] = n
            nodes = new_nodes
            for e in edges:
                if isinstance(e.source, str) and e.source.startswith(id_prefix):
                    e.source = e.source[len(id_prefix) :]
                if isinstance(e.target, str) and e.target.startswith(id_prefix):
                    e.target = e.target[len(id_prefix) :]
    except Exception:
        # Non-fatal; keep original IDs if normalization fails
        id_prefix = ""

    # Collect module import relations
    module_imports: Dict[Tuple[str, str], int] = {}
    for py in include_files:
        try:
            for src_m, dst_m in _collect_module_imports(py, repo_root):
                # Apply excludes
                if EXCLUDE_MODULES and (
                    src_m in EXCLUDE_MODULES or dst_m in EXCLUDE_MODULES
                ):
                    continue
                module_imports[(src_m, dst_m)] = (
                    module_imports.get((src_m, dst_m), 0) + 1
                )
        except Exception:
            pass

    # Attach simple phase tags to edges
    # Also collect groups by module
    groups = {}
    for n in list(nodes.values()):
        groups.setdefault(n.module, set()).add(n.id)
    edges_out = []
    for e in edges:
        tags = phase_tags_for_edges(e)
        if tags:
            e.conditions.extend(tags)
        edges_out.append(
            {
                "source": e.source,
                "target": e.target,
                "kind": e.kind,
                "conditions": e.conditions,
                "order": e.order,
            }
        )

    # Serialize
    # Deterministic ordering for diffs and AI consumption
    nodes_sorted = sorted(list(nodes.values()), key=lambda n: n.id)
    edges_sorted = sorted(
        edges_out,
        key=lambda e: (
            e["source"],
            e["target"],
            e["kind"],
            e["order"] if e.get("order") is not None else 10**12,
        ),
    )

    data = {
        "version": 1,
        "schemaVersion": "1.0.0",
        "id_prefix": id_prefix,
        "defaultMode": DEFAULT_MODE,
        "nodes": [
            {
                "id": n.id,
                "label": n.label,
                "file": n.file,
                "line": n.line,
                "module": n.module,
                "kind": n.kind,
                "tags": n.tags,
                "signature": n.signature,
                "doc": n.doc,
            }
            for n in nodes_sorted
        ],
        "edges": edges_sorted,
        "groups": [
            {"id": m, "kind": "module", "children": sorted(list(ids))}
            for m, ids in sorted(groups.items())
        ],
        "moduleImports": [
            {"source": s, "target": t, "weight": w}
            for (s, t), w in sorted(module_imports.items())
        ],
    }

    out_path = Path(DEFAULT_OUTPUT)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2))
    print(f"Wrote {out_path} ({len(data['nodes'])} nodes, {len(data['edges'])} edges)")


if __name__ == "__main__":
    main()
