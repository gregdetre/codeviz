# Search, Suggestions, and Filtering

### Introduction
A quick overview of how text search, the typeahead dropdown, and graph filtering work in the CodeViz viewer. Covers behaviours for entities (functions, classes, variables) and groups (modules/files and folders).

### See also
- `../reference/VIEWER_COMMANDS.md` – keyboard and command palette actions impacting visibility and focus
- `../reference/LAYOUT.md` – layouts that affect graph visibility and readability
- `../../ts/viewer/src/app.ts` – wiring for search box, dropdown, and focus logic
- `../../ts/viewer/src/search.ts` – core filter behaviour for fading/hiding elements based on text
- `../../ts/viewer/src/details-panel.ts` – overview rendering and group contents display (modules/folders)

### Principles, key decisions
- The search input always applies the filter (fade/hide) to the canvas; suggestions are additive UX for fast navigation.
- Suggestions list includes both entity nodes and group nodes (module/file and folder) to allow selection of higher-level containers.
- Selecting a suggestion focuses the node and updates the details panel; this does not clear the underlying search term.
- Filtering respects current visibility toggles (functions/classes/variables) and current mode (e.g. modules view).

### Behaviours
- Text input:
  - As you type, the graph is filtered via fade by default (configurable to hide).
  - Matching is case-insensitive across id, label, module path, and file path fields.
- Suggestions dropdown:
  - Populates with best matches from:
    - Entities: functions, classes, variables (from raw graph data)
    - Groups: modules (files) and folders (from rendered Cytoscape elements)
  - Up to 30 suggestions, ranked by earliest match position then label.
  - Keyboard: ArrowUp/ArrowDown to move, Enter to select; Escape to close.
  - Mouse: hover highlights, click to select.
- Selecting a suggestion:
  - Clears previous focus, focuses the selected node, centres it, and updates details.
  - Leaves the search filter active; the user can then refine or clear as needed.
- Clearing search:
  - Empty input removes fade/hide, restoring all elements per current visibility toggles.

### Implementation overview
- Filtering: `search(cy, term, mode)` in `ts/viewer/src/search.ts` computes matching nodes and fades/hides the rest. It matches on `label`, `module`, `file`, and `id`.
- Dropdown suggestions: Implemented in `ts/viewer/src/app.ts` near the search box wiring.
  - Entities are pulled from `graph.nodes` and scored by textual match.
  - Modules and folders are obtained from live Cytoscape nodes (`type = "module"|"folder"`) to reflect current grouping.
  - Module entries show `label`, module path, and a representative file path when available.
- Details panel:
  - For entity nodes, shows metadata, tags, and incoming/outgoing neighbours.
  - For modules, shows a grouped listing of contained entities.
  - For folders, shows contained modules and their entity summaries.

### Gotchas
- If folder grouping is disabled, folder suggestions will not appear (no folder nodes exist).
- Filters can hide elements that would otherwise be shown by focus; focus attempts to unhide relevant nodes, but visibility toggles still apply.
- In modules view, only module and module import edges are present; entity suggestions will not apply in that mode.

### Troubleshooting
- No dropdown items: ensure you typed at least one non-space character; verify modules/folders exist (grouping enabled) and entities are visible by type toggles.
- Selection recentres nothing: the target node may be hidden by toggles; re-enable type toggles or clear the search.
- Performance issues on large graphs: narrow the search term or toggle entity types to reduce visible elements.

### Planned future work
- Highlight matched substrings within suggestions for better visual scanning.
- Fuzzy matching and token splitting for improved recall.
- Configurable ranking to prioritise filename/module matches over ids when desired.
