# Viewer Commands (Compact JSON)

Short reference for the compact, Cytoscape‑aligned JSON commands the assistant can produce and the viewer can execute.

## See also

- `../conversations/250911b_llm_cytoscape_command_interface_design.md` – design + rationale
- `../../ts/viewer/src/command-executor.ts` – executor implementation
- `../../ts/viewer/src/state-snapshot.ts` – snapshot sent to the assistant
- `../../ts/viewer/src/style.ts` – includes `.faded` and `.highlighted` styles

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

## Selectors (v1)

Use Cytoscape selectors with a restricted feature set:
- Element kinds: `node`, `edge`, `*`
- Data attributes: `[type = 'function'|'class'|'variable'|'module']`, `[module = '...']`, `[label *= '...']`, `[id = '...']`
- Negation: `:not(...)`
- Unions: `node, edge`

Examples:
```text
node[type = 'function']
node[label *= 'preprocess']
node:not([module = 'tests'])
*
```

## Allowed operations (v1.1)

- Collection: `addClass`, `removeClass`, `show`, `hide`, `style` (restricted keys), `lock`, `unlock`, `showConnectedEdges`, `hideConnectedEdges`
- Core: `layout` (`elk` | `fcose` | `elk-then-fcose`), `fit`, `center`, `zoom`, `resetViewport`, `resetAll`, `pan`, `viewport`, `batch`
- Allowed classes: `highlighted`, `faded`
- Allowed style keys:
  - Base: `opacity`, `background-color`, `line-color`, `width`, `text-opacity`
  - Nodes: `border-width`, `border-color`, `shape`, `font-size`, `text-outline-width`, `text-outline-color`
  - Edges: `line-style`, `line-opacity`, `curve-style`, `target-arrow-shape`, `target-arrow-color`

## Common recipes

- Highlight preprocess functions, fade others, and fit:
```json
[
  { "q": "node", "ops": [["addClass", "faded"]] },
  { "q": "node[label *= 'preprocess']", "ops": [["removeClass", "faded"], ["addClass", "highlighted"]] },
  { "op": "fit", "q": "node[label *= 'preprocess']" }
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

## Notes

- Large selections may be capped for performance.
- Unknown ops/keys are ignored or rejected.
- Future versions will add richer selectors and set operations.

## Limitations and future work

- Selector features (v1): no traversal/neighborhood operators (e.g. callers-of, shortest paths), and no custom set expressions beyond simple unions (`,`), attribute conjunction, and negation (`:not(...)`).
- Styles: only a small whitelist of inline `style` keys is allowed; cannot create new classes or change the base stylesheet. Supported classes are `highlighted` and `faded`.
- Layout args: only the `name` is honored (`elk`, `fcose`, `elk-then-fcose`). Other layout parameters are currently ignored by the executor.
- Undo/preview: commands apply immediately; there’s no preview/confirm flow or undo history yet.
- JSON parsing: the server best-effort extracts a JSON array from the model reply; non-JSON text may lead to parse failures. Prefer pure JSON responses.
- Snapshot scope: the assistant receives a compact snapshot (counts, examples), not the full graph; some complex intent may require follow-up.

Planned enhancements:
- Add safe graph relationship selectors (e.g. closed neighborhood, callers/callees, same-module relations).
- Expand set operations (explicit union/intersection/difference with nested expressions).
- Preview/apply workflow and an undo/redo stack for applied command batches.
- Richer, configurable styles and additional semantic classes.
- Broader layout control (tunable parameters per layout, optional animation flags).
