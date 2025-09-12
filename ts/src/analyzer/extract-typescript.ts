import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { basename, join, relative, dirname } from "node:path";
import { minimatch } from "minimatch";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";

export async function runExtract(opts: { targetDir: string; outPath: string; verbose?: boolean; analyzer?: { exclude?: string[]; includeOnly?: string[]; excludeModules?: string[] } }) {
  const parser = new Parser();
  // Cast due to type definition mismatch between grammar package and tree-sitter types
  parser.setLanguage(JavaScript as any);

  const filesAll = await collectTsFiles(opts.targetDir);
  const files = filterFiles(filesAll, opts.targetDir, opts.analyzer);

  const nodes: any[] = [];
  const edgesRaw: any[] = [];
  const groupsMap = new Map<string, string[]>();
  const moduleImports = new Map<string, Map<string, number>>();
  const excludedTopModules = new Set<string>((opts.analyzer?.excludeModules ?? []).map(s => s.trim()).filter(Boolean));

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const tree = parser.parse(source);
    const moduleName = basename(filePath).replace(/\.(tsx?|jsx?)$/, "");
    const relFile = toUnix(relative(opts.targetDir, filePath));
    if (!groupsMap.has(moduleName)) groupsMap.set(moduleName, []);

    const aliasToModule: Record<string, string> = {};
    const importedNameToQualified: Record<string, string> = {};
    const localFunctionNames: Set<string> = new Set();

    // First pass: imports + local function names (declarations only; ignore classes)
    walk(tree.rootNode, (node) => {
      if (node.type === "import_statement") {
        registerTsImportAliases(node.text, aliasToModule, importedNameToQualified);
        const tops = extractTopImportsTS(node.text);
        for (const top of tops) {
          if (top && top !== moduleName && !excludedTopModules.has(top)) {
            if (!moduleImports.has(moduleName)) moduleImports.set(moduleName, new Map());
            const t = moduleImports.get(moduleName)!;
            t.set(top, (t.get(top) || 0) + 1);
          }
        }
      } else if (node.type === "function_declaration") {
        const name = findIdentifier(node) || "<anon>";
        localFunctionNames.add(name);
      }
      // We intentionally ignore class_declaration/method_definition for now
    });

    // Ensure module can qualify itself
    aliasToModule[moduleName] = moduleName;

    // Second pass: add nodes and collect edges
    let currentFuncId: string | null = null;
    walk(tree.rootNode, (node) => {
      if (node.type === "function_declaration") {
        const name = findIdentifier(node) || "<anon>";
        const id = `${moduleName}.${name}`;
        const signature = extractTSFunctionSignature(node);
        const endLine = (node.endPosition?.row ?? node.startPosition.row) + 1;
        nodes.push({ id, label: name, file: toUnix(relFile), line: node.startPosition.row + 1, module: moduleName, kind: "function", tags: {}, signature, doc: null, endLine });
        groupsMap.get(moduleName)!.push(id);
        currentFuncId = id;
      } else if (node.type === "call_expression" && currentFuncId) {
        const calleeText = getCallCalleeTextTS(node);
        const targetId = calleeText ? resolveCalleeTS(calleeText, moduleName, aliasToModule, importedNameToQualified, localFunctionNames) : null;
        if (targetId) {
          const targetModule = targetId.split(".")[0];
          if (excludedTopModules.has(targetModule)) return;
          edgesRaw.push({ source: currentFuncId, target: targetId, kind: "calls", conditions: [], order: null });
        }
      }
    });
  }

  const groups = Array.from(groupsMap.entries()).map(([id, children]) => ({ id, kind: "module", children }));
  const moduleImportsArr = Array.from(moduleImports.entries()).flatMap(([source, targets]) => Array.from(targets.entries()).map(([target, weight]) => ({ source, target, weight })));

  // Filter edges to only those whose endpoints exist as nodes
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

async function collectTsFiles(dir: string, acc: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collectTsFiles(full, acc);
    else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) && !entry.name.endsWith(".d.ts")) acc.push(full);
  }
  return acc;
}

function walk(node: any, visit: (n: any) => void) {
  visit(node);
  for (let i = 0; i < node.childCount; i++) walk(node.child(i), visit);
}

function toUnix(p: string) { return p.replace(/\\/g, "/"); }

function findIdentifier(node: any): string | null {
  // Try to find named child identifier first
  const nameField = node.childForFieldName?.("name");
  if (nameField && (nameField.type === "identifier" || nameField.type === "type_identifier")) return nameField.text;
  for (let i = 0; i < node.childCount; i++) {
    const ch = node.child(i);
    if (ch.type === "identifier") return ch.text;
  }
  return null;
}

