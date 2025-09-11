# CodeViz Setup Guide (TypeScript)

Development environment setup and dependencies for the CodeViz visualization tool.

## See also

- `../../README.md` - Project overview and quick start commands
- `ARCHITECTURE.md` - System architecture overview

## Prerequisites

- Node.js 20+ and npm
- Modern browser (Cytoscape.js-based visualization)

## Installation

```bash
# From repo root
npm install --prefix ts
```

## Quick demo: visualize `demo_codebase/`

```bash
# 1) Ensure the demo port is free
lsof -ti:3080 | xargs -r kill

# 2) Install deps and build the viewer/CLI
npm install --prefix ts
npm run --prefix ts build

# 3) Extract the demo codebase into JSON
npx tsx ts/src/cli/index.ts extract python demo_codebase --out out/codebase_graph.json

# 4) Start the single-port viewer (no auto-browser)
node ts/dist/cli/index.js view open --port 3080 --no-browser

# 5) Open the viewer
open http://127.0.0.1:3080

# Optional: run smoke tests (Playwright)
npm test --prefix ts

# When finished: stop the server
lsof -ti:3080 | xargs -r kill
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
npx tsx ts/src/cli/index.ts extract python demo_codebase --out out/codebase_graph.json
```

## Viewer (single-port)

Serve the built viewer and JSON on one port:
```bash
# Build viewer once
npm run build --prefix ts

# Start server
npx tsx ts/src/cli/index.ts view open
# If 8080 is in use
npx tsx ts/src/cli/index.ts view open --port 3000
```

Open the printed URL (default http://127.0.0.1:8080).

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
npx tsx ts/src/cli/index.ts extract python demo_codebase
ls -la out/codebase_graph.json
```

2. **Viewer loads**
```bash
npx tsx ts/src/cli/index.ts view open --no-browser
open http://127.0.0.1:8080
```

## Troubleshooting

- Port conflicts: pass `--port` (e.g., `--port 3000`) or kill existing process.
- Tree-sitter native build issues: we can switch to web-tree-sitter (WASM) in a follow-up.
- Ensure `out/codebase_graph.json` exists before starting the viewer.