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
