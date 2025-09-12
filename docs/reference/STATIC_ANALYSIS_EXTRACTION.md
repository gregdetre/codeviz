# Static analysis and extraction pipeline

## Introduction

CodeViz performs lightweight static analysis over source files to extract structural information (functions, imports, call edges) and emits a single JSON graph used by the interactive viewer. Parsing is powered by Tree-sitter for robust, language-agnostic CST traversal, converted to a stable, language-neutral graph schema.

## See also

- TREE_SITTER_PARSING_INTEGRATION.md — library overview and parser integration details
- CONFIGURATION.md — per-target TOML configuration format and loader behaviour
- ARCHITECTURE.md — high-level system components and data flow
- DATA_STRUCTURES.md / JSON_FILE_FORMAT.md — graph schema consumed by the viewer
- VIEWER_COMMANDS.md — how the viewer uses the graph for interaction

## Principles and key decisions

- Single, unified output schema across languages
- Fast, resilient parsing with Tree-sitter (handles errors, partial trees)
- Keep extractors simple and explicit; prefer two linear passes per file
- Resolve only what we can with high signal; avoid guessing
- Be conservative: skip edges when unsure rather than emitting noisy links
- Current TypeScript scope: ignore classes/methods (planned), focus on functions

## Pipeline overview

Per target directory:

1) Discover files
- Apply `[analyzer].exclude` and optional `includeOnly` globs relative to the target root
- Language-specific discovery (e.g. .py, .ts/.tsx), ignoring generated artifacts

2) Parse files
- Reuse one parser per language, parse each file into a CST

3) First pass (per file)
- Collect import statements and build alias maps
  - Python: `import`, `from X import Y [as Z]`
  - TS: ES imports (default, named, namespace), recorded as module leaf + imported names
- Collect locally declared function names

4) Second pass (per file)
- Emit nodes for function declarations with file and line ranges
- Emit edges for call sites when resolvable
  - Qualified calls `mod.func` → resolve via alias maps
  - Unqualified calls → resolve against locally declared functions or imported names
- Record module→module import weights

5) Grouping and filtering
- Group nodes under a module id derived from file basename
- Filter edges to endpoints that exist in the node set
- Suppress edges/imports into `[analyzer].excludeModules`

6) Write graph JSON
- Stable schema with `nodes`, `edges`, `groups`, and `moduleImports`

## Language support (current)

- Python
  - Nodes: `function_definition` (names, signatures, docstrings)
  - Edges: `call` resolution via aliases and local names
  - Imports: `import_statement`, `import_from_statement`
- TypeScript (via JS grammar for now) and JavaScript
  - Nodes: `function_declaration` (names, signatures)
  - Edges: `call_expression` resolved via ES import aliases and local names
  - Imports: `import_statement`
  - Ignored for now: classes, methods, arrow functions (planned)

### Near‑term language priorities

- JavaScript, TSX/JSX, Go, Bash, Rust, Ruby, Kotlin, C‑Sharp, Elixir, Java

These are targeted based on ecosystem prevalence and grammar maturity in Tree‑sitter.

## Configuration

Per-target TOML controls discovery and output locations:

```toml
[target]
# Directory to analyse; absolute or relative to this TOML file
dir = "../"

[analyzer]
# Globs relative to target root
exclude = [
  "**/node_modules/**", "**/dist/**", "**/ts/dist/**", "**/out/**",
  "**/.venv/**", "**/__pycache__/**", "**/test-results/**"
]
# Optional allowlist; if set, only these paths are analysed
# includeOnly = ["ts/**/*.ts", "ts/**/*.tsx"]
# Suppress edges/imports to these top-level modules
excludeModules = []

[output]
# Directory; the file written is <dir>/codebase_graph.json
dir = "out/codeviz"

[viewer]
layout = "elk-then-fcose"
port = 8002
```

## CLI usage

- Extract Python: `codeviz extract python --config <file.toml>`
- Extract TypeScript: `codeviz extract ts --config <file.toml>`
- Start viewer: `codeviz view open --config <file.toml>`

Outputs are written to `[output].dir/codebase_graph.json`; the viewer serves both the UI and JSON from a single port.

## Limitations and gotchas (current)

- TypeScript extractor currently ignores classes/methods and arrow functions
- TypeScript parsing uses the JS grammar temporarily; swap to TS grammar when available in our dep set
- Module ids are derived from file basenames; deep paths collapse to leaf modules
- Only straightforward two-segment qualified calls are resolved; longer chains are skipped
- Python docstrings are extracted; TS has no doc extraction yet

## Planned enhancements

- Adopt the TypeScript grammar and cover TSX, classes, methods, arrow functions
- Multi-language runs and merging graphs across languages
- Markdown ingestion for documentation linkage
- Incremental runs and cache for large codebases
- User-defined S-expression queries for custom extraction rules

## Appendix: Adding a new language

This appendix summarises the practical steps, effort, and caveats when introducing a new language extractor using Tree‑sitter.

### Steps to add a language

1. Install or load the grammar
   - Prefer npm packages if available (e.g., `tree-sitter-go`, `tree-sitter-rust`).
   - If no npm dist exists, load the grammar via `web-tree-sitter` and a `.wasm` artifact or vendor the grammar.
2. Wire a parser
   - Create or extend a parser factory to map file extensions → grammar.
   - Reuse a single parser instance per language for all files.
3. Implement an extractor `extract-<lang>.ts`
   - First pass per file: collect imports, alias maps, and locally declared function names.
   - Second pass per file: emit function nodes (with file/line ranges), resolve call sites to targets when possible, and accumulate module→module import weights.
   - Conform to the unified graph schema (`nodes`, `edges`, `groups`, `moduleImports`).
4. Register in the CLI
   - Add the language to the `extract` command suite or the "extract all" loop.
   - Add minimal tests and demo fixtures.

### Expected effort

- Definitions and imports only: hours to one day.
- Reasonable call‑edge resolution: 1–2 days+, depending on language semantics (module resolution, dynamic features, method dispatch).

### Well‑supported languages (good early candidates)

- JavaScript/TypeScript/TSX/JSX, Go, Rust, Java, Kotlin, C/C++, C‑Sharp, Ruby, PHP, Lua, Elixir, Bash, JSON/YAML/TOML/Markdown.

Languages without npm distributions can still be supported via WASM loading but require extra setup.

### Common gotchas and limitations

- Version/ABI mismatches between Tree‑sitter core and grammars; align versions and rebuild if necessary.
- Import semantics vary widely:
  - Dynamic languages (Ruby/Python) and reflection make call edges approximate.
  - C/C++ includes and macros are not module imports; dependency edges are heuristic.
  - Strongly typed ecosystems (Java/Kotlin/Go) require package path resolution for fidelity.
- Call graph fidelity is best‑effort without type/alias resolution (especially for methods and re‑exports).
- Performance on large repos: rely on excludes and parallel parsing; consider incremental runs later.
- Mixed/SFC files (e.g., Vue/Svelte) embed multiple languages and may need special handling.

## Troubleshooting

- If the viewer starts without data, ensure the extract step was run for the same config
- If extraction is slow, restrict scope via `includeOnly` and verify excludes
- For missing edges, print trees or enable verbose logs to validate node types and text


