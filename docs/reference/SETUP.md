# CodeViz Setup Guide (TypeScript)

Development environment setup and dependencies for the CodeViz visualization tool.

## See also

- `../../README.md` - Project overview and quick start commands
- `ARCHITECTURE.md` - System architecture overview
- `libraries/WORD_WRAP_LIBRARY_INTEGRATION.md` - Text wrapping utility for CLI output formatting
- `libraries/FLOATING_UI_TOOLTIP_INTEGRATION.md` - Interactive tooltip positioning for viewer

## Prerequisites

- Node.js 20 (20.19.5) and npm
- Modern browser (Cytoscape.js-based visualization)

Recommended version managers (any one):
- Volta (recommended): ensures the repo-pinned Node is used automatically
- asdf: uses `.tool-versions` in this repo
- nvm: uses `.nvmrc`

## Installation

```bash
# From repo root
npm install
```

## Quick demo: visualize `demo_codebase/`

```bash
# 1) Ensure the demo port is free
lsof -ti:8000 | xargs -r kill

# 2) Ensure Node 20.19.5 is used, install deps, and build the viewer/CLI
# Option A (Volta, recommended)
volta install node@20.19.5
# Option B (asdf)
asdf install  # reads .tool-versions
# Option C (nvm)
nvm install && nvm use  # reads .nvmrc

npm ci
npm run build

# 3) Extract the demo codebase into JSON (config-based)
npm run extract -- --config ./configs/demo_codebase.codeviz.toml

# 4) Start the single-port viewer (no auto-browser)
npm run view -- --config ./configs/demo_codebase.codeviz.toml --port 8000 --no-browser

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
[target]
dir = "./demo_codebase"

[analyzer]
exclude = ["**/__pycache__/**", "**/.venv/**", "**/tests/**"]

[output]
dir = "out/demo_codebase"

[viewer]
layout = "elk-then-fcose"
```

## Data Generation

Generate the visualization data (JSON):
```bash
npm run extract -- --config ./configs/demo_codebase.codeviz.toml
```

## Viewer (single-port)

Serve the built viewer and JSON on one port:
```bash
# Build viewer once
npm run build

# Start server
npm run view -- --config ./configs/demo_codebase.codeviz.toml
# If 8000 is in use
npm run view -- --config ./configs/demo_codebase.codeviz.toml --port 3000
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
└── demo_codebase/
    └── codebase_graph.json    # Generated data
```

## Verification

1. **Extraction works**
```bash
npm run extract -- --config ./configs/demo_codebase.codeviz.toml
ls -la out/demo_codebase/codebase_graph.json
```

2. **Viewer loads**
```bash
npm run view -- --config ./configs/demo_codebase.codeviz.toml --no-browser
open http://127.0.0.1:8000
```

## Node & Environment Notes

- This repo pins Node 20.19.5 via multiple mechanisms:
  - `package.json` → `engines.node ": ">=20 <21"` and `volta.node: 20.19.5`
  - `.nvmrc` → `20.19.5`
  - `.tool-versions` (asdf) → `nodejs 20.19.5`
  - `.npmrc` → `engine-strict=true`

- After switching Node versions (e.g., via asdf/nvm), re-install native deps:
  - `npm ci` (preferred) or `npm rebuild`

- PATH precedence matters if you have multiple managers (asdf, nvm, Volta):
  - Put Volta early in PATH to auto-use the pinned Node inside this repo:
    - In `~/.zshrc`:
      ```bash
      export VOLTA_HOME="$HOME/.volta"
      export PATH="$VOLTA_HOME/bin:$PATH"
      ```
  - Or rely on asdf by running `asdf install` in the repo to match `.tool-versions`.

## Troubleshooting

- Port conflicts: pass `--port` (e.g., `--port 3000`) or kill existing process.
- Native `tree-sitter` addon error mentioning `NODE_MODULE_VERSION` mismatch: ensure Node 20.19.5 is active and run `npm ci`.
- Ensure `out/<target>/codebase_graph.json` exists before starting the viewer.