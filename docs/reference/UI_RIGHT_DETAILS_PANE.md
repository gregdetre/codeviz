### Right-hand details pane (UI)

A concise, evergreen guide to the behaviour, structure, and integration of the right-hand details pane in the CodeViz viewer.

### See also

- `VIEWER_DETAILS_PANE.md` – deeper reference on states, filtering behaviour, and shared helpers
- `UI_WIDGETS_ARRANGEMENT.md` – overall layout of the viewer (left controls, center canvas, right pane)
- `LAYOUT.md` – when layout actions trigger refreshes that impact the pane
- `KEYBOARD_SHORTCUTS.md` – interactions that change selection/focus
- `../../ts/viewer/src/details-panel.ts` – implementation of the pane
- `../../ts/viewer/src/app.ts` – event wiring and throttled updates

### Introduction

The details pane provides context for the current focus, keeping the canvas uncluttered. It supports three primary states and mirrors the current filter/visibility settings so lists remain relevant to what the user sees in the graph.

### States

1) No selection – hierarchical overview
- Folders (if grouping enabled) → Modules → leaf entities (Functions, Classes, Variables)
- Folder/module sections expanded by default; entity lists collapsed by default
- All items are clickable and behave like graph clicks (focus + center)
- Counts per section and a summary line (items in scope, module count)
- Scope: visible nodes; when a search term is present, faded nodes are excluded

2) Node selected (function/class/variable)
- Label, kind, signature, docstring (when available)
- VS Code deep link to `file:line`
- Tags (LLM annotations if present)
- Incoming/Outgoing neighbours as linkified lists
- Code section: collapsed by default; expands to lazy‑load the source range for the node using `/api/source?file=…&start=…&end=…`.
- Summarise action: button that calls `/api/summarise-node` to produce a concise Markdown summary. Optional “persist” toggle saves to `out/<target>/node_summaries.json`.

3) Group selected (module/folder)
4) Multiple selection (mixed kinds)
- Target state: Summary header (total + per-kind counts), grouped lists (modules and entities by module), entries clickable to focus, and a clear-selection affordance.
- Current state: Multiple selection is supported on the canvas; the pane still shows the last focused node until multi-select rendering is implemented.

- Module: collapsible Functions/Classes/Variables section (same renderer as overview)
- Folder: “Folder contents” listing composed of module sections for descendant modules
- Lists respect visibility and search-hide; when no search term, selection-only fade is ignored

### Interaction

- Clicking any item with a file/module/node association triggers the same selection/focus as clicking the canvas.
- Click handlers in the pane stop propagation to avoid toggling the surrounding `<details>` unexpectedly.

### Filtering and performance

- The pane mirrors the current visible scope; with an active search term in fade mode, lists exclude faded nodes.
- Overview updates are throttled (~120 ms) and only scheduled on meaningful UI changes (search/typeahead, toggles, group-by, mode, refine/layout) and only when there is no active selection.
 - Source is fetched only when the Code section is first opened. The request includes `start` and `end` when available so the server can slice on the backend.
 - Summaries are generated on demand; when “persist” is enabled, the server writes to `node_summaries.json` next to the graph.

### Implementation overview

- Shared helpers in `details-panel.ts` power both overview and group contents:
  - `collectModuleEntryShared(...)`
  - `renderEntityListShared(...)`
  - `renderModuleSectionShared(...)`
- `app.ts` schedules overview refresh via a small throttle and never overwrites selection details.
- Code section fetches from `/api/source`; summary button posts to `/api/summarise-node` and renders Markdown with `marked` + `DOMPurify` (loaded dynamically in the client).

### Future enhancements

- Persist expand/collapse preferences per section in `viewer-config.json`
- Top‑N truncation with “Show more” for very large groups/modules
- Inline tag/type filters within the pane


