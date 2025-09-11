import type { ElementDefinition } from "cytoscape";
import type { Graph, ViewerMode } from "./graph-types.js";

export function graphToElements(graph: Graph, opts: { mode: ViewerMode }): ElementDefinition[] {
  const elements: ElementDefinition[] = [];

  const nodeIds = new Set(graph.nodes.map(n => n.id));

  if (opts.mode === "modules") {
    // Only module parents and moduleImports as dashed edges
    for (const g of graph.groups) {
      if (g.kind !== "module") continue;
      elements.push({ data: { id: `module:${g.id}`, label: g.id, type: "module" } });
    }
    const moduleIds = new Set(graph.groups.filter(g => g.kind === "module").map(g => g.id));
    for (const me of graph.moduleImports ?? []) {
      if (moduleIds.has(me.source) && moduleIds.has(me.target)) {
        elements.push({ data: { id: `m:${me.source}->${me.target}`, source: `module:${me.source}`, target: `module:${me.target}`, type: "moduleImport", weight: me.weight ?? 1 } });
      }
    }
    return elements;
  }

  // default|explore: module compounds, entity nodes, and edges
  for (const g of graph.groups) {
    if (g.kind === "module") {
      elements.push({ data: { id: `module:${g.id}`, label: g.id, type: "module" } });
    }
  }

  for (const n of graph.nodes) {
    elements.push({ data: { id: n.id, label: n.label, type: n.kind, parent: `module:${n.module}`, module: n.module, file: n.file, line: n.line } });
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


