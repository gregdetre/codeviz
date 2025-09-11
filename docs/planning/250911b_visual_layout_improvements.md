# CodeViz Visual Polish & Interactivity (Revised Plan)

## Goal, context

Build on the ELK layout foundation to add visual polish, richer interactions, and a flexible architecture for experimentation, while keeping the tool focused on small codebases and a single canonical data model.

**Current state**: ELK gives clean hierarchy and routing; TS server and viewer are working end‑to‑end with basic styles, neighbor highlight, edge toggles, and log forwarding.

**Desired outcome**: A professional, legible visualization with module-aware colors, type-based styling, better edge contrast, focus/highlight flows, search + filters, and a clean two‑pane UI — all structured in small, testable modules.

## References

- `docs/reference/PRODUCT_VISION_FEATURES.md` — Vision, Cytoscape features to target
- `docs/reference/ARCHITECTURE.md` — Two‑phase architecture and data flow
- `docs/reference/LAYOUT.md` — ELK/fCoSE positioning guidance
- `ts/viewer/src/main.ts` — Current viewer entry (ELK + minimal styles)
- `ts/viewer/index.html` — Current single‑pane shell
- `ts/src/server/server.ts` — Single‑port Fastify, serves JSON + `/viewer-config.json`
- `out/codebase_graph.json` — Canonical graph data
- Legacy `src/codeviz/viewer/cyto/*` — Rich styles, color hashing, tooltips, expand/collapse, validation ideas

## Principles, key decisions

- **Single canonical data model**: Keep one stable JSON graph (nodes, edges, groups, moduleImports). Build mode‑specific views via in‑memory transforms (no new persistent formats by default). This follows the “100 functions on one data structure” principle.
- **Mode transforms, not format forks**: Default/Exec, Explore, and Modules modes are different projections/filtering of the same graph into Cytoscape elements. Optionally cache ephemeral transforms in memory/localStorage for speed.
- **Layout policy**: Use ELK for presentation (Default/Exec). Use fCoSE for interactive exploration (drag, expand/collapse). Avoid coupling expand/collapse to ELK.
- **Style system (tokens + generator)**: Centralize colors, sizes, fonts, spacing, and state opacities as tokens. Generate Cytoscape styles from tokens so we can theme, tweak contrast, and evolve visuals without copy‑pasting selectors.
- **Small modules**: Split viewer into types, elements, style, layout manager, interaction manager, details panel, and optional extensions. Favor pure functions and tiny state containers.
- **Feature flags + lazy loading**: Gate heavy extensions (context menus, popper/tippy, expand/collapse) behind toggles and load them on demand.
- **Dev validation + logging**: Validate JSON (Ajv, dev‑only), filter bad edges, and log warnings to `/out/viewer.log`.
- **Small codebase focus**: Optimize for readability and UX over scale; performance flags are optional extras.

## Architectural outline (TS viewer)

- `ts/viewer/src/graph-types.ts` — TS types mirroring `DATA_STRUCTURES.md`
- `ts/viewer/src/load-graph.ts` — Fetch JSON, optional Ajv validation
- `ts/viewer/src/elements.ts` — `graphToElements(graph, options)`; builds module→file→entity compounds
- `ts/viewer/src/style-tokens.ts` — Design tokens (palette, sizes, radii, opacities)
- `ts/viewer/src/style.ts` — `generateStyles(tokens, opts)`; node kind shapes, edge palettes, module color overrides with contrast‑safe labels
- `ts/viewer/src/layout-manager.ts` — `applyLayout(cy, 'elk'|'fcose'|'hybrid', opts?)` and mode→layout mapping
- `ts/viewer/src/interaction-manager.ts` — Focus/highlight, hide vs fade vs disable, background reset, ESC behavior
- `ts/viewer/src/search.ts` — Debounced search across id/label/module/file
- `ts/viewer/src/details-panel.ts` — Render details (signature, doc, file:line, connected nodes)
- `ts/viewer/src/extensions.ts` — Lazy load expand/collapse, context menus, popper/tippy
- `ts/viewer/src/app.ts` — Wire‑up shell, small `ViewerState` (mode, filters, selection, sidebar width)

Suggested minimal APIs

- `loadGraph(): Promise<Graph>` — loads `/out/codebase_graph.json`, optionally validates with Ajv (dev)
- `graphToElements(graph: Graph, opts: { mode: 'default'|'explore'|'modules' }): ElementDefinition[]`
- `generateStyles(tokens: Tokens, opts?: { dark?: boolean }): StylesheetJson[]`
- `applyLayout(cy: Core, layout: 'elk'|'fcose'|'hybrid', opts?: HybridOpts): Promise<void>`
- `InteractionManager(cy).setFilterMode('hide'|'fade'|'disable')`
- `InteractionManager(cy).focus(nodeId?: string)` — focus target or clear
- `search(cy, term: string, mode: 'hide'|'fade'): { matches: Collection }`
- `renderDetails(targetEl: HTMLElement, node: NodeSingular | null): void`
- `Extensions.enable(name: 'contextMenus'|'tooltips'|'expandCollapse')` — lazy-imported, Explore-only by default

