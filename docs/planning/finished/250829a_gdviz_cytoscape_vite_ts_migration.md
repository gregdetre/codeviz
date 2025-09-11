# gdviz migration to Cytoscape + Vite + TypeScript

### Goal, context

- Migrate the gdviz viewer from the current D3 + WebCola prototype to a Cytoscape.js-based viewer bundled with Vite + TypeScript.
- Achieve strict grouping (lanes, files), collapse/expand, and an execution-flow-first experience with an option to switch to a deterministic layered layout later.
- Keep Python as the extractor for Python repos now; plan a TypeScript extractor later that emits the same JSON schema. Target scale: thousands of nodes.


### References

- `gdviz/docs/conversations/250828a_gdviz_layout_webcola_first.md` – Background/user desiderata; now out-of-date on library choice but useful for goals (strict lanes, compounds, collapse-first).
- `gdviz/docs/reference/LAYOUT.md` – Current layout principles (WebCola-first). Will need updating to reflect Cytoscape and dual-layout direction.
- `gdviz/README.md` – Quick start for extracting and serving the viewer. Update to include Vite commands and new viewer entry.
- `../../README.md` – User guide and quick start. Update with new viewer commands and CLI usage.
- `gdviz/docs/reference/LOGGING.md` – Remote browser logging; ensure the new viewer keeps the same logging hooks.
- `gdviz/viewer/index.html` – Legacy D3 viewer (removed).
- `gdviz/schema/codebase_graph.schema.json` – Contract for data interchange. We will version and generate TypeScript types from this.
- `gdviz/gdviz_conf.py` – Defaults (e.g., `DEFAULT_MODE`) referenced by viewer.
- `webserver.py` – Python dev server; we’ll integrate simple reload signaling and/or proxy.
- External: Cytoscape.js (graph UI), `cytoscape-elk` (layered DAG), Vite, watchfiles.


### Principles, key decisions

- Data contract first: `schemaVersion` in JSON; generate TS types from JSON Schema; validate at runtime (AJV) in dev.
- Viewer runtime: Cytoscape.js using ELK (layered DAG). We’ll pursue deterministic snapshots first; if we reintroduce interactive constraints later, we’ll reassess cola.
- Grouping model: Lanes as top-level compounds; file groups nested one level (directory→file later). Collapse/expand is prioritized over free dragging.
- Tooling: Vite + TypeScript. Output static assets and a library-mode bundle for embedding in other sites.
- Dev loop: Use `watchfiles` to rebuild graph JSON and nudge the viewer to reload; keep Python server.
- Extractors: Keep Python (LibCST, grimp) for Python repos now. Plan a Node/TypeScript extractor (ts-morph/TypeScript compiler API) that emits the same schema.
- Performance: Target thousands of nodes. Prefer progressive disclosure (collapsed groups by default), budgets (layout time/heap), and Web Workers later if needed.
- Documentation: Update `LAYOUT.md`, `README.md` (gdviz and root), and logging docs to reflect the new viewer.


### Stages & actions

#### Stage: Project scaffolding and contracts
- [x] Create Vite + TypeScript project for the viewer (framework-light or React minimal if helpful).
  - [x] Decide output path (e.g., `gdviz/viewer/dist/`) and public base so it can be served by `webserver.py` and GitHub Pages.
- [x] Add JSON Schema versioning (`schemaVersion`) to `codebase_graph.json` output; update extractor accordingly (no breaking changes yet).
- [x] Generate TypeScript types from JSON Schema (`json-schema-to-typescript`) and use in the viewer’s data loader.
- [x] Add dev-only runtime validation (AJV) to surface schema drift early.
- [x] Health checks: `tsc --noEmit`, basic eslint/Prettier config, Vite build succeeds.

#### Stage: Minimal Cytoscape viewer
- [x] Load `/gdviz/out/codebase_graph.json` and render nodes/edges in Cytoscape.
- [x] Basic styling by module/color; edge arrows for exec edges.
- [x] Search/filter panel, neighbor highlighting, and details pane parity with current UI.
- [ ] Smoke tests: render small fixture graphs; assert node/edge counts via Playwright (or simple DOM checks).
  - [ ] Add tiny/medium fixtures under `gdviz/viewer/cyto/tests/fixtures/` (e.g., `triangle.json`, `pipeline_small.json`).
  - [ ] Headless load and assert counts via `page.evaluate(() => ({ n: cy.nodes().length, e: cy.edges().length }))`.
  - [ ] Provide `npm run test:smoke` using Playwright; fallback: Vitest + jsdom for simple DOM assertions.

