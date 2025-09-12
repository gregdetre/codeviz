# CodeViz Command Line Usage (TypeScript)

CodeViz provides npm scripts for extracting codebase structure and viewing interactive visualizations. The tool follows a two-stage workflow: extraction followed by viewing.

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run extract -- --config <file.toml>` | Extract Python codebase |
| `npm run annotate -- --config <file.toml>` | Generate LLM annotations/tags |
| `npm run view -- --config <file.toml> [options]` | Start viewer server |

## CLI Structure

```
cli/index.ts
├── extract/
│   └── python --config <file.toml>
├── annotate --config <file.toml>
└── view/
    └── open --config <file.toml>
```

### Global Options

- `--help` - Show help message and exit

## Extraction Commands

### `npm run extract -- --config <file.toml>`

Extract static codebase graph from Python code using Tree-sitter.

#### Arguments

- `--config <file.toml>` (required) - Per-target TOML config. All paths are absolute or resolved relative to the TOML file location.

#### Options (pass after `--`)

- `--verbose, -v` - Enable verbose output

#### Examples

```bash
# Basic extraction with explicit config
npm run extract -- --config ./configs/demo_codebase.codeviz.toml

# With verbose output
npm run extract -- --config ./configs/demo_codebase.codeviz.toml --verbose
```

## Annotation Command

### `npm run annotate -- --config <file.toml>`

Generate LLM-based tags for function nodes and write `llm_annotation.json` alongside the graph in the same output folder.

#### Options (pass after `--`)

- `--vocab <closed|open|suggest>` - Vocabulary mode for tags (default: `closed`)
- `--context-budget <int>` - Token budget for project browsing and summarization (default: `100000`)
- `--model <string>` - Claude model alias or ID (default: `opus-4.1`)

#### Examples

```bash
# Annotate functions in the project configured by TOML (closed vocabulary)
npm run annotate -- --config ./configs/demo_codebase.codeviz.toml

# Larger context budget, suggest mode
npm run annotate -- --config ./configs/demo_codebase.codeviz.toml --vocab suggest --context-budget 150000
```

## Viewer Commands

### `npm run view -- --config <file.toml> [options]`

Start interactive viewer for exploring extracted codebase structure.

#### Options (pass after `--`)

- `--host <host>` - Host interface (default: `127.0.0.1`)
- `--port <port>` - Port to serve on (default: `8000`)
- `--no-browser` - Don't automatically open browser
- `--no-kill-existing` - Don't kill existing processes on port before starting
- `--mode <default|explore|modules>` - Initial viewer mode (default: `default`)
- `--hybrid-mode <sequential>` - Hybrid submode when using ELK→fCoSE (default: `sequential`)
  (No target guessing; the CLI computes the exact data file from the config.)

#### Examples

```bash
# Start viewer with config
npm run view -- --config ./configs/demo_codebase.codeviz.toml

# Custom host and port
npm run view -- --config ./configs/demo_codebase.codeviz.toml --host 0.0.0.0 --port 3000

# Don't open browser automatically
npm run view -- --config ./configs/demo_codebase.codeviz.toml --no-browser

# Don't kill existing processes on port
npm run view -- --config ./configs/demo_codebase.codeviz.toml --no-kill-existing

# Start with Modules mode and sequential hybrid refinement (default)
npm run view -- --config ./configs/demo_codebase.codeviz.toml --mode modules --hybrid-mode sequential
```

#### One-command workflows

```bash
# Build + serve (auto-open, kills existing by default)
npm run up -- --config ./configs/demo_codebase.codeviz.toml --port 8000 --mode modules

# Dev auto-reload (rebuilds on change, restarts server, auto-open)
npm run dev -- --config ./configs/demo_codebase.codeviz.toml --port 8000 --mode modules
```

### Usage guidance

- Use `npm run extract -- --config <file.toml>` for extraction (canonical).
- Use `npm run annotate -- --config <file.toml>` to generate `llm_annotation.json` using the Claude CLI (local project mode).
- Use `npm run view -- --config <file.toml>` to start the viewer.
- Avoid `npx codeviz` due to an npm package name collision; it may pull an unrelated package.
- During development, `npm run dev` auto-rebuilds the viewer and restarts the server. Append flags after `--`.

#### Prerequisites

- Extracted codebase graph at `<output.dir>/codebase_graph.json`
- Optional annotations at `out/<target>/llm_annotation.json`
- Viewer is built (handled by `npm run build`)

If graph data is missing, ensure you ran extract with the same `--config` and that the file exists at `<output.dir>/codebase_graph.json`.

## Configuration

- Per-target `.codeviz.toml` file (e.g., `configs/demo_codebase.codeviz.toml`)
- All paths in the config are absolute or resolved relative to the config file

## Error Scenarios & Troubleshooting

- Port conflicts: use `--port`
- Missing JSON: run extraction first
- Tree-sitter build issues: consider switching to web-tree-sitter in a follow-up

## See Also

- `libraries/WORD_WRAP_LIBRARY_INTEGRATION.md` - Text formatting and CLI output utilities