# CodeViz - Codebase Visualization Tool

CodeViz helps developers visualize code & docs (starting with Python codebases) through static analysis and an interactive web viewer. It extracts code structure into JSON and renders functions, imports, and module relationships.

see `docs/reference/PRODUCT_VISION_FEATURES.md`

## Quick Start (TypeScript)

### Installation

```bash
git clone <repository-url>
cd codeviz
# Ensure Node 20.19.5 is active (asdf/Volta/nvm supported)
# asdf (recommended): asdf install
# Volta: volta install node@20.19.5
# nvm: nvm install && nvm use

# Install deps (root)
npm ci
```

### Basic Usage

1. **Build the CLI:**
   ```bash
   npm run build
   ```

2. **Extract codebase structure (Python):**
   ```bash
   npm run extract -- --config ./configs/demo_codebase.codeviz.toml
   ```

3. **Start the interactive viewer (single port):**
   ```bash
   npm run view -- --config ./configs/demo_codebase.codeviz.toml
   # If port in use
   npm run view -- --port 3000
   ```

4. **Open your browser** to explore the visualization (e.g. http://127.0.0.1:8000)

### Per-target config

Create a per-target config with compound extension (example already included):

```toml
# demo_codebase.codeviz.toml
[analyzer]
exclude = ["**/__pycache__/**", "**/.venv/**", "**/tests/**"]

[output]
path = "out/demo_codebase/codebase_graph.json"

[viewer]
layout = "fcose"
```

## CLI Reference (TS)

### Extract Commands

```bash
# Extract with explicit config
npm run extract -- --config ./configs/demo_codebase.codeviz.toml

# Verbose extraction
npm run extract -- --config ./configs/demo_codebase.codeviz.toml --verbose
```

### Viewer Commands

```bash
# Start with defaults
npm run view -- --config ./configs/demo_codebase.codeviz.toml

# Custom host and port
npm run view -- --config ./configs/demo_codebase.codeviz.toml --host 0.0.0.0 --port 3000

# Don't auto-open browser
npm run view -- --config ./configs/demo_codebase.codeviz.toml --no-browser

# One-command workflows
# Build + serve (auto-open; kills existing)
npm run up -- --port 8000
# Dev auto-reload (rebuilds viewer, restarts server; auto-open)
npm run dev -- --port 8000
```

## See Also

- **Setup & Dependencies**: `docs/reference/SETUP.md`
- **System Architecture**: `docs/reference/ARCHITECTURE.md`
- **Configuration**: per-target `.codeviz.toml` files
- **Project Structure**: `docs/reference/LAYOUT.md`
- **Viewer Technology**: Cytoscape.js + Vite + TypeScript
- **Library Integrations**: `docs/reference/libraries/WORD_WRAP_LIBRARY_INTEGRATION.md`, `docs/reference/libraries/FLOATING_UI_TOOLTIP_INTEGRATION.md`

## Troubleshooting

**Common Issues:**
- **Viewer not loading data**: Ensure extraction has run and created `out/<target>/codebase_graph.json`
- **Port conflicts**: Pass `--port` to `view open` or kill existing processes with `lsof -ti:8000 | xargs kill -9`
- **Tree-sitter build issues**: If native issues arise, we can switch to web-tree-sitter (WASM) in a follow-up.

## Legacy (Python CLI)

The previous Python CLI has been removed. The TypeScript version is now the canonical implementation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests if applicable
4. Format code (Prettier/ESLint for TypeScript if configured)
5. Submit a pull request