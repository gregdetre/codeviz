# CodeViz Command Line Usage (TypeScript)

CodeViz provides a Clipanion-based CLI for extracting codebase structure and viewing interactive visualizations. The tool follows a two-stage workflow: extraction followed by viewing.

## Quick Reference

| Command | Description |
|---------|-------------|
| `npx codeviz --help` | Show main help |
| `npx codeviz extract python <target_dir>` | Extract Python codebase |
| `npx codeviz view open` | Start viewer server |

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

### `npx codeviz extract python <target_dir>`

Extract static codebase graph from Python code using Tree-sitter.

#### Arguments

- `target_dir` (required) - Directory containing Python code to analyze

#### Options

- `--out <path>` - Output path for codebase graph JSON (default: `out/codebase_graph.json`)
- `--verbose, -v` - Enable verbose output

#### Examples

```bash
# Basic extraction (outputs to out/codebase_graph.json)
npx codeviz extract python demo_codebase

# With custom output location
npx codeviz extract python /path/to/project --out out/my_graph.json

# With verbose output
npx codeviz extract python demo_codebase --verbose
```

## Viewer Commands

### `npx codeviz view open`

Start interactive viewer for exploring extracted codebase structure.

#### Options

- `--host <host>` - Host interface (default: `127.0.0.1`)
- `--port <port>` - Port to serve on (default: `8080`)
- `--no-browser` - Don't automatically open browser
- `--kill-existing` - Kill existing processes on port before starting (default: `true`)
- `--mode <default|explore|modules>` - Initial viewer mode (default: `default`)
- `--hybrid-mode <sequential|constrained>` - Hybrid submode when using ELK→fCoSE (default: `sequential`)

#### Examples

```bash
# Start viewer with defaults
npx codeviz view open

# Custom host and port
npx codeviz view open --host 0.0.0.0 --port 3000

# Don't open browser automatically
npx codeviz view open --no-browser

# Don't kill existing processes on port
npx codeviz view open --no-kill-existing

# Start with Modules mode and constrained hybrid refinement
npx codeviz view open --mode modules --hybrid-mode constrained
```

#### Prerequisites

- Extracted codebase graph at `out/codebase_graph.json`
- Viewer is built (handled by `npm run build --prefix ts`)

If graph data is missing:
```bash
No codebase graph found at out/codebase_graph.json
Run 'npx codeviz extract python <target_dir>' first
```

## Configuration

- Per-target `.codeviz.toml` file in repo root (e.g., `demo_codebase.codeviz.toml`)
- CLI `--out` overrides the config's `output.path`

## Error Scenarios & Troubleshooting

- Port conflicts: use `--port`
- Missing JSON: run extraction first
- Tree-sitter build issues: consider switching to web-tree-sitter in a follow-up

## See Also

- `WORD_WRAP_LIBRARY_INTEGRATION.md` - Text formatting and CLI output utilities