## Data modes: transforms vs extra files

- Keep one canonical `codebase_graph.json` as the source of truth.
- Build ephemeral element sets per mode in the viewer:
  - **Default/Exec** (ELK): all entities grouped by module/file, calls emphasized.
  - **Explore** (fCoSE): same elements but optimized for interactive exploration and optional expand/collapse.
  - **Modules**: hide entity nodes; show only module parents; render `moduleImports` as dashed edges.
- Optional: add a CLI flag to emit experimental, derived JSON views for offline debugging. Default remains in‑memory transforms to avoid format sprawl.

## Style system (tokens + generator)

- **Tokens**: central constants for colors (base, edge kinds, states), font sizes, node sizes by kind, shape radii, paddings, and opacities. Include helpers: `hashHslForModule(name)`, `contrastOn(bg)`, `lighten/darken(hsl)`.
- **Generator**: a function that maps tokens to Cytoscape selectors (node kinds, edge kinds, state classes). One place to change visuals across the app, enabling themes and consistent contrast.

## Stages & actions

### Stage: Foundations (types, elements, styles, layout)
- [ ] Add `graph-types.ts` (align with `docs/reference/DATA_STRUCTURES.md`)
- [ ] Add `elements.ts` to build module→file→entity compounds; filter invalid edges safely
- [ ] Add `style-tokens.ts` with palette, sizes, state opacities; implement `hashHslForModule`, `contrastOn`
- [ ] Add `style.ts` that generates Cytoscape styles (node kind shapes, module background with contrast‑safe text, edge palettes by kind)
- [ ] Add `layout-manager.ts` with ELK default and fCoSE alternative
- [ ] Config: extend viewer config to accept `layout: 'elk'|'fcose'|'hybrid'` and optional `hybridMode: 'sequential'|'constrained'` (default `'sequential'`)
- [ ] CLI: `codeviz view open --mode default|explore|modules` maps to initial layout; pass through to `/viewer-config.json`
- [ ] Server: expose `/schema/codebase_graph.schema.json`; viewer: optional Ajv validation (dev‑only) and log warnings to `/client-log`
- Acceptance: viewer boots with generated styles; ELK layout runs; no regressions on demo
- Health: `npm run build --prefix ts`, `tsc --noEmit`, smoke open

### Stage: Quick visual wins (module colors, edge palette, contrast)
- [ ] Apply module color hashing to entity nodes; ensure label contrast is AA‑ish
- [ ] Improve edge palette (calls=blue, imports=purple dashed, runtime=orange dotted, build_step=dark)
- [ ] Add clearer arrowheads and widths; verify at multiple zoom levels
- Acceptance: distinct module tints, legible labels, edges readable in light and dark backgrounds

### Stage: Interaction baseline (focus/highlight, toggles)
- [ ] Focus on click: spotlight node + neighbors, fade others (0.15–0.25); background click resets; ESC clears
- [ ] Edge and node kind toggles (calls/imports; functions/classes/variables)
- [ ] Filter mode toggle: hide vs fade (disable as future optional)
- Acceptance: predictable focus/reset behavior; toggles work without relayout
- Tests: Playwright — click focus and reset; toggle edges; check visible counts

Implementation pointers

- `InteractionManager`
  - `onNodeTap(node)`: if focusMode, call `focus(node)`, else add `.highlighted` to node + neighbors
  - `onBackgroundTap()`: clear highlights and selections
  - `.faded` class styles pulled from tokens (node text-opacity and edge opacity too)
- Toggles use selectors: `edge[type = "calls"]`, `node[type = "function"]`, etc.

### Stage: Two‑pane UI (major UX upgrade)
- [ ] Replace `ts/viewer/index.html` with a clean two‑pane shell (graph left; resizable 340–380px details sidebar right; toolbar on top)
- [ ] Implement `details-panel.ts` to show label, kind, signature, doc, file:line, in/out degree, connected nodes (click to navigate)
- [ ] Persist sidebar width and last chosen mode to `localStorage`
- Acceptance: details update on node click; navigation via connected nodes works; resize persists
- Tests: Playwright — node click populates details; sidebar resizes and persists

Implementation pointers

- Sidebar: CSS flex with drag handle; persist width under `localStorage['viewer.sidebar.width']`
- Details rendering: `renderDetails(el, node)` pure function; add `data-testid` hooks for tests
- Connected nodes: list outgoers/incomers; tap navigates and calls `focus`

### Stage: Modes (Default/Exec, Explore, Modules)
- [ ] Default/Exec (ELK): presentation‑ready view with calls emphasized
- [ ] Explore (fCoSE): interactive exploration; drag friendly; no expand/collapse yet
- [ ] Modules: show only module parents and `moduleImports` edges; dim/hidden function nodes
- [ ] Mode selector and status indicator; store in `localStorage`
- Acceptance: modes switch without errors; layouts apply; indicator updates
- Tests: Playwright — switch modes; verify edge visibility and module imports view

