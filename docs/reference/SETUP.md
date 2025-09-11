# CodeViz Setup Guide (TypeScript)

Development environment setup and dependencies for the CodeViz visualization tool.

## See also

- `../../README.md` - Project overview and quick start commands
- `ARCHITECTURE.md` - System architecture overview
- `libraries/WORD_WRAP_LIBRARY_INTEGRATION.md` - Text wrapping utility for CLI output formatting
- `libraries/FLOATING_UI_TOOLTIP_INTEGRATION.md` - Interactive tooltip positioning for viewer

## Prerequisites

- Node.js 20+ and npm
- Modern browser (Cytoscape.js-based visualization)

## Installation

```bash
# From repo root
npm install
```

## Quick demo: visualize `demo_codebase/`

```bash
# 1) Ensure the demo port is free
lsof -ti:8000 | xargs -r kill

# 2) Install deps and build the viewer/CLI
npm install
npm run build

# 3) Extract the demo codebase into JSON
npm run extract -- demo_codebase --out out/codebase_graph.json

# 4) Start the single-port viewer (no auto-browser)
npm run view -- --port 8000 --no-browser

# 5) Open the viewer
open http://127.0.0.1:8000

# Optional: run smoke tests (Playwright)
npm test

# When finished: stop the server
lsof -ti:8000 | xargs -r kill
```

## Configuration

Per-target config files use a compound extension: `<target>.codeviz.toml`.

Example (`demo_codebase.codeviz.toml`):
```toml
[analyzer]
exclude = ["**/__pycache__/**", "**/.venv/**", "**/tests/**"]

[output]
path = "out/codebase_graph.json"

[viewer]
layout = "fcose"
```

## Data Generation

Generate the visualization data (JSON):
```bash
npm run extract -- demo_codebase --out out/codebase_graph.json
```

## Viewer (single-port)

Serve the built viewer and JSON on one port:
```bash
# Build viewer once
npm run build

# Start server
npm run view --
# If 8000 is in use
npm run view -- --port 3000
```

Open the printed URL (default http://127.0.0.1:8000).

## File Structure (TS components)

```
ts/
├── package.json           # TS workspace
├── tsconfig.json
├── src/
│   ├── cli/               # Clipanion CLI
│   ├── analyzer/          # Tree-sitter Python analyzer
│   ├── config/            # Config loader
│   └── server/            # Fastify server
└── viewer/                # Vite + Cytoscape viewer
    ├── index.html
    ├── src/main.ts
    └── vite.config.ts
out/
└── codebase_graph.json    # Generated data
```

## Verification

1. **Extraction works**
```bash
npm run extract -- demo_codebase
ls -la out/codebase_graph.json
```

2. **Viewer loads**
```bash
npm run view -- --no-browser
open http://127.0.0.1:8000
```

## Troubleshooting

- Port conflicts: pass `--port` (e.g., `--port 3000`) or kill existing process.
- Tree-sitter native build issues: we can switch to web-tree-sitter (WASM) in a follow-up.
- Ensure `out/codebase_graph.json` exists before starting the viewer.