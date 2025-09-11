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
- Default layout is ELK→fCoSE (sequential hybrid). ELK provides layered structure and orthogonal routing; fCoSE refines spacing with `randomize:false`. Module groups as compounds, filtering toggles, neighbor highlight. A toolbar control allows switching layouts; hybrid runs in sequential mode by default (no constrained submode).

### CodeViz specifics: initial vs Re-layout

- Initial render (Explore/Modules):
  - Computes elements for the chosen mode, then applies ELK with:
    - `elk.algorithm = layered`
    - `elk.direction = DOWN`
    - `elk.edgeRouting = ORTHOGONAL` (ELK-only mode)
  - In hybrid (`elk-then-fcose`), ELK runs first (no animation) to seed positions, then fCoSE runs with `randomize:false` and `numIter: 1000` to refine.
- Re-layout button:
  - Triggers a pure fCoSE run on current positions (no ELK reseed). This allows a more compact arrangement that may deviate from strict layer ranks.

Implication: The initial layout emphasizes directional clarity and stable ranks; Re-layout favors compactness and aesthetics via force-directed refinement.

## Layout modes (high-level)
- Default view: emphasizes function calls; imports available via `moduleImports`.
- Modules view (future): emphasize module/package relationships.
- Data structures view (future): highlight entities and functions operating on them.
