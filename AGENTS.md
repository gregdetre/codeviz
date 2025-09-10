# CodeViz - AI Agent Instructions

Generic codebase visualization tool for exploring code structure and dependencies.

## Essential Context

- **Framework**: Python CLI (Typer), AST analysis, web-based viewer  
- **Purpose**: Generic codebase visualization (Python, future TypeScript support)
- **Status**: ✓ Migrated from gdwebgen, extraction working, viewer needs fixes
- **Core features**: AST extraction, interactive viewer, dependency mapping

## Current Status & Known Issues

**✅ Working:**
- Extraction: `python codeviz.py extract python <target>` successfully processes Python codebases
- CLI: Full Typer-based command structure functional
- Configuration: Project-specific configs working (see `docs/reference/CONFIGURATION.md`)
- Dependencies: gjdutils integration for shared webserver utilities

**⚠️ Known Issues:**
- **Viewer startup**: Two-server architecture needs coordination fixes
- **Vite dependencies**: May need `npm install` in `src/codeviz/viewer/cyto/`  
- **Data serving**: Viewer expects data at `/gdviz/out/codebase_graph.json` - path hardcoded

**📋 Testing Results:**
- Extraction from gdwebgen: ✅ 147 functions extracted successfully
- JSON output: ✅ Valid schema, properly structured
- CLI help: ✅ All commands documented and working

## Build Commands

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install viewer dependencies (if viewer issues occur)
cd src/codeviz/viewer/cyto && npm install

# Extract codebase structure
python codeviz.py extract python <target_directory>

# Start interactive viewer (may have startup issues - see troubleshooting)
python codeviz.py view open

# Help for any command
python codeviz.py --help
python codeviz.py extract --help
python codeviz.py view --help
```

## Testing & Code Quality

```bash
pytest                    # Run all tests
pytest-watch             # Continuous testing  
black .                  # Format code
```

## Project Structure

- **Core**: `codeviz.py` (CLI), `src/codeviz/extractor/main.py` (extraction), `src/codeviz/viewer/` (web viewer)
- **Config**: `codeviz_conf.py` (settings and exclusion patterns)
- **Standalone**: `standalone_extractor.py` (core AST analysis logic)
- **Viewer**: `src/codeviz/viewer/cyto/` (Vite-based web interface)

## Key Features

- **Multi-mode extraction**: AST analysis for Python codebases
- **Interactive visualization**: Cytoscape.js-based web viewer  
- **Configurable exclusions**: File patterns, modules to exclude
- **Multiple viewer modes**: exec, modules, datastruct, default
- **Generic design**: Works with any Python project

## CLI Structure

### Extract Commands
- `codeviz extract python <dir>`: Extract Python codebase structure
  - `--out, -o`: Custom output path
  - `--verbose, -v`: Verbose output

### Viewer Commands  
- `codeviz view open`: Start interactive web viewer
  - `--host, -h`: Server host (default: 127.0.0.1)
  - `--port, -p`: Server port (default: 8080)
  - `--mode, -m`: Viewer mode
  - `--no-browser`: Don't auto-open browser

## Documentation

- **README.md**: Quick start and essential usage
- **docs/reference/CONFIGURATION.md**: Comprehensive configuration guide  
- **docs/reference/SETUP.md**: Development environment setup
- **docs/reference/ARCHITECTURE.md**: System architecture overview
- **docs/reference/TROUBLESHOOTING.md**: Common issues and solutions

## Configuration

Main config files:
- **codeviz_conf.py**: Global defaults and exclusion patterns
- **configs/project_conf.py**: Project-specific configurations (see CONFIGURATION.md)

## Development Workflow

1. **Extract**: `python codeviz.py extract python /path/to/project`
2. **Visualize**: `python codeviz.py view open`  
3. **Configure**: Edit `codeviz_conf.py` for custom exclusions
4. **Extend**: Add new language support or viewer features

## Output Format

JSON graph structure:
```json
{
  "version": 1,
  "schemaVersion": "1.0.0",
  "nodes": [...],         // Functions, classes, variables
  "edges": [...],         // Calls, imports, relationships  
  "groups": [...],        // Module groupings
  "moduleImports": [...]  // Import dependencies
}
```

## Viewer Technology

- **Frontend**: Vite + TypeScript + Cytoscape.js
- **Backend**: Python HTTP server (simple or Vite dev server)
- **Modes**: Different visualization perspectives (exec, modules, etc.)

## Common Use Cases

- **Code exploration**: Understand large/unfamiliar codebases
- **Dependency analysis**: Visualize imports and call patterns
- **Architecture review**: See module relationships and structure
- **Refactoring planning**: Identify tightly coupled components

## Future Expansion

- **TypeScript support**: Extend to JavaScript/TypeScript projects
- **Additional languages**: Framework ready for multi-language support
- **Advanced analysis**: Control flow, data flow analysis
- **Integration**: IDE plugins, CI/CD integration

## Implementation Notes

- **Modular design**: Clear separation of extraction and visualization
- **Generic foundation**: Easy to extend for new languages  
- **Configuration-driven**: Exclude patterns and analysis options
- **Web-based UI**: Modern, interactive visualization

## Claude Code Specific

- Use parallel tool calls for file operations
- Include absolute file paths in responses
- Prefer Task tool for open-ended searches
- Follow Python best practices and project structure