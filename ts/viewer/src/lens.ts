import type { Core } from "cytoscape";
import type { Lens, LensPosition } from "./lens-types.js";
import { applyTagFilter, buildTagIndex } from "./tags.js";
import { updateAutoGroupVisibility } from "./visibility.js";
import { executeCompactCommands } from "./command-executor.js";
import { graphToElements } from "./elements.js";
import type { Graph } from "./graph-types.js";
import { applyLayout } from "./layout-manager.js";

export type BuildContext = {
  graph: Graph;
  annotations: any | null;
  groupFolders: boolean;
  filterMode: "fade" | "hide";
  layoutName: string;
};

export function buildLens(cy: Core, ctx: BuildContext): Lens {
  const positions: LensPosition[] = [];
  try {
    const nodes = cy.nodes();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      try {
        const p = n.position();
        positions.push({ id: String(n.id()), x: Number(p.x) || 0, y: Number(p.y) || 0 });
      } catch {}
    }
  } catch {}

  // Collapsed compound nodes via expandCollapse
  const collapsedIds: string[] = [];
  try {
    cy.nodes('.cy-expand-collapse-collapsed-node').forEach((n: any) => collapsedIds.push(String(n.id())));
  } catch {}

  // Compute tag filter from current hidden overlay classes
  let tagFilter: string[] | undefined = undefined;
  try {
    const idx = buildTagIndex(ctx.graph, ctx.annotations);
    const selected = new Set<string>();
    for (const key of idx.allTagKeys) {
      if (key === 'untagged') {
        // Decide selection based on whether any untagged node is visible
        let anyVisible = false;
        idx.untaggedNodeIds.forEach((id) => {
          try {
            const el = cy.getElementById(id);
            if (el && !el.empty() && String(el.style('display')) !== 'none' && !el.hasClass('cv-tag-hidden')) anyVisible = true;
          } catch {}
        });
        if (anyVisible) selected.add('untagged');
        continue;
      }
      const ids = idx.tagKeyToNodeIds.get(key);
      if (!ids || ids.size === 0) continue;
      let anyVisible = false;
      ids.forEach((id) => {
        try {
          const el = cy.getElementById(id);
          if (el && !el.empty() && String(el.style('display')) !== 'none' && !el.hasClass('cv-tag-hidden')) anyVisible = true;
        } catch {}
      });
      if (anyVisible) selected.add(key);
    }
    tagFilter = Array.from(selected);
  } catch {}

  const viewer = {
    groupFolders: Boolean(ctx.groupFolders),
    filterMode: ctx.filterMode,
    tagFilter,
    viewport: { zoom: cy.zoom(), pan: cy.pan() }
  } as Lens["viewer"];

  return {
    version: 1,
    schemaVersion: "1.0.0",
    viewer,
    positions,
    collapsedIds,
    commands: [],
    generatedAt: new Date().toISOString(),
  };
}

export async function applyLens(cy: Core, lens: Lens, ctx: BuildContext): Promise<void> {
  // Grouping toggle may require full element rebuild
  if (typeof lens.viewer?.groupFolders === 'boolean' && lens.viewer.groupFolders !== ctx.groupFolders) {
    try {
      const newElements = graphToElements(ctx.graph, { mode: 'explore' as any, groupFolders: lens.viewer.groupFolders });
      cy.batch(() => {
        cy.elements().remove();
        cy.add(newElements);
      });
    } catch {}
  }

  // Expand all first to then collapse target ids
  try {
    const api = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
    if (api) {
      if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
      if (typeof api.expandAll === 'function') api.expandAll({ animate: false });
    }
  } catch {}

  // Apply positions (if provided) before collapsing to avoid layout jitter
  if (Array.isArray(lens.positions) && lens.positions.length > 0) {
    try {
      cy.batch(() => {
        for (const p of lens.positions as LensPosition[]) {
          try {
            const n = cy.getElementById(p.id);
            if (n && !n.empty() && n.isNode && n.isNode()) n.position({ x: p.x, y: p.y } as any);
          } catch {}
        }
      });
    } catch {}
  }

  // Collapse specific ids
  if (Array.isArray(lens.collapsedIds) && lens.collapsedIds.length > 0) {
    try {
      const api = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
      if (api) {
        const targets = cy.collection(lens.collapsedIds.map(id => cy.getElementById(id)).filter((el: any) => el && el.nonempty()));
        if (targets && targets.length > 0) api.collapse(targets, { animate: false });
      }
    } catch {}
  }

  // Tag filter
  try {
    if (Array.isArray(lens.viewer?.tagFilter)) {
      const idx = buildTagIndex(ctx.graph, ctx.annotations);
      applyTagFilter(cy, idx, new Set(lens.viewer.tagFilter));
    }
  } catch {}

  // Apply viewport last
  try {
    const vp = lens.viewer?.viewport;
    if (vp && typeof vp.zoom === 'number' && vp.pan && typeof vp.pan.x === 'number' && typeof vp.pan.y === 'number') {
      cy.zoom(vp.zoom);
      cy.pan({ x: vp.pan.x, y: vp.pan.y });
    }
  } catch {}

  // Re-aggregate collapsed edges and auto group visibility
  try { (window as any).__cv?.reaggregateCollapsedEdges?.(); } catch {}
  try { updateAutoGroupVisibility(cy); } catch {}

  // Replay commands, if any
  try {
    const cmds = Array.isArray(lens.commands) ? lens.commands : [];
    if (cmds.length > 0) await executeCompactCommands(cy, cmds as any);
  } catch {}

  // If positions missing, run a layout to avoid pile-up
  if (!Array.isArray(lens.positions) || lens.positions.length === 0) {
    try { await applyLayout(cy, ctx.layoutName, {} as any); } catch {}
  }
}


