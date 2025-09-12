import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { basename, join, relative, dirname } from "node:path";
import { minimatch } from "minimatch";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";

export async function runExtract(opts: { targetDir: string; outPath: string; verbose?: boolean; analyzer?: { exclude?: string[]; includeOnly?: string[]; excludeModules?: string[] } }) {
  const parser = new Parser();
  parser.setLanguage(Python);
  const filesAll = await collectPyFiles(opts.targetDir);
  const files = filterFiles(filesAll, opts.targetDir, opts.analyzer);
  const nodes: any[] = [];
  const edgesRaw: any[] = [];
  const groupsMap = new Map<string, string[]>();
  const moduleImports = new Map<string, Map<string, number>>();
  const excludedTopModules = new Set<string>((opts.analyzer?.excludeModules ?? []).map(s => s.trim()).filter(Boolean));

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const tree = parser.parse(source);
    const moduleName = basename(filePath).replace(/\.py$/, "");
    const relFile = toUnix(relative(opts.targetDir, filePath));
    if (!groupsMap.has(moduleName)) groupsMap.set(moduleName, []);

    // First pass: collect import aliases and local function definitions
    const aliasToModule: Record<string, string> = {};
    const importedNameToQualified: Record<string, string> = {};
    const localFunctionNames: Set<string> = new Set();

    walk(tree.rootNode, (node) => {
      if (node.type === "import_statement") {
        registerImportAliases(node.text, aliasToModule);
      } else if (node.type === "import_from_statement") {
        registerFromImports(node.text, importedNameToQualified);
      } else if (node.type === "function_definition") {
        const name = findIdentifier(node) || "<anon>";
        localFunctionNames.add(name);
      }
      if (node.type === "import_statement" || node.type === "import_from_statement") {
        const tops = extractTopImports(node.text);
        for (const top of tops) {
          if (top && top !== moduleName && !excludedTopModules.has(top)) {
            if (!moduleImports.has(moduleName)) moduleImports.set(moduleName, new Map());
            const t = moduleImports.get(moduleName)!;
            t.set(top, (t.get(top) || 0) + 1);
          }
        }
      }
    });

    // Ensure the canonical module name also maps to itself (no alias case)
    aliasToModule[moduleName] = moduleName;

    // Second pass: add nodes and collect edges with resolution
    let currentFuncId: string | null = null;
    walk(tree.rootNode, (node) => {
      if (node.type === "function_definition") {
        const name = findIdentifier(node) || "<anon>";
        const id = `${moduleName}.${name}`;
        const signature = extractFunctionSignature(node);
        const doc = extractFunctionDocstring(node, source);
        const endLine = (node.endPosition?.row ?? node.startPosition.row) + 1;
        nodes.push({ id, label: name, file: toUnix(relFile), line: node.startPosition.row + 1, module: moduleName, kind: "function", tags: {}, signature, doc, endLine });
        groupsMap.get(moduleName)!.push(id);
        currentFuncId = id;
      } else if (node.type === "call" && currentFuncId) {
        const calleeText = getCallCalleeText(node);
        const targetId = calleeText ? resolveCallee(calleeText, moduleName, aliasToModule, importedNameToQualified, localFunctionNames) : null;
        if (targetId) {
          const targetModule = targetId.split(".")[0];
          if (excludedTopModules.has(targetModule)) return; // skip edges into excluded modules
          edgesRaw.push({ source: currentFuncId, target: targetId, kind: "calls", conditions: [], order: null });
        }
      }
    });
  }

  const groups = Array.from(groupsMap.entries()).map(([id, children]) => ({ id, kind: "module", children }));
  const moduleImportsArr = Array.from(moduleImports.entries()).flatMap(([source, targets]) => Array.from(targets.entries()).map(([target, weight]) => ({ source, target, weight })));

  // Filter edges to only include those whose endpoints exist as nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = edgesRaw.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  const graph = { version: 1, schemaVersion: "1.0.0", id_prefix: "", defaultMode: "exec", rootDir: toUnix(opts.targetDir), nodes, edges, groups, moduleImports: moduleImportsArr };
  await mkdir(dirname(opts.outPath), { recursive: true });
  await writeFile(opts.outPath, JSON.stringify(graph, null, 2), "utf8");
}

function filterFiles(files: string[], root: string, analyzer?: { exclude?: string[]; includeOnly?: string[] }): string[] {
  const exclude = (analyzer?.exclude ?? []).filter(Boolean);
  const includeOnly = (analyzer?.includeOnly ?? []).filter(Boolean);
  return files.filter(full => {
    const relUnix = toUnix(relative(root, full));
    if (exclude.some(p => minimatch(relUnix, p, { dot: true }))) return false;
    if (includeOnly.length > 0) {
      return includeOnly.some(p => minimatch(relUnix, p, { dot: true }));
    }
    return true;
  });
}

