### Viewer details pane

This document describes the right‑hand details pane in the CodeViz viewer: what it shows, how it reacts to selection and filtering, and how it integrates with the graph for navigation.

### See also

- `UI_WIDGETS_ARRANGEMENT.md` – overall placement of controls and panes (left toolbar, central canvas, right details)
- `UI_RIGHT_DETAILS_PANE.md` – UI-centric summary of the right-hand pane (quick reference)
- `LAYOUT.md` – graph layout behaviours and when the right pane updates after layout operations
- `VIEWER_COMMANDS.md` – user actions and hotkeys that can affect selection and filtering
- `../ts/viewer/src/details-panel.ts` – implementation of details rendering and overview listing
- `../ts/viewer/src/app.ts` – wiring that triggers details updates, throttling, and search integration

### Principles, key decisions

- Keep the canvas uncluttered; put rich context in the right pane.
- When nothing is selected, show a useful, hierarchical overview of what is currently in scope.
- Links should behave like graph clicks: selecting an item in the details pane focuses it in the graph.
- Reflect filtering: the pane mirrors the current visible, non‑faded scope (both fade and hide modes).
- Avoid sluggishness: re‑render the overview only on meaningful changes and with throttling.

### States and behaviour

#### 1) No selection: hierarchical overview

When no node is selected, the details pane renders a collapsible overview of the current graph scope:

- Folders (if grouping enabled) → Modules → leaf entities (Functions, Classes, Variables)
- Folder and module sections are expanded by default; leaf lists are collapsed by default
- All items are links; clicking a folder, module, or entity focuses it in the graph
- Counts are shown at each level; the header shows total items and modules in scope
- Scope is computed from `:visible` and excludes `.faded` nodes, so it naturally follows search and filter modes

#### 2) Node selected (function/class/variable)

Shows the selected entity’s metadata:

- Label, kind, signature, docstring (if available)
- VS Code deep link to the file and line
- Tag list (LLM annotations when present)
- Incoming/outgoing neighbours as linkified lists

#### 3) Group selected (module or folder)

Shows a group‑specific contents overview:

- Module: a collapsible section with Functions/Classes/Variables (reusing the same list rendering as the overview)
- Folder: a “Folder contents” set of module sections for descendant modules
- All items link to graph elements; clicking focuses in the canvas

### Filtering integration

- Search and filter toggles affect the overview and group contents. The pane only lists nodes that are both visible and not faded.
- The list updates after search input changes, mode/group switches, visibility toggles, and layout refine, but only when there is no active selection.

### Performance

- Overview updates are throttled (~120 ms) and only scheduled on meaningful UI changes.
- Rendering coalesces multiple triggers; selection details always take precedence and are never overwritten by an overview refresh.

### Implementation notes

- Overview, group contents, and entity lists share helpers in `ts/viewer/src/details-panel.ts`:
  - `collectModuleEntryShared(...)`
  - `renderEntityListShared(...)`
  - `renderModuleSectionShared(...)`
- Click handlers in the pane stop event propagation to avoid interfering with `<details>` toggles while still selecting nodes in the graph.
- Throttled updates are scheduled from `ts/viewer/src/app.ts` via `scheduleOverviewRefresh()` and only run when no node is selected.

### Future enhancements

- Per‑section expand/collapse preferences persisted in `viewer-config.json`
- Top‑N truncation with “Show more” for large modules
- Tag and type filters embedded in the pane


