import type { ElementDefinition } from "cytoscape";
import type { Graph, ViewerMode } from "./graph-types.js";

export function graphToElements(graph: Graph, opts: { mode: ViewerMode; groupFolders?: boolean }): ElementDefinition[] {
  const elements: ElementDefinition[] = [];

  const nodeIds = new Set(graph.nodes.map(n => n.id));
  const groupFolders = Boolean(opts.groupFolders);

  // Build module -> file map from nodes (module ids are file basenames)
  const moduleToFile = new Map<string, string>();
  for (const n of graph.nodes) {
    if (n.module && n.file && !moduleToFile.has(n.module)) moduleToFile.set(n.module, n.file);
  }

  // If grouping by folders, pre-create folder compound nodes and their hierarchy
  const folderSeen = new Set<string>();
  function ensureFolderChain(folderPath: string) {
    const parts = folderPath.split('/').filter(Boolean);
    let chain = '';
    for (let i = 0; i < parts.length; i++) {
      chain = i === 0 ? parts[i] : `${chain}/${parts[i]}`;
      if (folderSeen.has(chain)) continue;
      folderSeen.add(chain);
      const folderId = `folder:${chain}`;
      const label = parts[i];
      const parent = i > 0 ? `folder:${parts.slice(0, i).join('/')}` : undefined;
      elements.push({ data: { id: folderId, label, displayLabel: insertBreakpoints(label), type: 'folder', path: chain, depth: i + 1, parent } as any });
    }
  }

  if (opts.mode === "modules") {
    // Only module parents and moduleImports as dashed edges
    for (const g of graph.groups) {
      if (g.kind !== "module") continue;
      const fullPath = g.id;
      const name = fullPath.split(/[\\/]/).pop() || fullPath;
      elements.push({ data: { id: `module:${g.id}`, label: name, displayLabel: insertBreakpoints(name), type: "module", path: fullPath } });
    }
    const moduleIds = new Set(graph.groups.filter(g => g.kind === "module").map(g => g.id));
    for (const me of graph.moduleImports ?? []) {
      if (moduleIds.has(me.source) && moduleIds.has(me.target)) {
        elements.push({ data: { id: `m:${me.source}->${me.target}`, source: `module:${me.source}`, target: `module:${me.target}`, type: "moduleImport", weight: me.weight ?? 1 } });
      }
    }
    return elements;
  }

  // explore: module compounds, entity nodes, and edges
  // Optional folder grouping
  if (groupFolders) {
    // Create folder compounds based on each module's file path
    for (const [mod, file] of moduleToFile.entries()) {
      const idx = file.lastIndexOf('/');
      const folderPath = idx >= 0 ? file.slice(0, idx) : '';
      if (folderPath) ensureFolderChain(folderPath);
    }
  }

  // Create module compounds; optionally parent under deepest folder
  for (const g of graph.groups) {
    if (g.kind !== "module") continue;
    const mod = g.id;
    const name = mod.split(/[\\/]/).pop() || mod;
    let parent: string | undefined = undefined;
    if (groupFolders) {
      const file = moduleToFile.get(mod);
      if (file) {
        const idx = file.lastIndexOf('/');
        const folderPath = idx >= 0 ? file.slice(0, idx) : '';
        if (folderPath) parent = `folder:${folderPath}`;
      }
    }
    elements.push({ data: { id: `module:${mod}`, label: name, displayLabel: insertBreakpoints(name), type: "module", path: mod, parent } as any });
  }

  for (const n of graph.nodes) {
    const displayLabel = insertBreakpoints(n.label);
    elements.push({ data: { id: n.id, label: n.label, displayLabel, type: n.kind, parent: `module:${n.module}`, module: n.module, file: n.file, line: n.line, endLine: (n as any).endLine ?? null, signature: n.signature ?? '', doc: n.doc ?? '', tags: n.tags ?? {} } });
  }

  let skipped = 0;
  for (const e of graph.edges) {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
      elements.push({ data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target, type: e.kind } });
    } else {
      skipped++;
    }
  }
  if (skipped > 0) {
    // console.warn in caller
  }
  return elements;
}

function insertBreakpoints(text: string): string {
  // Prefer explicit newlines, as Cytoscape wraps reliably on '\n'
  if (text.includes('_')) {
    const tokens = text.split('_').filter(Boolean);
    if (tokens.join('').length > 12) return tokens.join('\n');
  }
  // Insert newline before capitals in long camelCase
  const camel = text.replace(/([a-z])([A-Z])/g, '$1\n$2');
  if (camel !== text && camel.length > 14) return camel;
  // Fallback: soft-break every ~14 chars at word boundary if possible
  if (text.length > 18) {
    const parts: string[] = [];
    let cur = '';
    for (const ch of text) {
      cur += ch;
      if (cur.length >= 14 && /[\-_.]/.test(ch)) { parts.push(cur); cur = ''; }
    }
    if (cur) parts.push(cur);
    if (parts.length > 1) return parts.join('\n');
  }
  return text;
}


