# CodeViz Command Line Usage

CodeViz provides a Typer-based CLI for extracting codebase structure and viewing interactive visualizations. The tool follows a two-stage workflow: extraction followed by viewing.

## Quick Reference

| Command | Description |
|---------|-------------|
| `python codeviz.py --help` | Show main help |
| `python codeviz.py version` | Show version information |
| `python codeviz.py extract python <target_dir>` | Extract Python codebase |
| `python codeviz.py view open` | Start interactive viewer |

## CLI Structure

CodeViz uses a hierarchical command structure:

```
codeviz.py
├── version                    # Show version info
├── extract/                   # Extract codebase structure
│   └── python <target_dir>    # Python extraction
└── view/                      # Interactive viewer
    └── open                   # Start viewer server
```

### Global Options

Available on all commands:

- `--help` - Show help message and exit
- `--install-completion` - Install shell completion for current shell
- `--show-completion` - Show completion script for current shell

## Extraction Commands

### `python codeviz.py extract python <target_dir>`

Extract static codebase graph from Python code using AST analysis and heuristics.

#### Arguments

- `target_dir` (required) - Directory containing Python code to analyze

#### Options

- `--out, -o <path>` - Custom output path for codebase graph JSON (default: `out/codebase_graph.json`)
- `--verbose, -v` - Enable verbose output showing detailed extraction progress
- `--help` - Show command help

#### Examples

```bash
# Basic extraction (outputs to out/codebase_graph.json)
python codeviz.py extract python /path/to/project

# With custom output location
python codeviz.py extract python /path/to/project --out /custom/output.json

# With verbose output
python codeviz.py extract python /path/to/project --verbose

# Real example from our testing
python codeviz.py extract python /Users/greg/Dropbox/dev/blogging/gdwebgen
```

#### Success Output

```bash
# Normal mode
✓ out/codebase_graph.json

# Verbose mode  
Extracted codebase graph to: out/codebase_graph.json
```

#### Error Handling

- Validates target directory exists and is a directory
- Shows clear error messages for missing dependencies
- Exits with code 1 on failure

## Viewer Commands

### `python codeviz.py view open`

Start interactive viewer for exploring extracted codebase structure.

#### Options

- `--host, -h <host>` - Host interface to bind (default: `127.0.0.1`)
- `--port, -p <port>` - Port to serve on, range 1-65535 (default: `8080`)
- `--mode, -m <mode>` - Viewer mode: `default`, `exec`, `modules`, `datastruct` (default: `exec`)
- `--no-browser` - Don't automatically open browser
- `--viewer-dir <path>` - Custom path to viewer files directory
- `--help` - Show command help

#### Examples

```bash
# Start viewer with defaults (opens browser automatically)
python codeviz.py view open

# Custom host and port  
python codeviz.py view open --host 0.0.0.0 --port 9000

# Different viewer mode
python codeviz.py view open --mode modules

# Don't open browser automatically
python codeviz.py view open --no-browser

# Full custom configuration
python codeviz.py view open --host 0.0.0.0 --port 3000 --mode datastruct --no-browser
```

#### Viewer Modes

- `exec` (default) - Execution flow and function relationships
- `modules` - Module dependency view
- `datastruct` - Data structure relationships  
- `default` - Basic structural view

#### Success Output

```bash
Starting viewer at http://127.0.0.1:8080
Viewer mode: exec
Graph data: out/codebase_graph.json
Opening http://127.0.0.1:8080 in browser...
Press Ctrl+C to stop the server
```

#### Prerequisites

The viewer requires:
1. Extracted codebase graph at `out/codebase_graph.json`
2. Viewer files directory (auto-detected at `src/codeviz/viewer/`)

If graph data is missing:
```bash
No codebase graph found at out/codebase_graph.json
Run 'codeviz extract python <target_dir>' first
```

## Utility Commands

### `python codeviz.py version`

Show version and tool information.

#### Example Output

```bash
CodeViz 0.1.0
Generic codebase visualization tool
```

## Complete Workflow Example

Here's a complete workflow from extraction to viewing:

```bash
# 1. Extract a Python codebase
python codeviz.py extract python /Users/greg/Dropbox/dev/blogging/gdwebgen

# Output: ✓ out/codebase_graph.json

# 2. Start the viewer
python codeviz.py view open

# Output:
# Starting viewer at http://127.0.0.1:8080
# Viewer mode: exec
# Graph data: out/codebase_graph.json  
# Opening http://127.0.0.1:8080 in browser...
# Press Ctrl+C to stop the server

# 3. Stop viewer with Ctrl+C when done
```

## Configuration

CodeViz behavior is controlled by:

- **`codeviz_conf.py`** - Core configuration (exclusions, modes, defaults)
- **Environment** - Target directory (set by CLI)
- **Command options** - Override defaults per command

Key configuration points:
- Default output directory: `out/`
- Default viewer mode: `exec`
- Default server: `127.0.0.1:8080`
- File exclusions: `venv/`, `tests/`, `__pycache__/`, etc.

See [CONFIGURATION.md](CONFIGURATION.md) for detailed configuration options.

## Error Scenarios & Troubleshooting  

### Common Issues

1. **Missing target directory**
   ```bash
   Target directory does not exist: /wrong/path
   ```

2. **Missing graph data**
   ```bash
   No codebase graph found at out/codebase_graph.json
   Run 'codeviz extract python <target_dir>' first
   ```

3. **Import errors**
   ```bash
   Failed to import extractor: No module named 'src.codeviz.extractor.main'
   ```

4. **Viewer startup issues**
   - Port conflicts (try different port with `--port`)
   - Missing viewer files (check `--viewer-dir`)
   - Browser not opening (use `--no-browser` and open manually)

### Known Issues

- **Viewer startup reliability**: Server may fail to start properly in some environments
- **Browser integration**: Automatic browser opening may fail on some systems
- **Port binding**: Default port 8080 may conflict with other services

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Shell Completion

Enable tab completion for your shell:

```bash
# Install completion (varies by shell)
python codeviz.py --install-completion

# Show completion script for manual installation
python codeviz.py --show-completion
```

## Related Documentation

- [SETUP.md](SETUP.md) - Installation and environment setup
- [CONFIGURATION.md](CONFIGURATION.md) - Detailed configuration options  
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design