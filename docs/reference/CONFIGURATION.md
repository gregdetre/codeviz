# Configuration (TOML)

CodeViz uses per-target TOML configuration files to customize analysis and visualization. Place a file named `<target>.codeviz.toml` in either the repository root or in `configs/` (preferred), e.g., `configs/demo_codebase.codeviz.toml`.

## See also

- [SETUP.md](SETUP.md) - Installation and environment setup
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview
- [LAYOUT.md](LAYOUT.md) - Viewer layout and display options

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
path = "out/codebase_graph.json"

[viewer]
# Default layout to use in the viewer ("elk" or "fcose")
layout = "elk"
# Default mode for viewer (e.g., "default", "exec")
mode = "default"
# Optional defaults for the view server
host = "127.0.0.1"
port = 8080
```

## Sections

### `[analyzer]`
- **exclude**: array of glob patterns to skip when discovering files
- **includeOnly**: optional array of globs; if set, only files matching any pattern are analyzed
- **excludeModules**: array of top-level module names to suppress from import edges/call edges

### `[output]`
- **path**: output path for the graph JSON (default: `out/codebase_graph.json`)

### `[viewer]`
- **layout**: default layout to use in the viewer (`elk` by default; `fcose` also supported)
- **mode**: default viewer mode, used when starting the server via `view open`
- **host**: default host for `view open` when `--target` is provided
- **port**: default port for `view open` when `--target` is provided

## Loading order and overrides

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
path = "out/my_project_graph.json"
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