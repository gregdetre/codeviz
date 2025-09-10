# CodeViz - Codebase Visualization Tool

CodeViz is a generic tool for visualizing Python codebases through AST-based analysis and interactive web exploration. It extracts code structure into JSON format and provides a web viewer for exploring dependencies, imports, functions, and module relationships.

## Quick Start

### Installation

```bash
git clone <repository-url>
cd codeviz
pip install -r requirements.txt
```

### Basic Usage

1. **Extract codebase structure:**
   ```bash
   python codeviz.py extract python /path/to/your/project
   ```

2. **Start the interactive viewer:**
   ```bash
   python codeviz.py view open
   ```

3. **Open your browser** to explore the visualization (usually http://127.0.0.1:8080)

### Example: Analyzing a Project

```bash
# Analyze any Python project
python codeviz.py extract python /path/to/project

# View the results
python codeviz.py view open
```

## CLI Reference

### Extract Commands

```bash
# Extract current directory
python codeviz.py extract python .

# Extract specific directory with custom output
python codeviz.py extract python /path/to/project --out my_graph.json

# Verbose extraction
python codeviz.py extract python . --verbose
```

### Viewer Commands

```bash
# Start with defaults
python codeviz.py view open

# Custom host and port
python codeviz.py view open --host 0.0.0.0 --port 3000

# Different viewer mode
python codeviz.py view open --mode modules

# Don't auto-open browser
python codeviz.py view open --no-browser
```

## See Also

- **Setup & Dependencies**: [`docs/reference/SETUP.md`](docs/reference/SETUP.md)
- **System Architecture**: [`docs/reference/ARCHITECTURE.md`](docs/reference/ARCHITECTURE.md)
- **Configuration**: [`codeviz_conf.py`](codeviz_conf.py) - customize analysis settings
- **Project Structure**: [`docs/reference/LAYOUT.md`](docs/reference/LAYOUT.md)
- **Viewer Technology**: Built with Cytoscape.js, Vite, and TypeScript

## Troubleshooting

**Common Issues:**
- **Viewer not loading data**: Ensure extraction has run and created `out/codebase_graph.json`
- **Port conflicts**: Use `--port` option or kill existing processes with `lsof -ti:8080 | xargs kill -9`
- **npm dependencies**: Reinstall with `cd src/codeviz/viewer/cyto && rm -rf node_modules && npm install`

See [`docs/reference/SETUP.md`](docs/reference/SETUP.md) for detailed troubleshooting.

## Known Issues

- Viewer requires specific two-server setup (needs simplification)
- Data path hardcoded to `/gdviz/out/codebase_graph.json` (should be configurable)
- Currently Python-only; TypeScript support planned

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests if applicable
4. Run `black .` to format code
5. Submit a pull request