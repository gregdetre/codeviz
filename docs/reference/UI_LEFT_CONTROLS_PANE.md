### Left-hand controls pane (UI)

A concise, evergreen guide to the behaviour, structure, and integration of the left-hand controls pane in the CodeViz viewer.

### See also

- `VIEWER_COMMANDS.md` – commands and keyboard actions affecting visibility, focus, and layout
- `SEARCH_FILTERING.md` – search box behaviour, suggestions dropdown, and fade/hide filtering
- `LAYOUT.md` – how layout algorithms work and when recomputes/refits occur
- `LLM_CHAT_INTERFACE.md` – requirements and integration plan for the embedded chat panel
- `UI_RIGHT_DETAILS_PANE.md` – right-hand details pane reference (complements this pane)
- `../../ts/viewer/index.html` – pane structure and control element IDs
- `../../ts/viewer/src/app.ts` – wiring of controls, listeners, and throttled updates
- `../../ts/viewer/src/lens.ts` – build/apply Lens utilities
- `../../ts/viewer/src/lenses-ui.ts` – Lenses section UI wiring
- `../../ts/viewer/src/search.ts` – filter implementation
- `../../ts/viewer/src/tags.ts` – Tags widget: tag indexing, ordering, and visibility logic
- `../../ts/viewer/src/layout-manager.ts` – layout selection and execution
- `../../ts/viewer/src/command-executor.ts` – compact command execution for programmatic control
 - `../../ts/src/server/server.ts` – endpoints for exclusions and manual extract

### Introduction

The left-hand pane hosts global controls for layout, grouping, filtering, viewport actions, expand/collapse, typeahead search, and the embedded LLM chat. Controls are designed to be predictable and non-destructive: actions avoid resetting the viewport or selection unless explicitly intended.

### Sections and controls

1) Info and layout
- Layout indicator (`#layoutInfo`) reflects the current layout name.
- Config indicator (`#configInfo`) shows the active config file stem (e.g. `hellozenno_parent`).
- Annotations status (`#annStatus`) shows whether LLM annotations are loaded.
- Layout selector (`#layoutSelect`): choose between `elk`, `fcose`, or `elk-then-fcose` (hybrid sequential). Changing the selection applies the chosen layout and preserves viewport.

2) Grouping and filter mode
- Grouping: `group folders` toggles folder compound nodes. Regrouping rebuilds elements and collapses groups by default.
- Filter mode: `fade` vs `hide` defines how search filtering treats non-matching elements.

3) Layout and viewport actions
- Recompute layout: recomputes the currently selected algorithm, optionally favouring selection neighborhood; preserves viewport and display state.
- Aggressive recompute: stronger fCoSE settings to improve aesthetics when needed.
- Recenter: fits to selection if any; otherwise to current focus/highlight sets; otherwise to all visible elements.
- Clear selection: unselects elements and clears focus-only styling, restoring overview in the right pane.
- Clear filters: resets search and sets filter mode to `fade`.
- Clear styling: removes highlight/focus classes without changing element visibility.

4) Group expand/collapse
- Expand all / Collapse all operate on compound nodes (modules/folders) when the expand/collapse plugin is available.
- Aggregated meta-edges are recomputed to maintain compact group-level edges only where endpoints are collapsed.
- See rules in `LAYOUT.md` under Aggregation and group edge semantics.

5) Search and suggestions
- Search box filters the graph as you type (default `fade`; configurable to `hide`).
- Suggestions dropdown lists folders, modules (files), and entities (functions/classes/variables), ranked as described in `SEARCH_FILTERING.md`.
- Selecting a suggestion focuses the node, centres it, triggers the right-hand details pane update, and runs a local layout recompute for the selection.
- Clearing the input removes the filter and restores default element visibility.

6) Tags (optional, when annotations present)
- Default-collapsed section listing tags: `Important`, `Entrypoint`, `Untagged`, then others ordered by count.
- All tags are selected by default. Shift-click a tag to select “only this”. Quick actions: All / None.
- Function nodes without any tags are controlled by the virtual `Untagged` option.
- Non-matching functions are hidden; edges with hidden endpoints are also hidden.

7) Lenses
- Default-collapsed section to Save/Save As/Delete lenses and list existing ones from `/out/lenses/index.json`.
- Loading a lens applies grouping, tag filter, collapsed groups, positions, viewport, and replays any commands.
- Lenses persist to the same directory as the active `codebase_graph.json` under a `lenses/` subfolder.

8) Embedded chat
9) Extraction (manual)
- A simple section with an Extract button that calls `/api/extract` on the server and then reloads the page.
- Exclusions added via the context menu or commands are persisted to the active `.codeviz.toml` and applied when Extract is run.
- The Chat section is loaded lazily and integrates with the LLM to analyse and manipulate the graph.
- UI includes message history, input field, and a loading indicator. See `LLM_CHAT_INTERFACE.md` for requirements and architecture.

### Interaction principles

- Controls are idempotent: repeated clicks/toggles do not introduce unintended state drift.
- Viewport preservation: layout recomputes keep zoom/pan and selection; recentering is explicit via the Recenter button.
- Non-overwriting updates: the system throttles overview refreshes and avoids overwriting the right-hand selection details.
- Group semantics: any compound node is treated as a group; expand/collapse and aggregation rules apply generically.

### Filtering and performance

- Filtering mirrors the behaviour in `SEARCH_FILTERING.md`; fade mode relies on CSS classes to keep interaction responsive.
- Suggestions are computed client-side from the raw graph entities and live Cytoscape group nodes to reflect grouping state.
- Overview updates are throttled (~120 ms) and scheduled only on meaningful UI changes; source code and summaries are lazy-loaded from the right pane.

### Implementation overview

- Structure: defined in `ts/viewer/index.html` under the `.toolbar` container.
- Event wiring: implemented in `ts/viewer/src/app.ts`.
  - Controls wiring updates element `display` and schedules right-pane overview refresh as needed.
  - Group-by rebuilds elements via `graphToElements(...)`, reapplies styles, collapses groups, re-aggregates group edges, and re-applies layout.
  - Layout selection uses `normalizeLayoutName(...)` and `applyLayout(...)` from `layout-manager.ts`.
  - Recompute helpers snapshot `display` state and restore it after running layout.
  - Recenter logic prioritises selection, then focused sets, then visible elements.
  - Search ties into `search(term, mode)` and manages a dropdown with ranked suggestions; selection updates details and triggers a local recompute.
  - Chat is lazy-initialised from `ts/viewer/src/chat/chat.ts` when `#chat` exists.
- Programmatic control: `command-executor.ts` exposes compact commands and named-set operations for automated manipulation.

### Future enhancements

- Persist control preferences (grouping, filter mode, layout choice) in `viewer-config.json`.
- Add tag/type filter widgets when annotations are present.
- Keyboard shortcuts for common actions (clear filters, recenter, expand/collapse all).
- Fuzzy-highlight matched substrings in suggestions.
