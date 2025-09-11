import { readFile, writeFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";

export async function runExtract(opts: { targetDir: string; outPath: string; verbose?: boolean }) {
  const parser = new Parser();
  parser.setLanguage(Python);
  const files = await collectPyFiles(opts.targetDir);
  const nodes: any[] = [];
  const edges: any[] = [];
  const groupsMap = new Map<string, string[]>();
  const moduleImports = new Map<string, Map<string, number>>();

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const tree = parser.parse(source);
    const moduleName = basename(filePath).replace(/\.py$/, "");
    const relFile = filePath.slice(opts.targetDir.length + 1);
    if (!groupsMap.has(moduleName)) groupsMap.set(moduleName, []);

    let currentFuncId: string | null = null;

    walk(tree.rootNode, (node) => {
      if (node.type === "function_definition") {
        const name = findIdentifier(node) || "<anon>";
        const id = `${moduleName}.${name}`;
        nodes.push({ id, label: name, file: toUnix(relFile), line: node.startPosition.row + 1, module: moduleName, kind: "function", tags: {}, signature: `${name}()`, doc: null });
        groupsMap.get(moduleName)!.push(id);
        currentFuncId = id;
      } else if (node.type === "call" && currentFuncId) {
        const calleeText = getCallCalleeText(node);
        if (calleeText) {
          const targetId = calleeText.includes(".") ? calleeText : `${moduleName}.${calleeText}`;
          edges.push({ source: currentFuncId, target: targetId, kind: "calls", conditions: [], order: null });
        }
      } else if (node.type === "import_statement" || node.type === "import_from_statement") {
        const tops = extractTopImports(node.text);
        for (const top of tops) {
          if (top && top !== moduleName) {
            if (!moduleImports.has(moduleName)) moduleImports.set(moduleName, new Map());
            const t = moduleImports.get(moduleName)!;
            t.set(top, (t.get(top) || 0) + 1);
          }
        }
      }
    });
  }

  const groups = Array.from(groupsMap.entries()).map(([id, children]) => ({ id, kind: "module", children }));
  const moduleImportsArr = Array.from(moduleImports.entries()).flatMap(([source, targets]) => Array.from(targets.entries()).map(([target, weight]) => ({ source, target, weight })));

  const graph = { version: 1, schemaVersion: "1.0.0", id_prefix: "", defaultMode: "exec", nodes, edges, groups, moduleImports: moduleImportsArr };
  await writeFile(opts.outPath, JSON.stringify(graph, null, 2), "utf8");
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

function getCallCalleeText(callNode: any): string | null {
  // Python call: often expression -> call with a child being attribute/identifier
  const first = callNode.child(0);
  if (!first) return null;
  // attribute like module.func
  if (first.type === "attribute") return first.text;
  if (first.type === "identifier" || first.type === "name") return first.text;
  return first.text || null;
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
