### Lenses: Save/Load Complete Viewer State

This document describes the Lens system for persisting and restoring the CodeViz viewer state, including grouping, tag filtering, collapsed groups, viewport, exact node positions, and compact commands. Lenses are JSON files stored alongside the active graph under `out/<target>/lenses/`.

### See also

- `../../schema/lens.schema.json` – JSON Schema for lenses
- `../../ts/viewer/src/lens.ts` – build/apply Lens utilities
- `../../ts/viewer/src/lens-types.ts` – TypeScript Lens types
- `../../ts/viewer/src/lenses-ui.ts` – Lenses section UI wiring
- `../../ts/viewer/src/command-executor.ts` – supports `cv.*` viewer ops used by lenses
- `../../ts/src/server/server.ts` – Fastify endpoints for lens CRUD and schema
- `VIEWER_COMMANDS.md` – compact command format; includes `cv.*` viewer namespace
- `UI_LEFT_CONTROLS_PANE.md` – left pane structure including Lenses section
- Planning context: `../planning/250912c_lens_persistence_and_commands.md`

### Principles and decisions

- Persist viewer state as portable JSON on disk, not in the URL.
- Store absolute node positions for pixel parity; avoid re‑layout on load when positions are present.
- Introduce a small viewer namespace `cv.*` for non‑Cytoscape concerns (tags, positions, grouping, collapse set).
- Be tolerant to mismatches: ignore unknown element IDs; best‑effort application with no hard failures.
- Keep commands compact; other viewer bits are stored in a top‑level `viewer` envelope.

### Lens format (envelope)

Minimal shape; see schema for full details:

```json
{
  "version": 1,
  "schemaVersion": "1.0.0",
  "name": "optional",
  "viewer": {
    "groupFolders": true,
    "filterMode": "fade",
    "tagFilter": ["important", "entrypoint", "untagged"],
    "viewport": { "zoom": 1.0, "pan": { "x": 0, "y": 0 } }
  },
  "positions": [{ "id": "node-id", "x": 12.3, "y": -4.5 }],
  "collapsedIds": ["node-id", "module:src/utils"],
  "commands": [{ "q": "node", "op": "addClass", "arg": "highlighted" }],
  "generatedAt": "2025-09-12T18:00:00.000Z",
  "modifiedAt": "2025-09-12T18:01:00.000Z"
}
```

Key fields:
- `viewer.groupFolders`: rebuilds elements when toggled (folder grouping on/off)
- `viewer.filterMode`: `fade` or `hide` (search/filter behaviour)
- `viewer.tagFilter`: selected tag keys (normalized)
- `positions`: absolute positions for nodes; when present, layout is not recomputed on load
- `collapsedIds`: nodes to collapse (if expand/collapse plugin is present)
- `commands`: optional post‑application commands to replay

### Viewer namespace commands (`cv.*`)

Non‑Cytoscape operations used by lenses and the assistant:
- `cv.groupFolders { enabled }` – suggest grouping toggle (applied by app/lens loader)
- `cv.applyTagFilter { selected: string[] }` – apply tag filtering programmatically
- `cv.setPositions { positions: [{ id, x, y }] }` – set absolute node positions
- `cv.collapseIds { ids: string[] }` / `cv.expandIds { ids: string[] }` – collapse/expand by ID

These no‑op safely if the related modules or plugins are unavailable.

### Building and applying lenses

- Build: `buildLens(cy, ctx)` collects viewer envelope, tag filter, collapsed IDs, positions, and an optional command diff (empty by default).
- Apply: `applyLens(cy, lens, ctx)` performs:
  1) Regroup elements if `groupFolders` differs
  2) Expand all; set positions (if provided); collapse target IDs
  3) Apply tag filter; re‑aggregate collapsed edges; update auto group visibility
  4) Apply viewport; replay `commands`
  5) If no positions present, run current layout once

`ctx` carries the graph, annotations (optional), current grouping/filter mode, and layout name.

### Endpoints (server)

Relative to the active graph directory (`out/<target>/`):
- `GET /schema/lens.schema.json` – serve lens schema
- `GET /out/lenses/index.json` – list lenses `{ names: string[] }`
- `GET /out/lenses/:name.json` – fetch a lens
- `POST /api/lens/save { name, lens }` – write lens JSON file
- `DELETE /api/lens/:name` – delete a lens

Notes:
- Filenames are sanitized to `[A-Za-z0-9_-]{1,64}`.
- Lenses live in `out/<target>/lenses/` next to `codebase_graph.json`.

### UI workflow

Left pane → “Lenses” section:
- List existing lenses and load on click.
- Save As… prompts for a name; Save overwrites the current lens; Delete removes it.
- The current lens name is shown; Save/Delete are disabled when no lens is selected.

### Testing

- Node test: `ts/tests/lens.node.test.ts` round‑trips positions by building a lens and applying it to a fresh instance.
- Command executor tests continue to pass; a demo selector was updated to match the current sample graph.

### Gotchas and limitations

- Positions are absolute; a significant container size change may require a layout rerun.
- Unknown IDs (from graph drift) are ignored during load.
- Collapse/expand requires the expand‑collapse plugin; otherwise collapse commands no‑op.
- Tag filtering requires annotations to compute tag indices; absent annotations means tag UI is hidden and tag filtering is skipped.

### Future work

- Persist and replay a “command diff” to reduce reliance on positions.
- Optional URL param `?lens=name` for auto‑loading without storing state in the URL.
- Additional viewer ops for fine‑grained UI state (e.g., right‑pane tab, selection focus).