#### Stage: Execution Flow (ELK-first)
- [x] Use ELK layered for execution flow; lanes as styled background bands (styling-only initially).
- [ ] Group semantics via compound nodes (Cytoscape) without COLA constraints; collapse/expand as an interaction, not a force constraint.
  - [ ] Model compounds: lanes as top-level parents; file groups as one nested level. Assign `data.parent` on node elements.
  - [ ] Generate stable parent IDs (e.g., `lane::<name>`, `file::<relpath>`). Create compound elements with labels and background styling.
  - [ ] Collapse/expand approach — Option A: integrate `cytoscape-expand-collapse`; style summary nodes.
  - [ ] Collapse/expand approach — Option B: custom toggle: mark parent `scratch('collapsed', true)`, hide children, show proxy node; re-run ELK.
  - [ ] Lane visuals: lanes as compounds with muted backgrounds; disable child dragging; re-layout on expand/collapse.
- [ ] Depth controls for call-neighborhood expansion around a pivot; keep existing flags (`not quick`, `postflight`, etc.).
- [ ] Depth controls for call-neighborhood expansion around a pivot; keep existing flags (`not quick`, `postflight`, etc.).
  - [ ] BFS from pivot over `exec` edges with max depth N; UI slider (0–4) and stepper.
  - [ ] Respect flags by filtering eligible edges/nodes before traversal; persist selection across mode changes.
  - [ ] Keyboard: `[`/`]` to adjust depth; `Esc` clears pivot.
- [ ] Acceptance: Layout is deterministic; lanes respected visually; collapse/expand stable.

#### Stage: Deterministic mode (ELK)
- [ ] Add a mode toggle to switch to `cytoscape-elk` layered layout for presentation snapshots.
- [ ] Ensure edge crossings reduce vs COLA where possible; maintain lane semantics (styling-only if needed).
- [ ] Snapshot tests: render canonical graphs; compare positions topology-wise (loose bounds) and export PNGs for docs.
  - [ ] ELK options: top-to-bottom rankdir, orthogonal edge routing, tuned layer spacing.
  - [ ] On mode switch, save positions and use `preset` when returning to reduce visual jump.
  - [ ] Export PNGs: `npm run snapshot` calls `cy.png({ full: true })`; commit images to docs.

#### Stage: Dev loop and watchfiles integration
- [ ] Add `watchfiles`-based watcher to rebuild `codebase_graph.json` on extractor or target repo changes.
- [ ] Implement lightweight reload signaling: touch a version file or serve an SSE endpoint that the viewer listens to; on change, `location.reload()`.
- [ ] Optionally run Vite dev server and proxy JSON from Python server or vice versa; document both flows.
- [ ] Acceptance: Save in repo → JSON regenerates → viewer reloads within ~1–2s on small changes.
  - [ ] Python watcher: monitor `gdviz/extractor/**` and target repo; rebuild graph; update `/gdviz/out/version.txt`.
  - [ ] Viewer polling: fetch `/gdviz/out/version.txt` every 1s with `If-None-Match`; reload on change. SSE optional for push updates.
  - [ ] Document Vite proxy in `vite.config.ts`: `server.proxy['/gdviz'] = 'http://127.0.0.1:8000'`.
  - [ ] Add extractor `--verbose` path printing to debug diffs.

#### Stage: Packaging and embedding
- [ ] Configure Vite library mode to emit an embeddable bundle (UMD/ES) plus static app build.
- [ ] Document embedding the viewer inside other sites (e.g., gdwebgen dev server) and GitHub Pages deploy.
- [ ] Add size/perf budgets and build artifacts checks in CI.
  - [ ] Vite library mode config example:
  ```ts
  export default defineConfig({
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'GdViz',
        formats: ['es', 'umd'],
        fileName: (format) => `gdviz.${format}.js`,
      },
      rollupOptions: {
        external: ['cytoscape', 'cytoscape-elk'],
        output: { globals: { cytoscape: 'cytoscape' } },
      },
    },
  })
  ```
  - [ ] Provide `createGdViz(container: HTMLElement, options)` factory API; export types for inputs.
  - [ ] CI budget: fail build if `dist/*.js` > 500KB gzip; track bundle size.

#### Stage: Documentation updates
- [ ] Update `gdviz/README.md` with new Quick Start (Vite build, viewer paths, dev loop).
- [ ] Update `gdviz/docs/reference/LAYOUT.md` to reflect Cytoscape-first, compounds, and dual-layout plan.
- [ ] Update `../../README.md` with revised CLI commands and troubleshooting.
- [ ] Ensure `gdviz/docs/reference/LOGGING.md` matches the new viewer logging hook points.
  - [ ] Add troubleshooting (ELK stalls, missing edges, slow layout, proxy 404s).
  - [ ] Include keyboard shortcut reference and mode semantics table.
  - [ ] Update diagrams and snapshot images produced by `npm run snapshot`.

