# gdviz Setup Guide

Development environment setup and dependencies for the gdviz codebase visualization tool.

## See also

- `../../README.md` - Project overview and quick start commands
- `ARCHITECTURE.md` - System architecture overview
- `../../../docs/reference/DEVELOPMENT_SETUP.md` - Main gdwebgen development setup

## Prerequisites

### Python Environment
- Python 3.8 or higher
- Virtual environment support
- AST parsing capabilities (built into Python)

### Web Tooling
- Node.js 18+ and npm (for Vite dev server and builds)
- Modern browser (Cytoscape.js-based visualization)

### System Dependencies
- Python 3.8+ (extraction)
- Node.js 18+ (viewer dev/build)

## Installation

### 1. Environment Setup

gdviz is currently integrated with gdwebgen and shares its environment:

```bash
# From gdwebgen root
cd $BLOG_BIN_PATH
venv_create_activate  # or source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Create or modify `gdviz/gdviz_conf.py`:
```python
"""
Configuration for codebase visualization (gdviz)
"""

# Exclude modules by name
EXCLUDE_MODULES = set()

# Exclude file patterns (supports glob syntax)
EXCLUDE_FILE_GLOBS = [
    "venv/**",
    "tests/**", 
    "theme/**",
]

# Override default included files (None = use extract script defaults)
INCLUDE_FILES = None

# Default viewer mode: "default", "exec", "modules", "datastruct"  
DEFAULT_MODE = "exec"
```

### 3. Data Generation

Generate visualization data:
```bash
# From gdwebgen root
./venv/bin/python extract_codebase_graph.py

# Output will be written to:
# gdviz/out/codebase_graph.json
```

### 4. Viewer Access (dev)

Start development servers:
```bash
# Terminal A: Serve from repo root (required for JSON + logs)
python gdwebgen.py dev serve --out-dir .

# Terminal B: Start Vite dev server for the Cytoscape viewer (proxy /gdviz/*)
cd gdviz/viewer/cyto
npm install
npm run dev
# Open the printed Vite URL (default http://127.0.0.1:5173)
```

## File Structure

After setup, your gdviz directory should contain:
```
gdviz/
├── README.md                    # Project overview
├── gdviz_conf.py               # Configuration
├── docs/reference/             # Documentation
│   ├── SETUP.md               # This file
│   ├── ARCHITECTURE.md        # System design  
│   └── README.md  # User guide
├── extractor/                  # Python extraction code
├── viewer/                     # Visualization
│   └── cyto/                  # Cytoscape + Vite + TS viewer
├── schema/                     # JSON schema
│   └── codebase_graph.schema.json
└── out/                       # Generated data (git-ignored)
    └── codebase_graph.json    # Visualization data
```

### 5. Viewer Build (prod)

```bash
cd gdviz/viewer/cyto
npm run build
# Built assets in gdviz/viewer/cyto/dist
```

## Verification

Test your setup:

1. **Data extraction works**:
   ```bash
   ./venv/bin/python extract_codebase_graph.py
   ls -la gdviz/out/codebase_graph.json  # Should exist and have recent timestamp
   ```

2. **Viewer loads (dev)**:
   ```bash
   python gdwebgen.py dev serve --out-dir .
   # Visit the Vite URL printed in Terminal B (default http://127.0.0.1:5173)
   # Should see interactive graph with nodes and edges
   ```

3. **Viewer loads (prod build)**:
   ```bash
   # Ensure Python server can serve /gdviz/viewer/cyto/dist if needed
   open gdviz/viewer/cyto/dist/index.html
   ```

4. **Configuration applies**:
   - Edit `gdviz_conf.py` to exclude a test pattern
   - Re-run extraction
   - Verify excluded files don't appear in viewer

## Troubleshooting

### Common Issues

**"Cannot load JSON file"**
- Ensure server is running from repository root (`--out-dir .`)
- Check that `gdviz/out/codebase_graph.json` exists and is valid JSON
- Verify no CORS restrictions in browser console

**"Empty or minimal graph"**  
- Check `INCLUDE_FILES` configuration in `gdviz_conf.py`
- Verify excluded patterns aren't too broad
- Run extraction with verbose output to see file discovery

**"Extraction fails"**
- Ensure virtual environment is activated
- Check Python version compatibility (3.8+)
- Verify no syntax errors in analyzed Python files

### Debug Mode

Enable verbose extraction output:
```bash
# Add print statements to extract_codebase_graph.py for debugging
# Check console output for file discovery and parsing issues
```

Inspect generated data:
```bash
# View raw JSON structure
cat gdviz/out/codebase_graph.json | jq '.nodes[0]'  # First node
cat gdviz/out/codebase_graph.json | jq '.edges[0]'  # First edge
```

## Future Standalone Setup

When gdviz becomes standalone, setup will be simplified to:
```bash
# Future standalone version
pip install gdviz
gdviz extract /path/to/codebase
gdviz serve
```

Current integration with gdwebgen provides the foundation for this future architecture.