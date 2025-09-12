<!-- Migration note: The viewer uses Cytoscape.js with ELK→fCoSE as the default ("elk-then-fcose") and also supports ELK-only and fCoSE-only. This doc reflects the Cytoscape-first approach. -->
# CodeViz Layout Reference

## Introduction
This document explains how layout works in CodeViz, with a focus on execution/call relationships and module grouping.

## See also
- `../../README.md` – Quick start and viewer overview
- `ARCHITECTURE.md` – Extraction + viewer architecture and data flow
- `../../schema/codebase_graph.schema.json` – Visualization data format
- `ts/viewer/` – Cytoscape viewer (Vite + TS)
- `cyto/README.md` – Comprehensive Cytoscape.js implementation guides
- `cyto/NODE_GROUPING.md` – Node grouping and compound nodes implementation
- `cyto/LAYOUTS.md` – Mixed layout strategies and constraint-based positioning
- External: Cytoscape.js: https://js.cytoscape.org/

## Principles and key decisions
- Cytoscape-first for interactive rendering; default `elk-then-fcose` (ELK layered presentation, refined by fCoSE). ELK-only and fCoSE-only remain available from the toolbar.
- Group semantics via compound nodes; default grouping by module, with room for nesting later.
- Interactivity: basic toggles and neighbor highlight for MVP; expand/collapse via extension in future.

## Current state
- Default layout is ELK→fCoSE (sequential hybrid). ELK provides layered structure and orthogonal routing; fCoSE refines spacing with `randomize:false`. Module groups as compounds; filtering toggles and neighbor highlight are available. The toolbar allows switching between ELK, fCoSE, and Hybrid; hybrid runs in sequential mode by default (no constrained submode).

### CodeViz specifics: initial vs recompute

- Initial render:
  - Computes elements and applies ELK with:
    - `elk.algorithm = layered`
    - `elk.direction = DOWN`
    - `elk.edgeRouting = ORTHOGONAL` (ELK-only mode)
  - In hybrid (`elk-then-fcose`), ELK runs first (no animation) to seed positions, then fCoSE runs with `randomize:false` and `numIter: 1000` to refine.
- Recompute layout:
  - Re-runs the currently selected algorithm (ELK, fCoSE, or Hybrid) on the current graph positions.
  - Does not change viewport (zoom/pan), selection, visibility filters, or styling.

Implication: The initial layout emphasizes directional clarity and stable ranks; recomputing fCoSE may favor compactness and aesthetics via force-directed refinement.

### Group label placement

- Module and folder group labels are positioned at the bottom-right, inside the group border.
- Implemented via Cytoscape styles: `text-valign: bottom`, `text-halign: right` plus negative `text-margin-x`/`text-margin-y` to pull the label inside the border.

## Notes
- Recenter is a camera-only action that fits the viewport to visible elements.
- Expand/Collapse changes topology and may warrant a recompute for best results.

## Aggregation and group edge semantics

The viewer supports collapsing folder/file groups using compound nodes and an expand/collapse plugin. Edge visibility and aggregation follow these rules:

- When both endpoints are expanded (visible as leaf nodes), show node-level edges only. Group-level aggregates between those endpoints are hidden.
- When one endpoint is collapsed and the other is expanded, show a single aggregated edge per edge type between the collapsed group and the expanded node. The edge width reflects the number of underlying leaf edges. Leaf edges that terminate inside the collapsed group are hidden.
- When both endpoints are collapsed, show a single aggregated edge per edge type between the two groups. Edge widths reflect the count of underlying leaf edges.
- Edges whose both endpoints lie inside the same collapsed group are hidden (no self-loop is drawn on the group).

Implementation details:

- Aggregation scope is targeted: aggregates exist only where at least one endpoint is a collapsed node. This keeps expanded areas at node-level granularity and avoids clutter.
- On expand operations, the system first restores any previously collapsed meta-edges so leaf edges can be fully rehydrated, then re-aggregates around any remaining collapsed endpoints. Collapse operations are followed by the same targeted re-aggregation.
- All UI paths (double-click on a group, group context menu, core context menu expand/collapse-all, and command executor ops) use the same sequence to maintain consistency:
  1) If expanding: preflight restore of collapsed meta-edges
  2) Perform expand/collapse
  3) Targeted re-aggregation around collapsed endpoints

Generic group support:

- The viewer treats any compound node (`node:parent`) as a group for expand/collapse purposes. Default actions such as initial collapse, regroup collapse, and core-menu expand/collapse-all operate on `node:parent`, so future group types (e.g. packages, namespaces, services) inherit the same behaviour automatically. Styling and tooltips may still be type-specific.

Testing:

- UI tests verify that aggregates only exist when an endpoint is collapsed, that double-click vs context menu produce matching results, that mixed-state transitions maintain boundary rules, and that expanding all removes all aggregates.