#### Stage: Future extractors and multi-language
- [ ] Draft spec for a Node/TypeScript extractor (ts-morph/TypeScript compiler API) that emits the same schema.
- [ ] Identify minimal cross-language invariants (IDs, edge kinds, modules/namespaces mapping).
- [ ] Add ADR documenting the language-agnostic schema and extractor contracts.
  - [ ] Outline pipeline: parse TS AST → symbol table → module graph → call graph → emit JSON.
  - [ ] Ensure ID stability rules (e.g., `file#function`); match Python extractor conventions.
  - [ ] Provide fixture repos (tiny TS project) and parity tests against schema.

#### Stage: Quality, tests, and performance
- [ ] Add property tests on JSON (IDs unique, edges refer to existing nodes, DAG where required) in extractor CI.
- [ ] Add Playwright E2E for focus/search/collapse flows on fixtures.
- [ ] Perf guardrails: maximum JSON size/chunking strategy (planned), layout time budget, and UI responsiveness checks.
  - [ ] JSON property tests: validate with `ajv`; assert no orphan edges; detect cycles where prohibited.
  - [ ] E2E basics: search filters nodes, neighbor highlight toggles, collapse/expand round-trips without errors.
  - [ ] Perf metrics: record ELK layout time and node count; alert if thresholds exceeded.


### Principles, surprises, risks

- Prioritize collapse/expand and strict containment over free-form dragging to reduce complexity and clutter.
- Determinism: Expect COLA to be non-deterministic; provide an ELK toggle for stable presentations.
- Rendering scale: Thousands are fine; beyond that, require chunking and progressive disclosure (future work).
- Vendor lock-in risk: Mitigated by keeping a thin `LayoutProvider`/`GraphRenderer` layer and a schema-first design.


### Notes & alignment

- The WebCola-first document remains useful for the interaction goals but we are standardizing on Cytoscape instead for lower bespoke maintenance and faster progress toward strict compounds + collapse. ELK is explicitly planned as a secondary, deterministic mode.
- Vite over Next.js: no SSR/auth/routing; simpler static assets and library-mode output; integrates cleanly with the Python dev server.


### Appendix

- External references:
  - Cytoscape.js: `https://js.cytoscape.org/`
  - cytoscape-elk: `https://github.com/cytoscape/cytoscape.js-elk`
  - Cytoscape compound nodes: `https://js.cytoscape.org/#compound-nodes`
  - Cytoscape expand-collapse: `https://github.com/cytoscape/cytoscape.js-expand-collapse`
  - Cytoscape style/selector: `https://js.cytoscape.org/#style`
  - Vite: `https://vitejs.dev/`
  - watchfiles: `https://watchfiles.helpmanual.io/`
  - AJV (JSON Schema validation): `https://ajv.js.org/`
  - json-schema-to-typescript: `https://github.com/bcherny/json-schema-to-typescript`
  - Playwright: `https://playwright.dev/`
  - Vite library mode: `https://vitejs.dev/guide/build.html#library-mode`
  - Server-Sent Events: `https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events`

---

## Progress (2025-08-29)

- Removed legacy D3 viewer and WebCola; project is Cytoscape-only.
- Scaffolded Vite + TypeScript viewer under `gdviz/viewer/cyto/` with ELK layered layout.
- Implemented mode selector (default/exec/modules/datastruct) with dimming rules; re-run ELK on mode change.
- Added search + clear UI; click-to-focus dimming; dev-only AJV validation.
- Configured Vite dev proxy to Python server for `/gdviz/*` routes.
- Updated `gdviz/README.md`; added migration note in `gdviz/docs/reference/LAYOUT.md`.
- Added `schemaVersion` to extractor output and normalized `line` to `null` when missing.
- Generated TypeScript types from JSON Schema and integrated in viewer data loader.
- Implemented module-based node coloring and a node details pane.
- Added hide-non-matching toggle to search and ESC-to-reset UX.
- Verified `tsc --noEmit` and Vite production build succeed.

## Debrief (2025-08-29)

### Current Status
- Completed: scaffold viewer, ELK layout, mode toggles, search, AJV validation, proxy, docs refresh, removed legacy D3, schemaVersion + `line:null`, TS types generated and integrated, module colors, details pane, hide-non-matching + ESC, typecheck + production build.
- Challenges: Balancing deterministic ELK with interactive needs; cola bugs validated the pivot.
- On track: Yes, ELK-first; interactive constraints deferred.

### Technical Assessment
- Code quality: Clean, modular TS; separation from Python extractor maintained.
- Technical debt: Tests missing; lanes/collapse pending; watchfiles reload pending; packaging/library mode pending.
- Working patterns: Schema-first contract, ELK layered layout, simple UI controls; schema-derived TS types improve safety.


