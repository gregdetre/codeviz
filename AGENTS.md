# CodeViz - AI Agent Instructions

Generic codebase visualization tool for exploring code structure and dependencies.

## Essential Context

- **Framework**: TypeScript CLI (Clipanion), Tree-sitter analysis, Vite + Cytoscape.js viewer
- **Purpose**: Generic codebase visualization (Python support, TypeScript analyzer planned)
- **Status**: ✅ Rewritten in TypeScript, fully functional end-to-end
- **Core features**: Tree-sitter AST extraction, interactive Cytoscape.js viewer, dependency mapping

## Current Status & Known Issues

**✅ Working:**
- Extraction: `codeviz extract python <target>` processes Python codebases via tree-sitter
- CLI: Clipanion-based TypeScript command structure fully functional  
- Configuration: Per-target `.codeviz.toml` files (e.g., `demo_codebase.codeviz.toml`)
- Viewer: Single-port Fastify server with Vite-built Cytoscape.js frontend
- Integration: End-to-end TypeScript workflow from extraction to visualization

**📋 Testing Results:**
- TypeScript CLI: ✅ All commands working with proper help
- Python extraction: ✅ Tree-sitter successfully extracts functions, imports, calls
- JSON output: ✅ Schema-compliant graph data
- Viewer: ✅ Interactive Cytoscape.js with fcose layout, compound nodes
- Server: ✅ Single-port serving both static files and graph data

## Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript CLI and viewer
npm run build

# Extract codebase structure
npx codeviz extract python <target_directory>
# OR: npm run dev:cli extract python <target_directory>

# Start interactive viewer
npx codeviz view open

# One-command shortcuts
# Build + serve (auto-open; kills existing)
npm run up -- --port 3080
# Dev auto-reload (rebuilds viewer, restarts server; auto-open)
npm run dev -- --port 3080

