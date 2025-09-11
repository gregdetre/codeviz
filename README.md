# CodeViz - Codebase Visualization Tool

CodeViz helps developers visualize code & docs (starting with Python codebases) through static analysis and an interactive web viewer. It extracts code structure into JSON and renders functions, imports, and module relationships.

see `docs/reference/PRODUCT_VISION_FEATURES.md`

## Quick Start (TypeScript)

### Installation

```bash
git clone <repository-url>
cd codeviz
# Install TS workspace deps
npm install --prefix ts
```

### Basic Usage

1. **Build the CLI:**
   ```bash
   npm run --prefix ts build
   ```

2. **Extract codebase structure (Python):**
   ```bash
   npx codeviz extract python demo_codebase --out out/codebase_graph.json
   ```

3. **Start the interactive viewer (single port):**
   ```bash
   npx codeviz view open
   # If port in use
   npx codeviz view open --port 3000
   ```

4. **Open your browser** to explore the visualization (e.g. http://127.0.0.1:8080)

### Per-target config

Create a per-target config with compound extension (example already included):

```toml
# demo_codebase.codeviz.toml
[analyzer]
exclude = ["**/__pycache__/**", "**/.venv/**", "**/tests/**"]

[output]
path = "out/codebase_graph.json"

[viewer]
layout = "fcose"
```

## CLI Reference (TS)

### Extract Commands

```bash
# Extract specific directory
npx codeviz extract python /path/to/project --out out/codebase_graph.json

# Verbose extraction
npx codeviz extract python demo_codebase --verbose
```

### Viewer Commands

```bash
# Start with defaults
npx codeviz view open

# Custom host and port
npx codeviz view open --host 0.0.0.0 --port 3000

# Don't auto-open browser
npx codeviz view open --no-browser
```

## See Also

- **Setup & Dependencies**: `docs/reference/SETUP.md`
- **System Architecture**: `docs/reference/ARCHITECTURE.md`
- **Configuration**: per-target `.codeviz.toml` files
- **Project Structure**: `docs/reference/LAYOUT.md`
- **Viewer Technology**: Cytoscape.js + Vite + TypeScript

## Troubleshooting

**Common Issues:**
- **Viewer not loading data**: Ensure extraction has run and created `out/codebase_graph.json`
- **Port conflicts**: Pass `--port` to `view open` or kill existing processes with `lsof -ti:8080 | xargs kill -9`
- **Tree-sitter build issues**: If native issues arise, we can switch to web-tree-sitter (WASM) in a follow-up.

## Legacy (Python CLI)

The previous Python CLI has been removed. The TypeScript version is now the canonical implementation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests if applicable
4. Format code (Prettier/ESLint for TypeScript if configured)
5. Submit a pull request