async function collectPyFiles(dir: string, acc: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collectPyFiles(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".py")) acc.push(full);
  }
  return acc;
}

function walk(node: any, visit: (n: any) => void) {
  visit(node);
  for (let i = 0; i < node.childCount; i++) walk(node.child(i), visit);
}

function toUnix(p: string) { return p.replace(/\\\\/g, "/"); }

function findIdentifier(node: any): string | null {
  // Fallback: find first child of type identifier/name
  for (let i = 0; i < node.childCount; i++) {
    const ch = node.child(i);
    if (ch.type === "identifier" || ch.type === "name") return ch.text;
  }
  return null;
}

function extractFunctionSignature(node: any): string {
  const name = findIdentifier(node) || "<anon>";
  
  // Find the parameters child node
  let parametersNode = null;
  let returnTypeText: string | null = null;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.type === "parameters") {
      parametersNode = child;
      break;
    }
    // Capture return type annotation if present (Python grammar often exposes 'type' after '->')
    if (child.type === "type") {
      try { returnTypeText = String(child.text || '').trim() || null; } catch {}
    }
  }
  
  if (!parametersNode) {
    return `${name}()` + (returnTypeText ? ` -> ${returnTypeText}` : '');
  }
  
  const params: string[] = [];
  
  // Walk through parameter children
  for (let i = 0; i < parametersNode.childCount; i++) {
    const param = parametersNode.child(i);
    
    if (param.type === "identifier") {
      params.push(param.text);
    } else if (param.type === "typed_parameter") {
      // For typed parameters like "x: int"
      const paramName = findIdentifier(param) || "?";
      let typeAnnotation = "";
      
      // Find type annotation
      for (let j = 0; j < param.childCount; j++) {
        const child = param.child(j);
        if (child.type === "type") {
          // Get the type text, skip the colon
          const typeText = child.text;
          typeAnnotation = `: ${typeText}`;
          break;
        }
      }
      
      params.push(`${paramName}${typeAnnotation}`);
    } else if (param.type === "default_parameter") {
      // For parameters with defaults like "x=5" or "x: int = 5"
      let paramText = "";
      for (let j = 0; j < param.childCount; j++) {
        const child = param.child(j);
        if (child.type === "identifier") {
          paramText = child.text;
          break;
        } else if (child.type === "typed_parameter") {
          const subName = findIdentifier(child) || "?";
          let subType = "";
          for (let k = 0; k < child.childCount; k++) {
            const subChild = child.child(k);
            if (subChild.type === "type") {
              subType = `: ${subChild.text}`;
              break;
            }
          }
          paramText = `${subName}${subType}`;
          break;
        }
      }
      
      // Find the default value
      let defaultValue = "";
      for (let j = 0; j < param.childCount; j++) {
        const child = param.child(j);
        if (child.previousSibling && child.previousSibling.text === "=") {
          defaultValue = `=${child.text}`;
          break;
        }
      }
      
      params.push(`${paramText}${defaultValue}`);
    }
  }
  
  const sig = `${name}(${params.join(', ')})`;
  return returnTypeText ? `${sig} -> ${returnTypeText}` : sig;
}

function getCallCalleeText(callNode: any): string | null {
  // Python call: often expression -> call with a child being attribute/identifier
  const first = callNode.child(0);
  if (!first) return null;
  // attribute like module.func
  if (first.type === "attribute") return first.text;
  if (first.type === "identifier" || first.type === "name") return first.text;
  return first.text || null;
}

// Attempt to extract a Python docstring from a function_definition node
function extractFunctionDocstring(funcNode: any, source: string): string | null {
  try {
    // Find the function block/suite which contains statements
    let block: any = null;
    for (let i = 0; i < funcNode.childCount; i++) {
      const ch = funcNode.child(i);
      if (ch && (ch.type === "block" || ch.type === "suite")) { block = ch; break; }
    }
    if (!block) return null;
    // Find first expression_statement in the block
    for (let i = 0; i < block.childCount; i++) {
      const st = block.child(i);
      if (!st) continue;
      // Skip newlines/indent/dedent nodes if present in this grammar
      if (st.type === "\n" || st.type === "indent" || st.type === "dedent") continue;
      if (st.type === "expression_statement") {
        // Expect a single string literal (or concatenated strings)
        const lit = st.text?.trim() ?? "";
        if (!lit) return null;
        // Heuristic: consider it a docstring if literal starts with quotes
        const maybe = unquotePythonStringLiteral(lit);
        if (maybe !== lit) {
          return dedentDocstring(maybe);
        }
      }
      // If the first non-trivia is not an expression_statement, no docstring
      break;
    }
  } catch {}
  return null;
}

