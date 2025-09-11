import type { ElementDefinition } from "cytoscape";
import type { Graph, ViewerMode } from "./graph-types.js";

export function graphToElements(graph: Graph, opts: { mode: ViewerMode }): ElementDefinition[] {
  const elements: ElementDefinition[] = [];

  const nodeIds = new Set(graph.nodes.map(n => n.id));

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
  for (const g of graph.groups) {
    if (g.kind === "module") {
      const fullPath = g.id;
      const name = fullPath.split(/[\\/]/).pop() || fullPath;
      elements.push({ data: { id: `module:${g.id}`, label: name, displayLabel: insertBreakpoints(name), type: "module", path: fullPath } });
    }
  }

  for (const n of graph.nodes) {
    const displayLabel = insertBreakpoints(n.label);
    elements.push({ data: { id: n.id, label: n.label, displayLabel, type: n.kind, parent: `module:${n.module}`, module: n.module, file: n.file, line: n.line, signature: n.signature ?? '', doc: n.doc ?? '', tags: n.tags ?? {} } });
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


