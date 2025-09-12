### Selection and filtering

A concise, evergreen guide to how selection, focus-highlighting, and filtering interact in the CodeViz viewer.

### See also

- `LAYOUT.md` – layouts and their impact on readability and grouping
- `SEARCH_FILTERING.md` – text search, suggestions, and fade/hide filtering
- `UI_RIGHT_DETAILS_PANE.md` – details pane states and content
- `ts/viewer/src/interaction-manager.ts` – input handling (clicks, Shift/Cmd modifiers, pan)
- `ts/viewer/src/search.ts` – filtering logic
- `ts/viewer/src/style.ts` – Cytoscape stylesheet (focus vs selected vs faded)

### Concepts

- Focus: Single-node context highlight used for neighbourhood exploration; applies classes like `focus`, `incoming-node`, `outgoing-node` and may fade/hide others depending on filter mode.
- Selection: Native Cytoscape selection (can be multiple); visually distinct via `node:selected` style; used for batch operations (move multiple, future commands).
- Filtering: Independent visual scope control (fade or hide) driven primarily by search and toggles; not tied to selection.

### Interactions (defaults)

- Click on node/group: Clears selection and sets focus on that node/group.
- Shift+Click on node/group: Toggle selection membership; does not change focus.
- Shift+Drag on whitespace: Draw a selection box; by default replaces the current selection with intersecting nodes/groups.
- Cmd+Click (macOS) / Ctrl+Click (Windows/Linux) on node: Open the node’s file:line in the editor; does not change selection.
- Background click: Clears both focus and selection.
- Pan: Dragging on whitespace pans; hold Space anywhere to pan; middle mouse drag pans.

### Details pane behaviour

- No selection: Overview of the current visible scope (modules with grouped entities), respecting filter mode and toggles.
- Single selection: Detailed view for the focused node/group (metadata, neighbours, or contents for groups).
- Multiple selection: Summary header (count and per-kind counts), followed by grouped lists of the selected items. Entries are clickable to focus.

### Filtering rules

- Search input applies fade (or hide) to non-matching elements. Focus attempts to keep its neighbourhood visible but does not override type toggles.
- The overview excludes faded items when there is a search term; without a search term, selection-caused fade is ignored for the overview.

### Visual styles

- Focus: highlighted border colour and width on focused and neighbouring nodes; matching edge emphasis.
- Selected: distinct border highlight via `node:selected`, separate from focus.
- Faded: reduced opacity for non-emphasised elements under fade mode.

### Notes and limitations

- Selecting compound nodes (modules/folders) and dragging moves their subtree; mixed selections move together per Cytoscape semantics.
- Box selection currently replaces selection; additive box selection may be added in future.