function unquotePythonStringLiteral(lit: string): string {
  let s = lit.trim();
  // Remove optional prefixes like r, f, u, b in any combination of length <= 2
  s = s.replace(/^(?:[rRuUbB][fF]?|[fF][rR]?|[rRuUbB])/, '');
  const tripleDq = '"""';
  const tripleSq = "'''";
  if (s.startsWith(tripleDq) && s.endsWith(tripleDq)) return s.slice(3, -3);
  if (s.startsWith(tripleSq) && s.endsWith(tripleSq)) return s.slice(3, -3);
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return lit; // not a plain string literal
}

function dedentDocstring(text: string): string {
  let s = text;
  // Trim a single leading newline common in triple-quoted docstrings
  if (s.startsWith("\n")) s = s.slice(1);
  const lines = s.split(/\r?\n/);
  // Compute minimum indentation (ignore empty lines)
  let minIndent: number | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = /^(\s*)/.exec(line);
    const indent = m ? m[1].length : 0;
    if (minIndent === null || indent < minIndent) minIndent = indent;
  }
  if (!minIndent) return s.trim();
  const dedented = lines.map(l => l.slice(Math.min(l.length, minIndent!))).join('\n');
  return dedented.trim();
}

function extractTopImports(text: string): string[] {
  const out: string[] = [];
  const impRe = /import\s+([a-zA-Z0-9_\.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = impRe.exec(text))) {
    const top = m[1].split(".")[0];
    out.push(top);
  }
  return out;
}

function registerImportAliases(text: string, aliasToModule: Record<string, string>) {
  // Handles: import recipe, import recipe as r, import a.b as ab, import x, y as z
  const m = /import\s+([^\n#;]+)/.exec(text);
  if (!m) return;
  const parts = m[1].split(",").map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const asMatch = part.match(/^([a-zA-Z0-9_\.]+)\s+as\s+([a-zA-Z0-9_]+)$/);
    if (asMatch) {
      const mod = asMatch[1].split(".")[0];
      const alias = asMatch[2];
      aliasToModule[alias] = mod;
    } else {
      const mod = part.split(".")[0];
      aliasToModule[mod] = mod;
    }
  }
}

function registerFromImports(text: string, importedNameToQualified: Record<string, string>) {
  // Handles: from models.recipe import create_recipe, add_ingredient as addi
  // Important: map to the LEAF module name so it matches our module ids (file basenames)
  const cleaned = text.replace(/\n/g, " ").replace(/\s+/g, " ");
  const m = /^from\s+([a-zA-Z0-9_\.]+)\s+import\s+\(?([^\)]+)\)?/.exec(cleaned);
  if (!m) return;
  const modulePath = m[1];
  const segments = modulePath.split(".").filter(Boolean);
  const mod = segments[segments.length - 1]; // use leaf to align with basename-derived module ids
  const items = m[2].split(",").map(s => s.trim()).filter(Boolean);
  for (const it of items) {
    if (it === "*") continue; // skip star imports
    const asMatch = it.match(/^([a-zA-Z0-9_]+)\s+as\s+([a-zA-Z0-9_]+)$/);
    if (asMatch) {
      const name = asMatch[1];
      const local = asMatch[2];
      importedNameToQualified[local] = `${mod}.${name}`;
    } else {
      importedNameToQualified[it] = `${mod}.${it}`;
    }
  }
}

function resolveCallee(calleeText: string, moduleName: string, aliasToModule: Record<string, string>, importedNameToQualified: Record<string, string>, localFunctionNames: Set<string>): string | null {
  if (!calleeText) return null;
  if (calleeText.includes(".")) {
    const segments = calleeText.split(".");
    if (segments.length !== 2) return null; // avoid object.method chains
    const [first, last] = segments;
    if (aliasToModule[first]) {
      return `${aliasToModule[first]}.${last}`;
    }
    return null; // unknown qualifier (likely variable), skip
  } else {
    if (importedNameToQualified[calleeText]) {
      return importedNameToQualified[calleeText];
    }
    if (localFunctionNames.has(calleeText)) {
      return `${moduleName}.${calleeText}`;
    }
    return null; // unknown/builtin -> skip
  }
}