# Help for any command
npx codeviz --help
npx codeviz extract --help
npx codeviz view --help
```

## Testing & Code Quality

```bash
npm test                 # Run Playwright tests
npm run test:ui          # Run tests with UI
tsc --noEmit             # Type checking
```

### Quick demo (visualize `demo_codebase/`)

```bash
lsof -ti:3080 | xargs -r kill
npm install && npm run build
npx tsx ts/src/cli/index.ts extract python demo_codebase --out out/codebase_graph.json
npm run view -- --port 3080 --no-browser
open http://127.0.0.1:3080
```

### Logging (dev)

- Browser console logs are forwarded to the server and saved to `out/viewer.log`.
- Quick tail:
```bash
tail -f out/viewer.log
# or via HTTP
curl -s http://127.0.0.1:3080/out/viewer.log | tail -n 50
```

## Project Structure

- **TypeScript Core**: `ts/src/cli/index.ts` (Clipanion CLI), `ts/src/analyzer/extract-python.ts` (tree-sitter extraction)
- **Config**: `ts/src/config/loadConfig.ts` (per-target `.codeviz.toml` loading)
- **Server**: `ts/src/server/server.ts` (Fastify server serving viewer + data)
- **Viewer**: `ts/viewer/` (Vite + TypeScript + Cytoscape.js frontend)
- **Legacy Python**: `codeviz.py`, `src/codeviz/` (archived, use TypeScript version)

## Key Features

- **Multi-mode extraction**: AST analysis for Python codebases
- **Interactive visualization**: Cytoscape.js-based web viewer  
- **Configurable exclusions**: File patterns, modules to exclude
- **Multiple viewer modes**: exec, modules, datastruct, default
- **Generic design**: Works with any Python project

## CLI Structure

### Extract Commands
- `codeviz extract python <dir>`: Extract Python codebase structure via tree-sitter
  - `--out`: Custom output path (default: out/codebase_graph.json)
  - `--verbose, -v`: Verbose output

### Viewer Commands  
- `codeviz view open`: Start single-port Fastify server with built viewer
  - `--host`: Server host (default: 127.0.0.1)
  - `--port`: Server port (default: 8080)
  - `--mode`: Viewer mode (default: default)
  - `--no-browser`: Don't auto-open browser

## Documentation

- **README.md**: Quick start and essential usage
- **docs/reference/CONFIGURATION.md**: Comprehensive configuration guide  
- **docs/reference/SETUP.md**: Development environment setup
- **docs/reference/ARCHITECTURE.md**: System architecture overview
- **docs/reference/TROUBLESHOOTING.md**: Common issues and solutions
- **docs/reference/libraries/WORD_WRAP_LIBRARY_INTEGRATION.md**: Text wrapping utility for CLI output formatting
- **docs/reference/libraries/FLOATING_UI_TOOLTIP_INTEGRATION.md**: Interactive tooltip positioning for viewer
- **docs/planning/**: Recent work documentation (in progress projects)
- **docs/planning/finished/**: Completed project documentation
- Planning docs use `yyMMdd` datetime prefix (see `gjdutils/src/ts/cli/sequential-datetime-prefix.ts`)

## Configuration

Main config files:
- **Per-target configs**: `<target>.codeviz.toml` (e.g., `demo_codebase.codeviz.toml`)
- **Config sections**: `[analyzer]` (exclude patterns), `[output]` (path), `[viewer]` (layout)
- **Auto-resolution**: Config loader finds appropriate `.codeviz.toml` for target directory

## Development Workflow

1. **Setup**: `npm install && npm run build`
2. **Extract**: `npx codeviz extract python /path/to/project`
3. **Visualize**: `npx codeviz view open`
4. **Configure**: Create/edit `<target>.codeviz.toml` for custom exclusions
5. **Develop**: Use `npm run dev` for auto-reload (or `npm run dev:view` for viewer-only)
6. **Extend**: Add new language support or viewer features in TypeScript

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

- **Frontend**: Vite + TypeScript + Cytoscape.js with fcose layout
- **Backend**: Fastify server serving both static files and graph JSON
- **Features**: Compound nodes (module grouping), neighbor highlighting, edge toggling
- **Modes**: Different visualization perspectives (configurable via viewer settings)

## Common Use Cases

- **Code exploration**: Understand large/unfamiliar codebases
- **Dependency analysis**: Visualize imports and call patterns
- **Architecture review**: See module relationships and structure
- **Refactoring planning**: Identify tightly coupled components

## Future Expansion

- **TypeScript/JavaScript support**: Add tree-sitter parsers for JS/TS
- **Additional languages**: Framework ready for multi-language support via tree-sitter
- **Advanced analysis**: Cross-file call analysis, data flow
- **Integration**: IDE plugins, CI/CD integration
- **Performance**: Large codebase optimizations

## Implementation Notes

- **Pure TypeScript**: End-to-end TypeScript from CLI to viewer
- **Tree-sitter based**: Robust, language-agnostic parsing
- **Single-port architecture**: Simplified deployment and development
- **Schema-stable**: Maintains backward compatibility with JSON graph format
- **Modular design**: Clear separation of CLI, analyzer, server, and viewer

## TypeScript Development Context

- **Primary codebase**: `ts/` directory contains active TypeScript implementation
- **Legacy Python**: Still present but archived; TypeScript version is canonical
- **Configuration**: Uses TOML format with per-target configs
- **Documentation**: See `docs/reference/` for architecture and format specs

## Claude Code Specific

- Use parallel tool calls for file operations
- Include absolute file paths in responses  
- Prefer Task tool for open-ended searches
- Follow TypeScript best practices and existing project patterns
- Work primarily in `ts/` directory for active development

## Git Commits

Follow guidelines in `@gjdutils/docs/instructions/GIT_COMMIT_CHANGES.md`. Key points:
- **Batch commits**: Group related changes, commit one batch at a time
- **Atomic operations**: Chain unstage/add/commit to prevent interference: `git reset HEAD && git add files && git commit -m "msg"`
- **Use subagents**: For complex multi-commit scenarios with proper context

## Coding Principles

### Core Philosophy
- Prioritise code that's simple, easy-to-understand, debuggable, and readable
- Fix the root cause rather than putting on a band-aid
- Avoid fallbacks & defaults - better to fail if input assumptions aren't being met

### Error Handling
- Raise errors early, clearly & fatally
- Prefer not to wrap in try/except so that tracebacks are obvious

### Development Approach
- Don't try to write a full, final version immediately
- Get a simple version working end-to-end first, then gradually layer in complexity in stages
- Aim to keep changes minimal and focused on the task at hand
- Try to keep things concise, don't over-engineer

### Best Practices
- Follow software engineering best practices:
  - Reuse code where it makes sense
  - Pull out core reusable functionality into utility functions
  - Break long/complex functions down
- Write code that's easy to test, prefer functional style
- Avoid object-oriented unless it's a particularly good fit
- Keep documentation up-to-date as you go

### Collaboration
- If the user asks you a question, answer it directly, and stop work on other tasks until consensus has been reached
- If you notice other things that should be changed/updated, ask/suggest
- If things don't make sense or seem like a bad idea, ask questions or discuss rather than just going along with it
- Be a good collaborator and help make good decisions, rather than just obeying blindly

### External Dependencies
- When picking 3rd-party libraries, prefer ones with large communities

### Comments
- Comment sparingly - reserve it for explaining surprising or confusing sections