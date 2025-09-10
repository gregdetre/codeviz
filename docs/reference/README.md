# Codebase Visualization (gdviz)

### Introduction
Interactive Cytoscape + Vite-based visualization for exploring the `gdwebgen` codebase. Provides execution flow, data-structure tagging, and module dependency views. This is meant for day-to-day understanding and debugging of the system.

### See also
- `../../README.md` — project overview and quick start guide
- `SETUP.md` — development environment setup and dependencies
- `ARCHITECTURE.md` — system architecture (extraction + viewer components)
- `gdviz/` — codebase visualization assets and configuration
- `gdviz/out/codebase_graph.json` — generated data file (ignored by git)
- `extract_codebase_graph.py` — extractor that builds the JSON
- `gdviz/viewer/cyto/` — Cytoscape viewer (Vite + TypeScript app)
- `pipeline/build.py` — source for ordered execution-flow extraction
- `../planning/250829a_gdviz_cytoscape_vite_ts_migration.md` — migration plan and progress

### Principles, key decisions
- Static analysis for v1; runtime tracing can be layered later
- Single JSON artifact; all views are derived in the client
- Progressive disclosure: start from a small subgraph, drill in
- Manual hints allowed via `# gdviz:` comments and `gdviz/gdviz_conf.py`

### How to generate and view
- Generate JSON (writes to `gdviz/out/`):
```bash
./venv/bin/python extract_codebase_graph.py
```
- Start dev servers and open the viewer (Vite + proxy to Python):
```bash
# Terminal A: Python dev server (serves /gdviz/* including out/)
python gdwebgen.py dev serve --out-dir .

# Terminal B: Vite dev server (proxy /gdviz/* to Python)
cd gdviz/viewer/cyto
npm install
npm run dev
# Open the printed Vite URL (default http://127.0.0.1:5173)
```

### View modes
- Execution flow
  - Set Mode to “Execution flow” in toolbar
  - Toggle flags: `not quick`, `postflight`, `persist_publish_dts_flag`
  - Shows only `build_step`/`bash_entry` edges; hides gated steps
  - Interactions:
    - Click node to dim neighbors and show details in the right pane
    - Toolbar mode selector (Default/Execution flow/Modules/Data structures)
    - Search with optional “hide non-matching”; ESC to reset filters
- Data structures
  - Highlights functions tagged with `Page`/`Frontmatter`/`Site`
  - Tags come from heuristics and optional `# gdviz:` hints
- Module deps
  - Hides function graph and shows module-level import overlay

### Configuration
- File: `gdviz/gdviz_conf.py`
```python
EXCLUDE_MODULES = set()
EXCLUDE_FILE_GLOBS = ["venv/**", "tests/**", "theme/**"]
INCLUDE_FILES = None
```
- Inline tags: add to function def line:
```python
def foo(...):  # gdviz: datastructures=Page phase=generate
    ...
```

## Tutorials

### Execution Flow mode
- **Why**: See the path taken by `gd-publish-www.sh` → `gdwebgen.py build generate` and which steps are gated by flags.
- **Steps**:
  1. Open the viewer URL.
  2. Top toolbar → set Mode to “Execution flow”.
  3. Toggle flags to match your run:
     - `not quick` — show steps that are skipped by `-q`
     - `postflight` — include the broken-link scan
     - `persist_publish_dts_flag` — include publish-date persistence
  4. The graph keeps all nodes but dims non-exec ones to emphasize flow.
  5. Use the left-pane controls to enable arrowheads, show sequence numbers, align steps left→right (phase swimlanes), and set expansion depth.
  6. Breadcrumbs of the execution order appear in the left pane. Click any step to set it as the pivot (the depth slider expands calls from this pivot) and center/zoom to it.
- **Notes**:
  - Order information is present as `edge.order` and is rendered when the control is enabled.
  - The flow is extracted from `pipeline/build.py:run_build`; helper calls within phases are part of the function graph and remain visible if they’re in the filtered neighborhood.

### Data Structures mode
- **Why**: Find functions that operate on core types: `Page`, `Frontmatter`, `Site`.
- **Steps**:
  1. Mode → “Data structures”.
  2. Functions with datastructure tags remain prominent; others are dimmed.
  3. Click a node to view signature/doc/tags in the left pane.
- **Tagging sources**:
  - Heuristics from parameter names/type hints and attribute writes
  - Manual hints via line comments on function defs, e.g.:
    ```
    def generate(...):  # gdviz: datastructures=Page,Site
        ...
    ```

### Node importance
- Why: Emphasize key functions.
- How: Add a `# gdviz:` tag on the function definition line, e.g.:
  ```
  def run_build(...):  # gdviz: importance=high
      ...
  ```
  Accepted values: `high`, `medium`, `low`, or a positive number. The viewer’s "Size by importance" control will use this tag; otherwise node size falls back to degree.

### Module Deps mode
- **Why**: See high-level module relationships and possible cycles.
- **Steps**:
  1. Mode → “Module deps”.
  2. Function-level nodes/edges hide; module overlay appears (import graph).
  3. Pan/zoom to explore. Click back to “Default” or another mode when done.

### Configuration details

Re-run the extractor after any config or hint changes.

### JSON schema (v1)
- See `gdviz/schema/codebase_graph.schema.json` for the canonical schema.
  - nodes: `{ id, label, file, line, module, kind, tags, signature, doc }`
  - edges: `{ source, target, kind: 'calls'|'bash_entry'|'build_step', conditions: [], order? }`
  - groups: `{ id, kind: 'module', children: [...] }`
  - moduleImports: `{ source, target, weight }`

### Gotchas / limitations
- Static only; dynamic/runtime paths not captured
- Datastructure tagging is heuristic; amend with `# gdviz:`
- Template dependencies not yet modeled

### Planned future work
- Collapsible groups and enhanced search
- Optional runtime trace overlay (call counts)

### Runtime callgraph overlay (experimental)
- Generate dynamic call edges (from a full build run):
  ```bash
  python gdwebgen.py build generate --profile-callgraph-json ./gdviz/out/runtime_calls.json
  ```
- The viewer will load this file in a future iteration to overlay executed nodes/edges and edge widths by call count. For now, the artifact is produced for inspection and future integration.

