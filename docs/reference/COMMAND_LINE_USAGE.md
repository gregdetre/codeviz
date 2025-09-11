# CodeViz Command Line Usage (TypeScript)

CodeViz provides npm scripts for extracting codebase structure and viewing interactive visualizations. The tool follows a two-stage workflow: extraction followed by viewing.

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run extract -- <target_dir>` | Extract Python codebase |
| `npm run view -- [options]` | Start viewer server |

## CLI Structure

```
cli/index.ts
├── extract/
│   └── python <target_dir>
└── view/
    └── open
```

### Global Options

- `--help` - Show help message and exit

## Extraction Commands

### `npm run extract -- <target_dir>`

Extract static codebase graph from Python code using Tree-sitter.

#### Arguments

- `target_dir` (required) - Directory containing Python code to analyze. The per-target config is auto-discovered from `<basename(target_dir)>.codeviz.toml` in repo root or `configs/`.

#### Options (pass after `--`)

- `--out <path>` - Output path for codebase graph JSON (default: `out/<target>/codebase_graph.json`)
- `--verbose, -v` - Enable verbose output

#### Examples

```bash
# Basic extraction (outputs to out/<target>/codebase_graph.json, picks up configs/demo_codebase.codeviz.toml)
npm run extract -- demo_codebase

# With custom output location
npm run extract -- /path/to/project --out out/my_project/codebase_graph.json

# With verbose output
npm run extract -- demo_codebase --verbose
```

## Viewer Commands

### `npm run view -- [options]`

Start interactive viewer for exploring extracted codebase structure.

#### Options (pass after `--`)

- `--host <host>` - Host interface (default: `127.0.0.1`)
- `--port <port>` - Port to serve on (default: `8000`)
- `--no-browser` - Don't automatically open browser
- `--no-kill-existing` - Don't kill existing processes on port before starting
- `--mode <default|explore|modules>` - Initial viewer mode (default: `default`)
- `--hybrid-mode <sequential>` - Hybrid submode when using ELK→fCoSE (default: `sequential`)
- `--target <path>` - Optional target directory to influence viewer defaults (host/port/mode) via its `.codeviz.toml`

#### Examples

```bash
# Start viewer with defaults
npm run view --

# Custom host and port
npm run view -- --host 0.0.0.0 --port 3000

# Don't open browser automatically
npm run view -- --no-browser

# Don't kill existing processes on port
npm run view -- --no-kill-existing

# Start with Modules mode and sequential hybrid refinement (default)
npm run view -- --mode modules --hybrid-mode sequential
```

#### One-command workflows

```bash
# Build + serve (auto-open, kills existing by default)
npm run up -- --port 8000 --mode modules

# Dev auto-reload (rebuilds on change, restarts server, auto-open)
npm run dev -- --port 8000 --mode modules
```

### Usage guidance

- Use `npm run extract -- <dir>` for extraction (canonical).
- Use `npm run view -- [options]` to start the viewer.
- Avoid `npx codeviz` due to an npm package name collision; it may pull an unrelated package.
- During development, `npm run dev` auto-rebuilds the viewer and restarts the server. Append flags after `--`.

#### Prerequisites

- Extracted codebase graph at `out/<target>/codebase_graph.json`
- Viewer is built (handled by `npm run build`)

If graph data is missing:
```bash
No codebase graph found at out/<target>/codebase_graph.json
Run 'npm run extract -- <target_dir>' first
```

## Configuration

- Per-target `.codeviz.toml` file in repo root (e.g., `demo_codebase.codeviz.toml`)
- CLI `--out` overrides the config's `output.path`

## Error Scenarios & Troubleshooting

- Port conflicts: use `--port`
- Missing JSON: run extraction first
- Tree-sitter build issues: consider switching to web-tree-sitter in a follow-up

## See Also

- `libraries/WORD_WRAP_LIBRARY_INTEGRATION.md` - Text formatting and CLI output utilities