from __future__ import annotations

"""
Extractor module for CodeViz - extracts codebase structure using AST analysis.
"""

import sys
from pathlib import Path
from typing import Optional

# Add the project root to sys.path to import the standalone extractor
project_root = Path(__file__).parents[3]
sys.path.insert(0, str(project_root))

# Import configuration and standalone extractor
from codeviz_conf import DEFAULT_OUTPUT_DIR, DEFAULT_GRAPH_FILENAME

# Target directory (set by CLI)
TARGET_DIR = None


def extract(out_path: Optional[str] = None) -> str:
    """Extract codebase structure and return the output path.
    
    Args:
        out_path: Optional output path. If None, uses default location.
        
    Returns:
        Path to the generated JSON file
        
    Raises:
        ValueError: If TARGET_DIR is not set
        Exception: If extraction fails
    """
    if TARGET_DIR is None:
        raise ValueError("TARGET_DIR must be set before calling extract()")
    
    # Import the standalone extractor and modify its behavior
    try:
        import standalone_extractor
        import json
        import os
        from pathlib import Path
    except ImportError as e:
        raise ImportError(f"Failed to import dependencies: {e}")
    
    original_cwd = Path.cwd()
    
    try:
        # Temporarily modify the standalone extractor's paths for our target
        original_main_func = standalone_extractor.main
        
        # Determine output path
        if out_path:
            output_file = Path(out_path).absolute()
        else:
            output_file = (DEFAULT_OUTPUT_DIR / DEFAULT_GRAPH_FILENAME).absolute()
            
        # Create a custom main function that extracts from our target directory
        def custom_main():
            # Override the repo_root with our target directory
            repo_root = Path(TARGET_DIR)
            
            # Import configuration from our config instead
            from codeviz_conf import EXCLUDE_FILE_GLOBS, EXCLUDE_MODULES
            
            # Get Python files from target directory
            include_files = []
            for py_file in repo_root.rglob("*.py"):
                rel_path = str(py_file.relative_to(repo_root))
                # Apply file-level excludes
                excluded = False
                for glob_pattern in EXCLUDE_FILE_GLOBS:
                    import fnmatch
                    if fnmatch.fnmatch(rel_path, glob_pattern):
                        excluded = True
                        break
                if not excluded:
                    include_files.append(py_file)
            
            if not include_files:
                raise ValueError(f"No Python files found in {repo_root}")
                
            # Use the extraction logic from the original main function
            # (copying the core logic with our modifications)
            nodes = {}
            edges = []
            
            # AST extraction (simplified version)
            for py in include_files:
                try:
                    n_ast, e_ast = standalone_extractor.extract_with_ast(py, repo_root)
                    for n in n_ast:
                        if n.id not in nodes:
                            nodes[n.id] = n
                    edges.extend(e_ast)
                except Exception as e:
                    # Skip files that can't be parsed
                    continue
            
            # Collect module imports
            module_imports = {}
            for py in include_files:
                try:
                    for src_m, dst_m in standalone_extractor._collect_module_imports(py, repo_root):
                        if EXCLUDE_MODULES and (src_m in EXCLUDE_MODULES or dst_m in EXCLUDE_MODULES):
                            continue
                        module_imports[(src_m, dst_m)] = module_imports.get((src_m, dst_m), 0) + 1
                except Exception:
                    pass
            
            # Collect groups by module
            groups = {}
            for n in list(nodes.values()):
                groups.setdefault(n.module, set()).add(n.id)
                
            # Process edges
            edges_out = []
            for e in edges:
                tags = standalone_extractor.phase_tags_for_edges(e)
                if tags:
                    e.conditions.extend(tags)
                edges_out.append({
                    "source": e.source,
                    "target": e.target,
                    "kind": e.kind,
                    "conditions": e.conditions,
                    "order": e.order,
                })
            
            # Sort for deterministic output
            nodes_sorted = sorted(list(nodes.values()), key=lambda n: n.id)
            edges_sorted = sorted(
                edges_out,
                key=lambda e: (e["source"], e["target"], e["kind"], e.get("order", 10**12)),
            )
            
            # Create output data structure
            from codeviz_conf import DEFAULT_MODE
            data = {
                "version": 1,
                "schemaVersion": "1.0.0",
                "id_prefix": "",
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
            
            # Write output
            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, 'w') as f:
                json.dump(data, f, indent=2)
                
            return data
        
        # Run our custom extraction
        graph_data = custom_main()
        
        return str(output_file)
        
    finally:
        # Restore original working directory
        os.chdir(original_cwd)


