### Goal, context

Elevate CodeViz's compact viewer command language toward fuller Cytoscape.js coverage while maintaining safety, simplicity, and LLM-friendliness. We just shipped v1.1 (batch, viewport, lock/unlock, connected-edge helpers, expanded style whitelist). This plan captures the remaining proposals, why they matter for CodeViz, and how we roll them out safely.

### References

- `docs/reference/VIEWER_COMMANDS.md` — Current spec (v1.1)
- `ts/viewer/src/command-executor.ts` — Executor implementation
- `ts/viewer/src/state-snapshot.ts` — Snapshot for LLM context
- `docs/reference/libraries/cyto/*.md` — Cytoscape features research
- `docs/reference/PRODUCT_VISION_FEATURES.md` — Product goals guiding prioritization

### Principles, key decisions

- Keep the compact, Cytoscape-aligned shape; avoid inventing new DSL syntax.
- Add power in small, testable slices; preserve backward compatibility.
- Strict whitelists and size caps for safety; reject unknown ops/keys.
- No structural edits (add/remove elements) via commands.
- Prefer read-only graph analytics (paths, components) that produce selections.

### Stages & actions

#### Stage: Named sets, traversal, and set algebra (v2 core)
- [ ] Implement named set registry with bounded size
  - Map `string -> Set<string>` of element IDs; avoid holding Cytoscape collections to prevent memory issues
  - Enforce max sets (e.g., 16) and max elements per set (e.g., 5k)
  - Acceptance: creating, reading, deleting sets does not leak memory; caps enforced
- [ ] Core op `select` (q | from+rel)
  - `{"op":"select", "q":"node[type='function']", "as":"A"}`
  - `{"op":"select", "from":"$A", "rel":"neighborhood|incomers|outgoers|closedNeighborhood", "steps":1, "as":"B"}`
  - Acceptance: selectors/traversals populate sets; steps≥1 clamps to max depth (e.g., 3)
- [ ] Core op `setOp` (union | intersection | difference)
  - `{"op":"setOp", "as":"C", "union":["$A","$B"]}`
  - Acceptance: results correct on small fixture graphs; size caps enforced
- [ ] Core op `clearSet`
  - `{"op":"clearSet", "name":"A"}`
  - Acceptance: set removed, memory stable

Context/value for CodeViz:
- Enables multi-step LLM reasoning: “find functions → neighbors → combine → focus.”
- Unlocks natural tasks: callers/callees rings, focus halos, module-scoped operations.

#### Stage: Layout option subset and batch wrapper enhancements (v2.1)
- [ ] Layout options passthrough (safe subset)
  - `{"op":"layout", "arg": {"name":"elk-then-fcose", "elk":{"direction":"DOWN"}, "fcose":{"animate":true,"randomize":false,"numIter":800} }}`
  - Ignore unknown keys; clamp numeric ranges (e.g., numIter ≤ 5000)
  - Acceptance: options forwarded; unknown keys ignored; defaults preserved
- [ ] Batch wrapper acceptance
  - Ensure `batch` executes nested commands in a single `cy.batch` and surfaces errors per child
  - Acceptance: style/visibility ops visibly faster in micro-benchmarks

Context/value for CodeViz:
- Gives the LLM predictable control of major layout dials without overwhelming surface.
- Improves responsiveness when applying multiple changes at once.

#### Stage: Expand/collapse (optional feature) and edge helpers (v2.2)
- [ ] Feature-detect `cy.expandCollapse` and no-op with warning if unavailable
- [ ] Collection/core ops
  - `collapse`, `expand` on `node:parent` selections
  - `collapseAll`, `expandAll` core ops
  - Acceptance: when extension present, operations reflect in graph; otherwise safely ignored
- [ ] Edge helpers already added for connected edges; extend to direction-specific helpers later if needed

Context/value for CodeViz:
- CodeViz groups functions by file/module; expand/collapse supports progressive disclosure.
- Great for reducing visual noise while keeping structural context.

#### Stage: Path and graph analytics selections (v2.3)
- [ ] Core op `selectPath`
  - `{"op":"selectPath", "from":"$A", "to":"$B", "algo":"shortestPath", "as":"P"}`
  - Implement with Cytoscape algorithms where available; timebox; cap path length
  - Acceptance: path found on known fixture; timeout returns empty with warning
- [ ] Core op `selectByDegree`
  - `{"op":"selectByDegree", "min":5, "as":"hubs"}` (and/or `max`)
  - Acceptance: selects expected hubs on fixture
- [ ] Core op `selectComponents`
  - `{"op":"selectComponents", "as":"components"}` (later: index filtering)
  - Acceptance: component counts match fixture

Context/value for CodeViz:
- Supports common developer questions: “how does A reach B?”, “what are hubs?”, “is the graph fragmented?”
- Useful for focus workflows and navigation.

#### Stage: Named styles and themes (v2.4)
- [ ] Core op `theme`
  - `{"op":"theme", "arg":"high-contrast"}` mapping to predefined stylesheet tweaks
  - Acceptance: switches to a known preset; reverts via `theme: default`
- [ ] Core op `stylePreset`
  - `{"op":"stylePreset", "arg":"deemphasize-edges"}` applies curated style bundle via whitelist
  - Acceptance: only whitelisted keys applied; consistent look

Context/value for CodeViz:
- Fast visual modes for presentations or accessibility (contrast, minimal edges).
- Provides stable aesthetics; avoids arbitrary per-command styling.

#### Stage: Documentation and examples
- [ ] Update `VIEWER_COMMANDS.md` with versioning, new ops, examples and safety notes
  - Acceptance: examples runnable; cross-link to relevant cyto docs

#### Stage: Testing
- [ ] Unit tests per op family using tiny fixture graphs
- [ ] Integration sequences: traversal → set algebra → style/fit
- [ ] Negative tests: caps, unknown ops/keys, missing extension
  - Acceptance: all tests pass; CI duration stays reasonable

#### Stage: Snapshot updates
- [ ] Include set names + counts (no IDs) and feature flags in snapshot
  - Acceptance: server snapshot stays compact; assistant can reason about availability

#### Stage: Performance & safety hardening
- [ ] Caps and timeouts
  - Selection size caps, traversal step limits, path timer
  - Acceptance: large selections clamp gracefully; UI stays responsive
- [ ] Error surfaces
  - Collect per-command errors; log to viewer log and include short summary in chat stream
  - Acceptance: user can diagnose ignored ops/keys quickly

### Appendix

Example multi-step flow (callers/callees halo):
```
[
  { "op": "select", "q": "node[label = 'main']", "as": "seed" },
  { "op": "select", "from": "$seed", "rel": "closedNeighborhood", "steps": 1, "as": "ring1" },
  { "op": "setOp", "as": "focus", "union": ["$seed", "$ring1"] },
  { "q": "node, edge", "op": "addClass", "arg": "faded" },
  { "q": "$focus", "ops": [["removeClass", "faded"], ["addClass", "highlighted"]] },
  { "op": "fit", "q": "$focus" }
]
```


