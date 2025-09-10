<!-- Migration note: The viewer has migrated to Cytoscape.js with ELK for layered/deterministic snapshots. See gdviz/docs/planning/250829a_gdviz_cytoscape_vite_ts_migration.md. This doc is being updated to reflect the Cytoscape-first approach. -->
# gdviz Layout Reference

## Introduction
This document explains how layout works in gdviz, with a focus on Execution Flow. It covers principles, grouping and lanes, interactivity, constraints, and planned extensions so the system remains understandable and maintainable over time.

## See also
- `../README.md` – Quick start and viewer overview
- `ARCHITECTURE.md` – Extraction + viewer architecture and data flow
- `README.md` – User guide, modes and tutorials
- `../../gdviz_conf.py` – Inclusion/exclusion and default viewer mode
- `../../schema/codebase_graph.schema.json` – Visualization data format
- `../../viewer/cyto/` – Cytoscape viewer (Vite + TS)
- Root: `../../extract_codebase_graph.py` – Data extraction (AST/static analysis)
- External: Cytoscape.js: https://js.cytoscape.org/
- External: cytoscape-elk: https://github.com/cytoscape/cytoscape.js-elk
- External: Compound nodes: https://js.cytoscape.org/#compound-nodes

## Principles and key decisions
- Cytoscape-first for interactive rendering; use `cytoscape-elk` for layered/deterministic layout.
- Group semantics (lanes/files) via compound nodes; initial releases may use visual emphasis where full compounds are not yet implemented.
- Default grouping: by module (from schema `groups`); future nesting may add directory → file.
- Interactivity: collapse/expand of groups is prioritized over free dragging.
- Determinism: ELK layered mode ensures stable snapshots; interactive adjustments can re-run ELK.

## States: current vs target
- Current State: ELK layered layout, visual lane semantics, filtering modes, search and details pane.
- Target State: Compound groups with collapse/expand and lane/file containment; deterministic snapshots remain available.

## Layout modes (high-level)
- Execution Flow (ELK layered): emphasizes build phases (styling) and exec edges with arrowheads.
- Modules view (imports): emphasizes module/package relationships; based on `moduleImports` overlay.
- Data structures view: highlights entities (e.g., `Page`, `Site`) and functions operating on them.
- Default mode is configurable via `gdviz_conf.py` (`DEFAULT_MODE`).

## Execution Flow layout
### Grouping model
- Lanes as top-level groups: Represent pipeline phases (e.g., preprocess, build, generate). Children must stay inside.
- File groups nested within lanes: Each node belongs to one file group; optional nesting (directory → file) later.
- Group object (conceptual): `{ id, label, parent, children[], collapsed, bounds? }`.

### Strict containment and alignment
- Strict containment: Children constrained to remain within parent group rectangle.
- Alignment: Use alignment/separation constraints for consistent positioning within lanes (e.g., shared y or guideline alignment).
- Non-overlap: Enable non-overlap so nodes avoid occlusion within groups.

### Collapse/expand behavior
- Collapse: Replace a group’s children with a single proxy node representing the group.
  - Edges to/from children are bundled to the proxy; edge labels can show counts.
  - Group rectangle persists (optional) or shrinks to proxy depending on density.
- Expand: Remove proxy, restore children, re-apply constraints and non-overlap.
- State management: remember which groups are collapsed to preserve user context on refresh.

### Interactions
- Dragging: Nice-to-have. If enabled, dragging a group translates all contained nodes; constraints maintain containment.
- Hover/focus: Optional emphasis of a group and dimming others; helps readability.
- Filtering: Hide low-importance nodes or edge types to reduce clutter; pair with collapse defaults.

### Performance guidance
- Target scale: up to thousands of nodes with progressive disclosure; collapse groups by default where dense.
- Budget: prefer coarse grouping and collapsed-by-default for large files; expand on demand.
- Consider Web Workers and incremental updates if ELK layout time grows; enforce layout time budgets in dev.

## Common patterns and gotchas
- Decorative vs enforced lanes: Ensure lanes are modeled as groups with constraints; otherwise nodes will drift.
- Over-constraint: Too many hard alignments can create oscillation or slow convergence; prefer guidelines where possible.
- Edge clutter on collapse: Bundle edges with counts and tooltips; avoid spaghetti reintroducing clutter after collapsing.
- Determinism: Constraint layouts may not be fully deterministic across runs; if required, offer a deterministic mode separately.

## Troubleshooting
- Nodes escape lane: Verify node’s `groupId` and group containment constraints are applied; check bounds recalculation after resize.
- Jitter or slow convergence: Reduce conflicting constraints, lower collision radius, or increase iteration budget.
- Overlapping labels: Increase separation constraints, adjust label placement strategy, or use truncation with tooltip.
- Collapsed edges unreadable: Aggregate edges and show counts; provide on-hover breakdown.

## Planned future work
- Deterministic “Presentation” mode using a layered layout (optional toggle) for minimal crossings.
- Better edge routing (orthogonal or curved, lane-aware paths) to reduce crossings.
- Auto-collapse heuristics (based on node count/importance) and saved layout state per dataset.
- Deeper nesting support (directory → file → function clusters) with progressive disclosure.
- Potential performance upgrades (e.g., WebCola WASM builds) if needed.

## Sources and references
- Cytoscape.js: https://js.cytoscape.org/
- Cytoscape compound nodes: https://js.cytoscape.org/#compound-nodes
- cytoscape-elk: https://github.com/cytoscape/cytoscape.js-elk
