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
exclude = ["**/__pycache__/**", "**/.venv/**", "**/tests/**"]

[output]
path = "out/codebase_graph.json"

[viewer]
layout = "elk"
```

## Sections

### `[analyzer]`
- **exclude**: array of glob patterns to skip when discovering files

### `[output]`
- **path**: output path for the graph JSON (default: `out/codebase_graph.json`)

### `[viewer]`
- **layout**: default layout to use in the viewer (`elk` by default; `fcose` also supported)

## Loading order and overrides

- The CLI looks up `<target>.codeviz.toml` by the folder name passed to `extract`. Files are resolved from repo root, then `configs/`.
- CLI flags (e.g., `--out`) override values from the config file.

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

## Troubleshooting

- If the config isn't applied, ensure the file name matches the target directory (e.g., `demo_codebase` → `demo_codebase.codeviz.toml`).
- Use CLI overrides to verify behavior (e.g., change `--out` path and confirm output).