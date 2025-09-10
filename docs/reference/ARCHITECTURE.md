# gdviz Architecture Overview

High-level system architecture for gdviz, the codebase visualization tool. This document explains how the extraction and viewer components work together to create interactive code visualizations.

## See also

- `../../README.md` - Project overview and quick start
- `SETUP.md` - Development environment setup and dependencies
- `LAYOUT.md` - Layout strategies and compound node grouping
- `cyto/README.md` - Comprehensive Cytoscape.js implementation guides
- `../../schema/codebase_graph.schema.json` - JSON data format specification
- `../../../extract_codebase_graph.py` - Main extraction implementation
- `../../viewer/cyto/` - Cytoscape + Vite + TypeScript viewer

## Introduction

gdviz follows a **two-phase architecture**: static analysis extracts codebase data into JSON, then a client-side viewer renders interactive visualizations. This separation enables fast iteration on visualizations without re-parsing code, and keeps extraction lightweight with no runtime dependencies.

## System Components

### 1. Data Extraction Phase

**Purpose**: Parse Python source code and extract structural relationships

**Key Files**:
- `extract_codebase_graph.py` - Main extraction script
- `gdviz/gdviz_conf.py` - Configuration (file patterns, defaults)
- `gdviz/extractor/main.py` - Core extraction logic

**Process**:
1. **File Discovery**: Scan for Python files based on include/exclude patterns
2. **AST Parsing**: Parse each file into Abstract Syntax Tree
3. **Relationship Extraction**: Identify function calls, imports, build steps
4. **Metadata Collection**: Gather signatures, docstrings, inline tags
5. **JSON Generation**: Serialize to standardized format

**Output**: `gdviz/out/codebase_graph.json` (git-ignored)

### 2. Visualization Phase  

**Purpose**: Render interactive graph visualizations from extracted data

**Key Files**:
- `gdviz/viewer/cyto/` - Vite app (Cytoscape viewer)
- `gdviz/schema/codebase_graph.schema.json` - Data structure validation

**Process**:
1. **Data Loading**: Fetch JSON from extraction phase
2. **Mode Selection**: Choose view mode (execution, data structures, modules)
3. **Graph Rendering**: Use Cytoscape.js with `cytoscape-elk` layered layout for deterministic snapshots; interactive updates trigger re-runs
4. **Interaction**: Zoom, pan, node selection, filtering, mode switching, and search
5. **Progressive Disclosure**: Show/hide details based on user exploration

## Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Python Source  │───▶│  AST Extraction  │───▶│  JSON Schema    │
│  Files (.py)    │    │  & Analysis      │    │  Validation     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                 │                        │
                                 ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Configuration  │───▶│  Relationship    │───▶│  codebase_graph │
│  (gdviz_conf)   │    │  Graph Building  │    │  .json          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  User Controls  │◀──▶│  Cytoscape Viewer│◀───│  HTTP Server    │
│  (View Modes)   │    │  (Vite + TS)     │    │  (JSON + logs)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Data Structures

### Node Structure
```javascript
{
  "id": "generate.py:build_pages",           // Unique identifier
  "label": "build_pages",                    // Display name
  "file": "generate.py",                     // Source file
  "line": 123,                              // Line number
  "module": "generate",                      // Python module
  "kind": "function",                        // Node type
  "tags": {                                 // Metadata
    "datastructures": ["Page", "Site"],
    "phase": "generate",
    "importance": "high"
  },
  "signature": "build_pages(site: Site) -> None",
  "doc": "Render all pages using Jinja templates."
}
```

### Edge Structure  
```javascript
{
  "source": "pipeline.build:run_build",      // Source node ID
  "target": "generate:build_pages",         // Target node ID
  "kind": "build_step",                     // Relationship type
  "conditions": ["not quick"],              // Execution conditions
  "order": 3                               // Sequence number
}
```

### View Modes Architecture

**Execution Flow Mode**:
- Filters edges to `build_step` and `bash_entry` types
- Applies condition-based filtering (flags: `quick`, `postflight`)
- Uses sequence numbers for step ordering
- Supports phase-based swimlane layout

**Data Structures Mode**:  
- Highlights nodes tagged with core types (`Page`, `Frontmatter`, `Site`)
- Dims unrelated functions to emphasize data flow
- Supports manual tagging via `# gdviz:` comments

**Module Dependencies Mode**:
- Hides function-level graph  
- Renders module-level import relationships
- Shows high-level architectural dependencies

## Extension Points

### 1. Extraction Customization

**File Pattern Configuration**:
```python
# gdviz_conf.py
EXCLUDE_FILE_GLOBS = ["tests/**", "venv/**"]
INCLUDE_FILES = ["core.py", "utils.py"]  # Override defaults
```

**Inline Function Tagging**:
```python
def critical_function():  # gdviz: importance=high datastructures=Page
    """Core processing logic."""
    pass
```

### 2. Viewer Customization

**Mode Extensions**: Add new view modes by extending TypeScript viewer logic
**Style Customization**: Adjust Cytoscape stylesheet and ELK options  
**Control Additions**: Add new filtering, depth controls, and exploration interactions

## Principles and Design Decisions

### Static Analysis First
- **Why**: No runtime dependencies, fast extraction, deterministic results
- **Trade-off**: May miss dynamic behavior, but provides reliable foundation
- **Future**: Runtime tracing can be layered on top

### Client-Side Rendering
- **Why**: Fast iteration on visualizations, no server-side dependencies
- **Trade-off**: Requires JSON data transfer, browser processing
- **Benefit**: Works with simple file server, easy deployment

### Progressive Disclosure
- **Why**: Large codebases overwhelm when shown completely
- **Implementation**: Start with core nodes, expand on user interaction
- **Controls**: Depth limits, importance filtering, mode switching

### Configuration Over Code
- **Why**: Different codebases need different inclusion patterns
- **Implementation**: External config file + inline hints
- **Extensibility**: Easy to add new tag types and importance levels

## Future Architecture Considerations

### Standalone Package Structure
```
gdviz/
├── cli/                    # Command-line interface
├── extractor/             # AST analysis and extraction  
├── viewer/                # Cytoscape visualization (Vite + TS)
├── server/                # Optional local HTTP server
└── config/                # Default configuration templates
```

### Runtime Tracing Integration
- **Execution Overlay**: Highlight actually-executed paths
- **Performance Data**: Node sizing by execution time or call count
- **Dynamic Discovery**: Find code paths missed by static analysis

### Multi-Language Support  
- **Plugin Architecture**: Language-specific extractors
- **Common Schema**: Unified JSON format across languages
- **Viewer Agnostic**: Cytoscape viewer works with any conforming data

This architecture provides a solid foundation for both current gdwebgen integration and future standalone development.