### UI widgets arrangement

This document describes where interactive controls live in the CodeViz viewer and the rationale for their layout.

### Introduction

The viewer uses a three-pane grid: a left widget pane for controls, a central graph canvas, and a right details pane. This arrangement improves clarity and reduces visual clutter by moving the previously top-aligned toolbar into a persistent left column.

### Current state

- Left widget pane (`.toolbar`): layout selection, mode switching, edge/entity toggles, filter mode, refine button, and search. Hybrid submode controls were removed; hybrid runs sequentially by default.
- Center (`#cy`): Cytoscape.js graph.
- Right details pane (`#details` within `.sidebar`): contextual information for the selected node or module.

### Key files

- `ts/viewer/index.html`: Defines the three-column grid and widget markup. The toolbar remains identified by the same element IDs (e.g., `#layoutSelect`, `#modeSelect`, `#searchBox`).
- `ts/viewer/src/app.ts`: Wires control events by querying elements by ID. No behavioral changes are required due to the move.
- `ts/viewer/src/style.ts`: Cytoscape stylesheet for graph elements (unchanged by layout).

### Layout details

- Grid template: `var(--widgets-width) 1fr var(--sidebar-width)` with areas `toolbar graph sidebar`.
- The widget pane is vertical and scrollable; labels remain readable, and search expands full width.
- The right details pane remains resizable via the drag handle implemented in `ts/viewer/src/main.ts` using the `--sidebar-width` CSS variable.

### See also

- `../reference/LAYOUT.md`: General layout and visual design guidelines for the viewer (includes hybrid details). See also `../reference/USER_GUIDE.md` for end‑user behavior.
- `../reference/GUI_CONTROLS.md` (when available): Control semantics and expected behavior.
- `../../ts/viewer/src/app.ts`: Event wiring for toolbar controls.
- `../reference/libraries/FLOATING_UI_TOOLTIP_INTEGRATION.md`: Tooltip system used in the canvas.
- `../reference/libraries/WORD_WRAP_LIBRARY_INTEGRATION.md`: Text wrapping for labels.

### Principles, key decisions

- Prioritize a spacious, uncluttered canvas by relocating controls off the top bar.
- Preserve element IDs so scripts require no change and tests remain valid.
- Keep widgets keyboard-accessible and vertically grouped to reduce scanning effort.

### Future enhancements

- Collapsible widget groups (e.g., Layers, Layout, Search) with headings.
- Remember user preferences for toggles and layout in `viewer-config.json`.
- Optional compact mode for narrow screens.


