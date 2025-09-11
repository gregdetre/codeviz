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
- Default layout is ELK→fCoSE (sequential hybrid). ELK provides layered structure and orthogonal routing; fCoSE refines spacing with `randomize:false`. Module groups as compounds, filtering toggles, neighbor highlight. A toolbar control allows switching layouts and choosing the hybrid submode (sequential|constrained).

## Layout modes (high-level)
- Default view: emphasizes function calls; imports available via `moduleImports`.
- Modules view (future): emphasize module/package relationships.
- Data structures view (future): highlight entities and functions operating on them.

## Troubleshooting
- If nodes overlap: increase spacing or switch to grid temporarily.
- Large graphs: disable animation, batch operations, and consider progressive reveal.
