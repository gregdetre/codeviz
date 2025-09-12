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
- asdf (recommended): uses `.tool-versions` in this repo
- Volta: can auto-use Node if installed and first in PATH
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
# Option A (asdf, recommended)
asdf install  # reads .tool-versions
# Option B (Volta)
volta install node@20.19.5
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
  - `package.json` → `engines.node ": ">=20 <21"`
  - `.nvmrc` → `20.19.5`
  - `.tool-versions` (asdf) → `nodejs 20.19.5`
  - `.npmrc` → `engine-strict=true`

- After switching Node versions (e.g., via asdf/nvm), re-install native deps:
  - `npm ci` (preferred) or `npm rebuild`

- PATH precedence matters if you have multiple managers (asdf, nvm, Volta):
  - Prefer asdf: run `asdf install` in the repo to match `.tool-versions` and ensure `~/.asdf/shims` is on PATH.
  - If using Volta instead, ensure its bin dir appears before other Node shims in PATH.

## Troubleshooting

- Port conflicts: pass `--port` (e.g., `--port 3000`) or kill existing process.
- Native `tree-sitter` addon error mentioning `NODE_MODULE_VERSION` mismatch: ensure Node 20.19.5 is active and run `npm ci`.
- Ensure `out/<target>/codebase_graph.json` exists before starting the viewer.

### asdf vs Volta (node version managers)

- This repo standardizes on **asdf** for Node version management. `.tool-versions` is committed with `nodejs 20.19.5`.
- Avoid mixing managers (asdf, Volta, nvm) in the same shell. If multiple are installed, ensure asdf is initialized and first on PATH for Node shims.
- Symptom when asdf isn’t active: `No version is set for command node`.
  - Fix: Initialize asdf in your shell and install the pinned version:
    ```bash
    . /opt/homebrew/opt/asdf/libexec/asdf.sh
    cd /path/to/repo
    asdf install
    npm ci
    ```
  - If you previously used a different Node version, re-run `npm ci` to rebuild native modules (e.g., tree-sitter).