Implementation pointers

- `graphToElements(..., { mode })`:
  - default|explore: add entity nodes under `file:` parents; keep `module:` compounds; route edges by `edges[]`
  - modules: only `module:` parents; synthesize edges from `moduleImports[]` with dashed styling and weight → width
- `layout-manager`: map `mode` → `elk` or `fcose`; animate=false for ELK

### Stage: Hybrid layout (ELK → fCoSE refinement)
- [ ] Add third layout option `hybrid` (sequential) informed by `docs/reference/cyto/HYBRID_LAYOUTS.md`
- [ ] Implement `applyLayout(cy, 'hybrid', { hybridMode?: 'sequential'|'constrained' })`
- [ ] Sequential: run ELK (no animation), on `layoutstop` run fCoSE with `randomize:false`, `numIter: 800–1200`
- [ ] Constrained (optional): derive layer groups from ELK and pass as fCoSE `alignmentConstraint.horizontal`
- [ ] UI: Add toolbar option “Hybrid (ELK→fCoSE)” and a “Refine” button to re-run the fCoSE phase without re‑ELK
- [ ] Config: allow `viewer-config.json` to specify `{ layout: 'hybrid', hybridMode: 'sequential' }`
- Acceptance: hybrid preserves overall vertical layering while improving spacing; switching back to ELK/fCoSE works
- Tests: Playwright — choose Hybrid; verify layout finishes and nodes maintain rough rank order; Refine updates positions

Pseudo‑code (sequential)

```ts
export async function applyLayout(cy: Core, name: 'elk'|'fcose'|'hybrid', opts?: { hybridMode?: 'sequential'|'constrained' }) {
  if (name === 'elk') return cy.layout({ name: 'elk', animate: false, nodeDimensionsIncludeLabels: true, elk: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN', 'elk.edgeRouting': 'ORTHOGONAL' } }).runPromise();
  if (name === 'fcose') return cy.layout({ name: 'fcose', animate: true }).runPromise();
  // hybrid
  await cy.layout({ name: 'elk', animate: false, nodeDimensionsIncludeLabels: true, elk: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' } }).runPromise();
  if ((opts?.hybridMode ?? 'sequential') === 'constrained') {
    const layers = extractLayersFromPositions(cy.nodes());
    return cy.layout({ name: 'fcose', animate: true, randomize: false, alignmentConstraint: { horizontal: layers } }).runPromise();
  }
  return cy.layout({ name: 'fcose', animate: true, randomize: false, numIter: 1000 }).runPromise();
}
```

### Stage: Optional enhancements (gated + lazy loaded)
- [ ] Tooltips (popper/tippy) for entity nodes with signature/doc; enabled in Explore mode only
- [ ] Context menus: focus, hide, select; enabled in Explore mode
- [ ] Expand/Collapse (cytoscape-expand-collapse) for module/file parents; enabled in Explore (fCoSE) mode
- Acceptance: extensions load on demand; ELK mode remains lean; no layout glitches when disabled

### Stage: Validation, logging, and troubleshooting
- [ ] Ajv dev validation; first 10 schema errors logged to console and `/out/viewer.log`
- [ ] Add lightweight status line in UI; link to tail logs via server endpoint
- [ ] Document common errors (missing nodes/edges filtered, absent JSON)
- Acceptance: invalid inputs don’t crash; warnings visible in log and console

### Stage: Tests, docs, and hardening
- [ ] Playwright smoke flows: load; search; focus; mode switch; details panel nav; ESC reset
- [ ] Type checks (`tsc --noEmit`) and minimal lints if configured
- [ ] Update docs: `docs/reference/LAYOUT.md`, `docs/reference/LOGGING.md`, and a short viewer README
- Acceptance: green checks; quick-start instructions verified

### Stage: Final validation and cleanup
- [ ] Test end‑to‑end on multiple small Python projects; solicit feedback
- [ ] Trim dead code and noisy logs; keep style tokens concise
- [ ] Commit with summary and screenshots/GIFs
- Health: `npm run build --prefix ts`, `tsc --noEmit`, smoke open

## Appendix

### Current Tech Stack
- **Frontend**: Vite + TypeScript + Cytoscape.js (ELK + fCoSE)
- **Backend**: Fastify single‑port server (serves viewer, JSON, config, logs)
- **Data**: Canonical JSON schema (`schema/codebase_graph.schema.json`)

### Rationale: Single data model with mode transforms
- Keeps the cognitive load low and APIs simple
- Enables fast experimentation by reusing one parser/output pipeline
- Avoids schema drift and duplicated validation logic
- Allows optional, ephemeral caches without committing to new file formats

### Acceptance heuristics (visual legibility)
- Module tint + label contrast readable against background
- Edge types distinguishable without a legend
- Focus/highlight states obvious at 100% and 75% zoom
- Details panel readable on 13–27" displays; resizable and persistent

### Notes for future
- Data‑structure‑centric mode (later): use tags on nodes to group by data structure; still a transform over the same graph
- Potential schema extensions flagged via tags, not breaking core shape