function extractTSFunctionSignature(node: any): string {
  const name = findIdentifier(node) || "<anon>";
  const paramsNode = node.childForFieldName?.("parameters") || findFirstChildOfType(node, "parameters") || findFirstChildOfType(node, "formal_parameters");
  const returnType = node.childForFieldName?.("return_type") || findFirstChildOfType(node, "type_annotation");

  const params: string[] = [];
  if (paramsNode) {
    // In TS, parameters may be represented as a list inside parentheses under the parameters node
    for (let i = 0; i < paramsNode.childCount; i++) {
      const param = paramsNode.child(i);
      if (param.type === "identifier") {
        params.push(param.text);
      } else if (param.type === "required_parameter" || param.type === "optional_parameter" || param.type === "rest_parameter" || param.type === "identifier" || param.type === "assignment_pattern") {
        const id = param.childForFieldName?.("name") || findFirstChildOfType(param, "identifier");
        const typeAnn = findFirstChildOfType(param, "type_annotation");
        const idText = id ? id.text : "?";
        const tText = typeAnn ? `: ${typeAnn.text.replace(/^:\s*/, "")}` : "";
        params.push(`${idText}${tText}`);
      }
    }
  }
  const base = `${name}(${params.join(", ")})`;
  if (returnType) {
    // return_type field may include preceding colon; normalize to `: T` style
    const rt = String(returnType.text || "").trim();
    if (rt) {
      const clean = rt.startsWith(":") ? rt : `: ${rt}`;
      return `${base}${clean}`;
    }
  }
  return base;
}

function findFirstChildOfType(node: any, type: string): any | null {
  for (let i = 0; i < node.childCount; i++) {
    const ch = node.child(i);
    if (ch.type === type) return ch;
  }
  return null;
}

function getCallCalleeTextTS(callNode: any): string | null {
  const fn = callNode.childForFieldName?.("function") || callNode.child(0);
  if (!fn) return null;
  if (fn.type === "member_expression") return fn.text; // e.g., utils.format
  if (fn.type === "identifier") return fn.text;       // e.g., format
  return fn.text || null;
}

function toModuleLeafFromSpecifier(spec: string): string {
  let s = spec.trim().replace(/["']/g, "");
  if (!s) return s;
  if (s.startsWith(".") || s.startsWith("/")) {
    s = s.split("/").filter(Boolean).slice(-1)[0] || s;
    s = s.replace(/\.(t|j)sx?$/, "");
    return s;
  }
  return s.split("/")[0];
}

function extractTopImportsTS(text: string): string[] {
  const out: string[] = [];
  // import ... from "mod";  OR  import "mod";
  const reAll = /(from\s+["']([^"']+)["'])|(^|\s)import\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = reAll.exec(text))) {
    const spec = m[2] || m[4];
    if (!spec) continue;
    const top = toModuleLeafFromSpecifier(spec);
    if (top) out.push(top);
  }
  return out;
}

function registerTsImportAliases(text: string, aliasToModule: Record<string, string>, importedNameToQualified: Record<string, string>) {
  const cleaned = text.replace(/\n/g, " ").replace(/\s+/g, " ");
  // Capture module specifier
  const mFrom = /from\s+(["'])([^"']+)\1/.exec(cleaned) || /import\s+(["'])([^"']+)\1/.exec(cleaned);
  const modSpec = mFrom ? mFrom[2] : null;
  if (!modSpec) return;
  const modLeaf = toModuleLeafFromSpecifier(modSpec);

  // Namespace: import * as ns from 'mod'
  const ns = /import\s*\*\s*as\s*([A-Za-z_$][\w$]*)\s*from/.exec(cleaned);
  if (ns) {
    aliasToModule[ns[1]] = modLeaf;
  }

  // Named imports: import { a as b, c } from 'mod'
  const named = /import\s*(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]+)\}\s*from/.exec(cleaned);
  if (named) {
    const items = named[1].split(",").map(s => s.trim()).filter(Boolean);
    for (const it of items) {
      const asMatch = it.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (asMatch) {
        const imported = asMatch[1];
        const local = asMatch[2];
        importedNameToQualified[local] = `${modLeaf}.${imported}`;
      } else if (/^[A-Za-z_$][\w$]*$/.test(it)) {
        importedNameToQualified[it] = `${modLeaf}.${it}`;
      }
    }
  }
  // Default import intentionally ignored for call mapping for now
}

function resolveCalleeTS(calleeText: string, moduleName: string, aliasToModule: Record<string, string>, importedNameToQualified: Record<string, string>, localFunctionNames: Set<string>): string | null {
  if (!calleeText) return null;
  if (calleeText.includes(".")) {
    const segments = calleeText.split(".");
    if (segments.length !== 2) return null;
    const [first, last] = segments;
    if (aliasToModule[first]) {
      return `${aliasToModule[first]}.${last}`;
    }
    return null;
  } else {
    if (importedNameToQualified[calleeText]) {
      return importedNameToQualified[calleeText];
    }
    if (localFunctionNames.has(calleeText)) {
      return `${moduleName}.${calleeText}`;
    }
    return null;
  }
}


