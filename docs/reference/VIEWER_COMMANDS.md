# Viewer Commands (Compact JSON)

Short reference for the compact, Cytoscape‑aligned JSON commands the LLM assistant can produce and the viewer can execute.

Goals/desiderata:
- Prioritises the high-value low-risk/complexity features that we'll need for our codebase-viewer interface.
- Provides almost all of the power of running Cytoscape.js commands. But in JSON, so it can be validated/secured.
- Stay close to the real/standard Cytoscape.js interface (which AI will know from its pretraining data), so it'll be easy for the LLM chatbot to use.
- Compact, i.e. doesn't waste tokens.

## See also

- `PRODUCT_VISION_FEATURES.md`
- `LLM_CHAT_INTERFACE.md`
- `../conversations/250911b_llm_cytoscape_command_interface_design.md` – design + rationale
- `../../ts/viewer/src/command-executor.ts` – executor implementation
- `../../ts/viewer/src/state-snapshot.ts` – snapshot sent to the assistant
- `../../ts/viewer/src/style.ts` – includes base styles and highlight classes
- `KEYBOARD_SHORTCUTS.md` – viewer keyboard and modifier shortcuts

## Command shape

Each item targets either a collection (`cy.$(q)`) or the core (`cy`) depending on the op. Use Cytoscape selectors in `q`.

- Collection (single op):
```json
{ "q": "node[label *= 'preprocess']", "op": "addClass", "arg": "highlighted" }
```

- Collection (chained ops):
```json
{ "q": "node[label *= 'preprocess']", "ops": [["removeClass", "faded"], ["addClass", "highlighted"]] }
```

- Core op (no selector):
```json
{ "op": "layout", "arg": { "name": "fcose", "animate": true } }
```

- Core op with target collection (fit to subset):
```json
{ "op": "fit", "q": "node[module = 'shopping']" }
```

Multiple commands run sequentially; last command wins.

Note: For convenience, several core ops also accept top-level fields in the command in addition to inside `arg` (e.g., `select` can take `q`, `from`, `rel`, `steps`, `as` at top level).

## Selectors (v1.2)

Use Cytoscape selectors with a restricted feature set:
- **Element kinds**: `node`, `edge`, `*`
- **Node data attributes**: `[type = 'function'|'class'|'variable'|'module'|'folder']`, `[module = '...']`, `[label *= '...']`, `[label ^= '...']`, `[label $= '...']`, `[id = '...']`, `[path *= '...']`, `[path ^= '...']`, `[path $= '...']`, `[depth = N]`
- **Negation**: `:not(...)`
- **Unions**: `node, edge`
- **Pseudo-classes**: `:parent`, `:child`, `:leaf`, `:selected`

Tag selectors:
- Function nodes receive per-tag classes `.cv-tag-<tag>` (normalized, lowercase, non-alphanumerics → `-`).
- Examples: `.cv-tag-important`, `.cv-tag-entrypoint`, `.cv-tag-llm`.

Examples:
```text
node[type = 'function']
node[type = 'module']
node[type = 'folder']
node[label *= 'preprocess']
node[path *= 'src/utils']
node:not([module = 'tests'])
*
```

## Allowed operations (v2.3)

- Collection: `addClass`, `removeClass`, `show`, `hide`, `style` (restricted keys), `lock`, `unlock`, `showConnectedEdges`, `hideConnectedEdges`, `collapse` (optional), `expand` (optional)
- Core: `layout` (`elk` | `fcose` | `elk-then-fcose`), `fit`, `center`, `zoom`, `resetViewport`, `resetAll`, `pan`, `viewport`, `batch`, `select`, `setOp`, `clearSet`, `clearAllSets`, `collapseAll` (optional), `expandAll` (optional), `selectPath` (`nodesOnly` optional), `selectByDegree`, `selectComponents`, `selectEdgesBetween`, `filterSet`, `selectEdgesIncident`, `cv.groupFolders`, `cv.applyTagFilter`, `cv.setPositions`, `cv.collapseIds`, `cv.expandIds`
- Allowed classes: `highlighted`, `faded`, `focus`, `incoming-node`, `outgoing-node`, `incoming-edge`, `outgoing-edge`, `second-degree`, `module-highlight`, `group-highlight`
- Allowed style keys:
  - Base: `opacity`, `background-color`, `line-color`, `width`, `text-opacity`
  - Nodes: `border-width`, `border-color`, `shape`, `font-size`, `text-outline-width`, `text-outline-color`
  - Edges: `line-style`, `line-opacity`, `curve-style`, `target-arrow-shape`, `target-arrow-color`

### New in v2.4

