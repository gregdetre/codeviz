# Configuration (TOML)

CodeViz uses per-target TOML configuration files to customize analysis and visualization. Place a file named `<target>.codeviz.toml` in either the repository root or in `configs/` (preferred), e.g., `configs/demo_codebase.codeviz.toml`.

## See also

- [SETUP.md](SETUP.md) - Installation and environment setup
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview
- [LAYOUT.md](LAYOUT.md) - Viewer layout and display options

## Global configuration (TOML)

CodeViz supports a simple global configuration kept in the project root for settings that are not tied to a specific target (for example, LLM provider/model for assistant features).

Location:

- Project root: `codeviz.config.toml`
- Optional override via env var: `CODEVIZ_GLOBAL_CONFIG` (or `CODEVIZ_CONFIG`)

Example:
```toml
[llm]
# Model string format: provider:model:version[:thinking]
model = "anthropic:claude-sonnet-4:20250514"
# model = "anthropic:claude-opus-4:latest:thinking"  # Latest Opus 4.1 in thinking mode
# model = "openai:gpt-5-high:latest:thinking"        # GPT-5-high with thinking mode (when available)
temperature = 0.2
maxTokens = 2000

[viewer]
# Optional defaults for the view server
host = "127.0.0.1"
port = 8000
```

**Model String Format**: `provider:model:version[:thinking]`
- `provider`: AI provider (anthropic, openai, etc.)
- `model`: Model identifier without version suffix
- `version`: Version identifier (date-based, latest, preview, etc.)  
- `thinking`: Optional suffix for reasoning/thinking mode

See [LLM_CHAT_INTERFACE.md](LLM_CHAT_INTERFACE.md) for detailed LLM integration documentation.

Notes:
- Global config is separate from per-target config and is not layered/merged with it.
- Keep project-specific analysis/viewer settings in the per-target TOML described below.

## File format

Example:
```toml
[analyzer]
# Exclude and include globs relative to the target directory
exclude = ["**/__pycache__/**", "**/.venv/**", "**/tests/**"]
# Only include files matching these globs (optional). If present, acts as a whitelist.
includeOnly = []
# Ignore edges/imports into these top-level modules (e.g., stdlib, external libs)
excludeModules = ["gjdutils"]

[output]
# Absolute or relative path for the graph JSON
path = "out/<target>/codebase_graph.json"

[viewer]
# Default layout to use in the viewer ("elk" or "fcose")
layout = "elk"
# Default mode for viewer (e.g., "default", "exec")
mode = "default"
# Optional defaults for the view server
host = "127.0.0.1"
port = 8000
```

## Sections

### `[analyzer]`
- **exclude**: array of glob patterns to skip when discovering files
- **includeOnly**: optional array of globs; if set, only files matching any pattern are analyzed
- **excludeModules**: array of top-level module names to suppress from import edges/call edges

### `[output]`
- **path**: output path for the graph JSON (default: `out/<target>/codebase_graph.json`)

### `[viewer]`
- **layout**: default layout to use in the viewer (`elk` by default; `fcose` also supported)
- **mode**: default viewer mode, used when starting the server via `view open`
- **host**: default host for `view open` when `--target` is provided
- **port**: default port for `view open` when `--target` is provided

## Loading order and overrides

- CLI precedence for viewer settings: `CLI flags` > `per-target .codeviz.toml` > `global codeviz.config.toml` > built-in defaults (host `127.0.0.1`, port `8000`).
- The CLI looks up `<target>.codeviz.toml` by the folder name passed to `extract`. Files are resolved from repo root, then `configs/`.
- CLI flags (e.g., `--out`, `--host`, `--port`, `--mode`) override values from the config file.

## Common patterns

- Skip virtualenv and caches:
```toml
[analyzer]
exclude = ["**/.venv/**", "**/__pycache__/**", "**/.mypy_cache/**"]
```

- Custom output location:
```toml
[output]
path = "out/my_project/codebase_graph.json"
```

- Whitelist a subset of files and hide external imports:
```toml
[analyzer]
includeOnly = ["gdwebgen.py", "pipeline/**", "cli/**"]
excludeModules = ["gjdutils"]
```

## Troubleshooting

- If the config isn't applied, ensure the file name matches the target directory (e.g., `demo_codebase` → `demo_codebase.codeviz.toml`).
- Use CLI overrides to verify behavior (e.g., change `--out` path and confirm output).