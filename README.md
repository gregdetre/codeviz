# CodeViz - Codebase Visualization Tool

A generic tool for visualizing Python codebases (with future TypeScript support). Extracts code structure and provides an interactive viewer for exploring dependencies, imports, functions, and data structures.

## Features

- **AST-based Analysis**: Deep analysis of Python code structure using Abstract Syntax Trees
- **Interactive Visualization**: Web-based viewer with multiple layout modes
- **Dependency Mapping**: Visualize imports, function calls, and module relationships  
- **Generic Design**: Works with any Python codebase
- **Extensible**: Designed for future multi-language support

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

3. **Open your browser to explore the visualization** (usually http://127.0.0.1:8080)

## Commands

### Extract Commands

#### `codeviz extract python <target_dir>`

Extract static codebase graph from Python code using AST analysis and heuristics.

**Options:**
- `--out, -o PATH`: Output path for codebase graph JSON
- `--verbose, -v`: Enable verbose output

**Examples:**
```bash
# Extract current directory
python codeviz.py extract python .

# Extract specific directory with custom output
python codeviz.py extract python /path/to/project --out my_graph.json

# Verbose extraction
python codeviz.py extract python . --verbose
```

### Viewer Commands  

#### `codeviz view open`

Start interactive viewer for exploring codebase structure.

**Options:**
- `--host, -h HOST`: Host interface to bind (default: 127.0.0.1)
- `--port, -p PORT`: Port to serve on (default: 8080)
- `--mode, -m MODE`: Viewer mode: default, exec, modules, datastruct (default: exec)
- `--no-browser`: Don't automatically open browser
- `--viewer-dir PATH`: Path to viewer files directory

**Examples:**
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

## Configuration

Configuration is handled through `codeviz_conf.py`. Key settings:

### Extraction Configuration
- `EXCLUDE_FILE_GLOBS`: Patterns for files to exclude from analysis
- `EXCLUDE_MODULES`: Module names to exclude
- `TARGET_DIR`: Directory to analyze (set by CLI)

### Viewer Configuration  
- `DEFAULT_MODE`: Default viewer mode ("exec", "modules", "datastruct", "default")
- `DEFAULT_HOST`: Default server host
- `DEFAULT_PORT`: Default server port

### Analysis Configuration
- `MAX_IMPORT_DEPTH`: Maximum depth for import analysis
- `INCLUDE_EXTERNAL_IMPORTS`: Include external library imports
- `ANALYZE_DECORATORS`: Analyze decorator usage
- `ANALYZE_INHERITANCE`: Analyze class inheritance

## Viewer Modes

- **exec**: Focus on execution flow and function calls
- **modules**: Module-centric view showing import relationships
- **datastruct**: Data structure and class hierarchy focus
- **default**: Balanced view of all elements

## Project Structure

```
codeviz/
├── codeviz.py              # Main CLI entry point
├── codeviz_conf.py         # Configuration settings
├── standalone_extractor.py # Core extraction logic
├── src/codeviz/           # Main package
│   ├── extractor/         # AST extraction modules
│   └── viewer/            # Web viewer components
├── out/                   # Default output directory
├── docs/                  # Documentation
└── requirements.txt       # Python dependencies
```

## Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd codeviz

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Format code
black .
```

### Adding Language Support

CodeViz is designed for multi-language support. To add a new language:

1. Update `SUPPORTED_LANGUAGES` in `codeviz_conf.py`
2. Add language-specific extraction logic in `src/codeviz/extractor/`
3. Update CLI commands to support the new language

## Viewer Technology

The web viewer is built with:
- **Cytoscape.js**: Graph visualization library
- **Vite**: Modern build tool and dev server
- **TypeScript**: Type-safe JavaScript development

## Output Format

Extracted codebase graphs are saved as JSON with this structure:

```json
{
  "version": 1,
  "schemaVersion": "1.0.0", 
  "defaultMode": "exec",
  "nodes": [...],     // Functions, classes, variables
  "edges": [...],     // Relationships and calls
  "groups": [...],    // Module groupings
  "moduleImports": [...] // Import relationships
}
```

## Examples

### Analyzing a Flask Application

```bash
# Extract Flask app structure
python codeviz.py extract python ./my-flask-app

# Start viewer with modules mode for better import visualization
python codeviz.py view open --mode modules
```

### Analyzing a Data Science Project

```bash
# Extract with verbose output
python codeviz.py extract python ./data-project --verbose

# Use datastruct mode to focus on classes and data flow
python codeviz.py view open --mode datastruct
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run `black .` to format code
6. Submit a pull request

## License

[Add your license information here]

## Related Projects

This tool was extracted and generalized from the gdwebgen project's visualization capabilities.