- Named sets: `select` stores results as `$name` for later commands. Caps: max 16 sets, 5k IDs each.
- Traversal selection: `select` supports `from` + `rel` (`neighborhood|incomers|outgoers|closedNeighborhood|ancestors|descendants|children|parent`) with bounded `steps` (≤3).
- Set refinement: `filterSet` to refine a $set by selector.
- Incident edges: `selectEdgesIncident` to capture edges touching a $set of nodes.
- Path control: `selectPath` supports `nodesOnly` to exclude edges from the result.
- Set algebra: `setOp` with `union` | `intersection` | `difference` to produce new sets.
- Path/analytics: `selectPath` (shortest path via Dijkstra, capped), `selectByDegree` (min/max, `kind: total|in|out`), `selectComponents` (component membership).
- Edge selection between sets: `selectEdgesBetween` from `$from` nodes to `$to` nodes (directed).
- Optional expand/collapse: if the extension is present, `collapse`/`expand` on node selections and `collapseAll`/`expandAll` operate; otherwise they no-op with a warning.
- Sets management: `clearSet` removes one set; `clearAllSets` removes all.

- Viewer namespace additions:
  - `cv.excludePaths { paths: string[] }` — Persist glob patterns to the active config’s `[analyzer].exclude` and return immediately (no reload).
  - `cv.excludeModules { modules: string[] }` — Persist module names to `[analyzer].excludeModules` and return immediately (no reload).
  - `cv.extract {}` — Trigger server-side extract with the current config; the UI typically reloads after completion.
  - `cv.reloadGraph {}` — Convenience: reloads the page.

#### Viewer namespace (`cv.*`)

These are viewer-specific helper ops used by the Lens system and the assistant. They are no-ops if the required modules are not available.

- `cv.groupFolders { enabled: boolean }` — Suggest regrouping by folders (applied by lens/app logic).
- `cv.applyTagFilter { selected: string[] }` — Programmatically apply tag filtering.
- `cv.setPositions { positions: [{ id, x, y }] }` — Set absolute node positions.
- `cv.collapseIds { ids: string[] }` / `cv.expandIds { ids: string[] }` — Collapse/expand specific nodes (if expand/collapse plugin present).
- `cv.excludePaths { paths: string[] }` — Persist exclude globs to TOML.
- `cv.excludeModules { modules: string[] }` — Persist excluded modules to TOML.
- `cv.extract {}` — Trigger extract via server.
- `cv.reloadGraph {}` — Reload the viewer page.
-
  Group selectors and styles: You can now target compound group nodes directly:
  - Folders: `node[type = 'folder']`
  - Modules (files): `node[type = 'module']`
  - Use the standard `highlighted` class to emphasise groups (legacy `group-highlight` is aliased to `highlighted`).

### Layout options passthrough (safe subset)

`layout` accepts an options object with a bounded subset of parameters:

```json
{ "op": "layout", "arg": { "name": "elk-then-fcose", "elk": { "direction": "DOWN" }, "fcose": { "animate": true, "randomize": false, "numIter": 800 } } }
```

Notes:
- Unknown keys are ignored; numbers are clamped (e.g. `numIter ≤ 5000`).
- Defaults preserved when options omitted.

## Grouping

- Folder grouping: The viewer can display nested folder → file → function compounds.
  - Toggle: left pane “Group folders” checkbox enables/disables folder grouping at runtime.
  - Default: folders deeper than 2 levels are auto-collapsed on load and when toggled on.
  - Expand/collapse: If the expand/collapse extension is available, `collapse`, `expand`, `collapseAll`, `expandAll` operate on selected nodes (parents) and groups.

Examples (operate on groups; collapse commands are no-op if extension unavailable):
```json
[
  { "q": "node[type = 'folder'][depth >= 3]", "op": "collapse" },
  { "q": "node[type = 'module'][path *= 'src/utils']", "op": "addClass", "arg": "highlighted" },
  { "op": "fit", "q": "node[type = 'module'][path *= 'src/utils']" }
]
```

Notes:
- Grouping is viewer-only; underlying JSON nodes/edges remain unchanged.
- Aggregated edges for collapsed groups are not yet shown; detailed edges remain visible when expanded (planned).

## Common recipes
- Highlight Important-tagged functions and fit:
```json
[
  { "q": "node.cv-tag-important", "op": "addClass", "arg": "highlighted" },
  { "op": "fit", "q": "node.cv-tag-important" }
]
```
- Multi-step focus with named sets and halos:
```json
[
  { "op": "select", "q": "node[label = 'main']", "as": "seed" },
  { "op": "select", "from": "$seed", "rel": "closedNeighborhood", "steps": 1, "as": "ring1" },
  { "op": "setOp", "as": "focus", "union": ["$seed", "$ring1"] },
  { "q": "node, edge", "op": "addClass", "arg": "faded" },
  { "q": "$focus", "ops": [["removeClass", "faded"], ["addClass", "highlighted"]] },
  { "op": "fit", "q": "$focus" }
]
```

- Highlight preprocess functions, fade others, and fit:
```json
[
  { "q": "node", "ops": [["addClass", "faded"]] },
  { "q": "node[label *= 'preprocess']", "ops": [["removeClass", "faded"], ["addClass", "highlighted"]] },
  { "op": "fit", "q": "node[label *= 'preprocess']" }
]
```

