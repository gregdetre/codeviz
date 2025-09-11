import type { Core } from "cytoscape";

export type ViewerSnapshot = {
  schemaVersion: string;
  mode: string;
  layout: string;
  totals: { nodes: number; edges: number };
  countsByType: { nodes: Record<string, number>; edges: Record<string, number> };
  visibleCounts: { nodes: number; edges: number };
  supportedOps: { collection: string[]; core: string[]; classes: string[]; styleKeys: string[] };
  selectorHints: { nodeDataKeys: string[]; edgeDataKeys: string[]; examples: string[] };
  samples: { topNodesByDegree: Array<{ id: string; label: string; type: string; degree: number }> };
};

export function computeSnapshot(cy: Core, supportedOps: ViewerSnapshot["supportedOps"], opts?: { mode?: string; layout?: string }): ViewerSnapshot {
  const mode = opts?.mode ?? "explore";
  const layout = opts?.layout ?? "elk-then-fcose";
  const nodes = cy.nodes();
  const edges = cy.edges();
  const totals = { nodes: nodes.length, edges: edges.length };
  const countsByType = {
    nodes: groupCount(nodes, (n) => String(n.data("type") || "unknown")),
    edges: groupCount(edges, (e) => String(e.data("type") || "unknown"))
  };
  const visibleCounts = {
    nodes: nodes.filter((n) => n.style("display") !== "none").length,
    edges: edges.filter((e) => e.style("display") !== "none").length
  };
  const selectorHints = {
    nodeDataKeys: ["id", "label", "type", "module"],
    edgeDataKeys: ["id", "type", "weight"],
    examples: [
      "node[type = 'function']",
      "node[label *= 'preprocess']",
      "edge[type = 'calls']",
      "node:not([module = 'tests'])",
      "*"
    ]
  };
  const topNodesByDegree = nodes
    .map((n) => ({ id: n.id(), label: String(n.data("label") || ""), type: String(n.data("type") || ""), degree: n.degree() }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 20);
  return { schemaVersion: "1.0.0", mode, layout, totals, countsByType, visibleCounts, supportedOps, selectorHints, samples: { topNodesByDegree } };
}

function groupCount<T>(col: any, keyFn: (x: any) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < col.length; i++) {
    const el = col[i];
    const k = keyFn(el);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}


