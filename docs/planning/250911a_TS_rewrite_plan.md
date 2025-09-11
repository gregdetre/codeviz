# Goal, context

Rewrite CodeViz to be pure TypeScript end-to-end. Focus on a simple, working MVP using `demo_codebase` and Cytoscape.js with a single-port server. Maintain the existing JSON graph schema and deliver a Clipanion CLI that mirrors current Python commands. Configs should be per-target using a `.codeviz.toml` compound extension, e.g. `demo_codebase.codeviz.toml`.

# References

- `docs/reference/PRODUCT_VISION_FEATURES.md` — Feature priorities (grouping, filtering, mixed layouts, interactivity, GUI)
- `docs/reference/cyto/*` — Cytoscape.js guides (grouping, filtering, layouts, interactivity, extensions, best practices)
- `docs/reference/LOGGING.md` — Runtime logging (browser console → server file)
- `schema/codebase_graph.schema.json` — Graph JSON schema to preserve
- `README.md` — Needs rewrite to TS-first
- `gjdutils/src/ts/cli/sequential-datetime-prefix.ts` — Used to generate this doc prefix
- `gjdutils/docs/instructions/WRITE_PLANNING_DOC.md` — Planning doc conventions

# Principles, key decisions

- Pure TypeScript (Node 20+) for CLI, analyzer, and server.
- Parser: start with node-tree-sitter for Python; fall back to WebAssembly (web-tree-sitter) if native build issues arise.
- Viewer: Cytoscape.js + TypeScript via Vite; defer React for now to keep MVP simple.
- One server: tiny Fastify/Express serves static viewer and JSON on a single port.
- Config: per-target `.codeviz.toml` files (e.g. `demo_codebase.codeviz.toml`).
- Keep current graph JSON schema stable for v1.
- Focus on `demo_codebase` for acceptance.

# Stages & actions

### Stage: Prep & repo scaffolding
- [x] Add TS workspace under `ts/` with `package.json`, `tsconfig.json`.
- [x] Add dependencies (clipanion, fastify, cytoscape, cytoscape-fcose, toml, zod, tree-sitter, tree-sitter-python).
- [x] Add scripts and local `codeviz` bin entrypoint.
- [x] Create example per-target config (`demo_codebase.codeviz.toml`).

### Stage: Config system
- [x] Implement config loader resolving `<target>.codeviz.toml`.
- [x] Support: `[analyzer] exclude`, `[output] path`, `[viewer] layout`.
- [x] Friendly defaults; validation to be expanded later if needed.

### Stage: Python analyzer (node-tree-sitter)
- [x] Initialize tree-sitter with python grammar.
- [x] Extract files, functions, imports; simple intra-file call edges.
- [x] Build module groups and moduleImports.
- [x] Output matches `schema/codebase_graph.schema.json`.

### Stage: CLI (Clipanion)
- [x] `codeviz extract python <dir> [--out] [--verbose]`.
- [x] `codeviz view open [--host] [--port] [--mode] [--no-browser]`.
- [x] Wire config resolution and defaults.

### Stage: Viewer (Vite + TS + Cytoscape)
- [x] Vite app with `index.html`, `src/main.ts`.
- [x] Load `/out/codebase_graph.json`.
- [x] Render nodes grouped by module (compound nodes), edges for calls/imports.
- [x] Basic interactions: neighbor highlight; toggle for call edges; fcose layout.
- [x] Guard against invalid edges (filter + warn) to avoid Cytoscape crash.

### Stage: Single-port server
- [x] Fastify server serving built viewer and `out/codebase_graph.json`.
- [x] `view open` starts server; `--no-browser` supported.
- [x] Dev logging endpoints: `POST /client-log` and `GET /out/viewer.log`; `favicon.ico` 204.

### Stage: Docs & cleanup
- [x] Add quick demo steps to `docs/reference/SETUP.md`.
- [x] Document logging behavior in `docs/reference/LOGGING.md`.
- [x] Add concise demo + logging notes in `AGENTS.md`.
- [ ] Update `README.md` to TS-first install/usage; add legacy Python note.
- [ ] Tidy or archive legacy Python viewer/CLI after v1 validated.

### Stage: Validation & acceptance (demo_codebase)
- [x] Run `codeviz extract python demo_codebase` to generate `out/codebase_graph.json`.
- [x] Start viewer `codeviz view open` and verify render locally.
- [x] Playwright smoke tests (homepage + JSON endpoint) passing.
- [ ] Confirm schema validity parity with previous `demo_output.json`.

# Risks & mitigations

- node-tree-sitter native build issues → fallback to web-tree-sitter (WASM) with minimal codepath switch.
- Call graph accuracy (Python dynamic features) → MVP restricts to static intra-file calls and import name matches.
- Large graphs performance → Batch operations and fcose; defer advanced perf until post-MVP.

# Notes & changes since plan

- Switched from `node-tree-sitter` to `tree-sitter` npm package due to availability; analyzer updated accordingly.
- Added minimal type shim for `tree-sitter-python`.
- Created `demo_codebase.codeviz.toml` per target convention.
- Single-port server implemented; avoid port conflicts by allowing `--port` override.
- Implemented dev logging: viewer forwards console to server; logs saved at `out/viewer.log`.
- Viewer now filters invalid edges and logs a summary to avoid blank screen on bad data.
- Added Playwright smoke tests to verify the viewer homepage and JSON endpoint.

# Next steps (immediately actionable)

- Update `README.md` to TS-first usage and troubleshooting.
- Fix Python analyzer to emit fully-qualified edge endpoints that match node ids across modules (remove skipped edges).
- Add a short "Legacy" section pointing to Python CLI.
- Optional: enforce schema validation (zod/AJV) in CLI and CI.
- Optional: UI toggle for logging and capture of unhandled errors/rejections.
- Optional: add `--port` flag in examples where helpful; keep quick demo in `SETUP.md`.