- Persist excludes and run extract manually:
```json
[
  { "op": "cv.excludePaths", "arg": { "paths": ["src/obsolete/**"] } },
  { "op": "cv.excludeModules", "arg": { "modules": ["legacy_utils"] } },
  { "op": "cv.extract" },
  { "op": "cv.reloadGraph" }
]
```

Equivalent Cytoscape.js:
```javascript
cy.$('node').addClass('faded');
cy.$("node[label *= 'preprocess']").removeClass('faded').addClass('highlighted');
cy.fit(cy.$("node[label *= 'preprocess']"));
```
Explanation: fades all nodes, then unfades and highlights nodes whose label contains "preprocess", and fits the viewport to those nodes.

- Hide variables, show functions and classes:
```json
[
  { "q": "node[type = 'variable']", "op": "hide" },
  { "q": "node[type = 'function'], node[type = 'class']", "op": "show" }
]
```

Equivalent Cytoscape.js:
```javascript
cy.$("node[type = 'variable']").style('display', 'none');
cy.$("node[type = 'function'], node[type = 'class']").style('display', 'element');
```
Explanation: hides variable nodes and ensures function and class nodes are visible.

- Focus module and fit:
```json
[
  { "q": "node[module = 'shopping']", "op": "addClass", "arg": "highlighted" },
  { "op": "fit", "q": "node[module = 'shopping']" }
]
```

Equivalent Cytoscape.js:
```javascript
cy.$("node[module = 'shopping']").addClass('highlighted');
cy.fit(cy.$("node[module = 'shopping']"));
```
Explanation: highlights nodes in the `shopping` module and fits the viewport to them.

- Reset to defaults:
```json
[{ "op": "resetAll" }]
```

Equivalent Cytoscape.js (approximate):
```javascript
cy.$('*').removeClass('highlighted').removeClass('faded').style('display', 'element');
cy.layout({ name: 'fcose', animate: true }).run();
cy.fit();
```
Explanation: removes highlight/fade classes, shows all elements, re-runs the default layout, and fits the viewport.

- Batch, viewport and locking:
```json
[
  { "op": "batch", "arg": { "commands": [
    { "q": "node[label *= 'main']", "op": "lock" },
    { "op": "viewport", "arg": { "zoom": 1.2, "pan": { "x": 0, "y": 0 } } },
    { "q": "node[type = 'function']", "op": "style", "arg": { "border-width": 2, "border-color": "#888" } }
  ] } }
]
```

- Show connected edges for a focus set:
```json
[
  { "q": "node[label *= 'render']", "op": "addClass", "arg": "highlighted" },
  { "q": "node[label *= 'render']", "op": "showConnectedEdges" }
]
```

- Select edges between two named sets and highlight them:
```json
[
  { "op": "select", "q": "node[module = 'main']", "as": "A" },
  { "op": "select", "q": "node[module = 'shopping']", "as": "B" },
  { "op": "selectEdgesBetween", "from": "$A", "to": "$B", "as": "E" },
  { "q": "$E", "op": "addClass", "arg": "highlighted" },
  { "op": "fit", "q": "$E" }
]
```

## Notes

- Large selections may be capped for performance.
- Unknown ops/keys are ignored or rejected.
- Optional features (expand/collapse) are feature-detected and safely no-op when unavailable.

## Limitations and future work

- Selectors:
  - No direct refinement of a set via selector syntax (e.g., `$A & node[type='function']`); use a separate `select` then `setOp`.
  - Traversal limited to `neighborhood|incomers|outgoers|closedNeighborhood`; no caller/callee semantics or typed-edge traversal yet.

- Sets and algebra:
  - No nested expressions or complement; algebra ops work on provided set references only.
  - `clearAllSets` wipes all sets; there is no protected/pinned set notion.

- Path/analytics:
  - `selectPath` is directed and unweighted; may return empty if no path exists.
  - `selectComponents` flattens membership into a single set; no per-component naming/index.
  - Degree kind supports `total|in|out` only; no weighted degree.

- Layouts:
  - Only a safe subset of elk/fcose options; advanced tuning not exposed.
  - No per-subgraph layouts; layout is global per invocation.

- Styling and themes:
  - No named themes or style presets beyond whitelisted inline styles and classes.

- UX and safety:
  - No preview/undo; commands apply immediately.
  - Errors are collected per command and summarized; UI surfacing may be improved later.

Planned enhancements:
- Set refinement via selector intersections and typed-edge traversal (callers/callees).
- Nested set expressions and complement support.
- Path and graph analytics extensions (betweenness, bridges, articulation points, communities).
- Broader layout controls and subgraph-specific layouts.
- Themes and style presets for accessible/high-contrast modes.
- Preview/apply workflow and undo/redo stack.
