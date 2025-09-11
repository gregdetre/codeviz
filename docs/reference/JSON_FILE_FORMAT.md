# CodeViz JSON File Format

Schema specification and examples for the codebase graph JSON output format.

## See also

- `schema/codebase_graph.schema.json` - JSON Schema specification
- `demo_output.json` - Example output from demo codebase analysis
- `ts/src/analyzer/extract-python.ts` - TypeScript implementation producing this format
- `DATA_STRUCTURES.md` - Core data structures and relationships

## Introduction

CodeViz outputs codebase analysis results as JSON files conforming to a stable schema. This format represents code structure as a graph with nodes (functions, classes, variables), edges (calls, imports), and module groupings.

## Schema Overview

The JSON file follows JSON Schema Draft 2020-12 with the following top-level structure:

```json
{
  "version": 1,
  "schemaVersion": "1.0.0", 
  "id_prefix": "",
  "defaultMode": "exec",
  "nodes": [...],
  "edges": [...],
  "groups": [...],
  "moduleImports": [...]
}
```

## Top-Level Properties

### Metadata Fields

- **version** (integer, required): Graph format version (currently 1)
- **schemaVersion** (string): Schema version identifier ("1.0.0")
- **id_prefix** (string): Optional prefix for all node IDs
- **defaultMode** (string): Default viewer mode ("default", "exec", "modules", "datastruct")

### Core Data Arrays

- **nodes**: Array of code entities (functions, classes, variables)
- **edges**: Array of relationships (function calls, references)
- **groups**: Array of module/package groupings
- **moduleImports**: Array of module-to-module import relationships
  
Additional file written alongside the graph (optional): `llm_annotation.json` which contains per-node tag annotations produced by an LLM. This is stored separately for cost/performance reasons and is not required for the viewer to function.

## Nodes Array

Represents code entities like functions, classes, and variables.

### Node Schema

```json
{
  "id": "string (required)",
  "label": "string (required)", 
  "file": "string (required)",
  "line": "integer|null",
  "endLine": "integer|null",
  "loc": "integer|null",
  "module": "string (required)",
  "kind": "string (default: 'function')",
  "tags": "object",
  "signature": "string|null",
  "doc": "string|null"
}
```

### Node Properties

- **id**: Unique identifier (format: `module.entity_name`)
- **label**: Display name for the entity
- **file**: Relative path to source file
- **line**: Line number where entity is defined (1-indexed)
- **module**: Module/package name containing this entity
- **kind**: Entity type ("function", "class", "variable", etc.)
- **tags**: Key-value metadata (values are string arrays)
- **signature**: Function/method signature with types
- **doc**: Documentation string/comment

### Node Examples

```json
{
  "id": "recipe.create_recipe",
  "label": "create_recipe", 
  "file": "demo_codebase/recipe.py",
  "line": 18,
  "module": "recipe",
  "kind": "function",
  "tags": {},
  "signature": "create_recipe(name: str, prep_time: int) -> Recipe",
  "doc": null
}
```

## Edges Array

Represents relationships between code entities.

### Edge Schema

```json
{
  "source": "string (required)",
  "target": "string (required)", 
  "kind": "string (required)",
  "conditions": "string[]",
  "order": "integer|null"
}
```

### Edge Properties

- **source**: ID of the calling/referencing entity
- **target**: ID of the called/referenced entity  
- **kind**: Relationship type ("calls", "bash_entry", "build_step", "runtime_call")
- **conditions**: Optional conditions under which relationship occurs
- **order**: Optional sequence number for ordered relationships

### Edge Examples

```json
{
  "source": "main.build_pancake_recipe",
  "target": "recipe.create_recipe", 
  "kind": "calls",
  "conditions": [],
  "order": null
}
```

## Groups Array

Represents module/package hierarchies for compound node visualization.

### Group Schema

```json
{
  "id": "string (required)",
  "kind": "string (required)",
  "children": "string[] (required)"
}
```

### Group Properties

- **id**: Unique group identifier (typically module name)
- **kind**: Group type (currently only "module")
- **children**: Array of node IDs belonging to this group

### Group Examples

```json
{
  "id": "recipe",
  "kind": "module",
  "children": [
    "recipe.create_recipe",
    "recipe.add_ingredient", 
    "recipe.add_instruction",
    "recipe.get_total_ingredients_count"
  ]
}
```

## Module Imports Array

Represents import dependencies between modules.

### Module Import Schema

```json
{
  "source": "string (required)",
  "target": "string (required)",
  "weight": "integer (required)"
}
```

### Module Import Properties

- **source**: Module that imports
- **target**: Module being imported
- **weight**: Import strength/frequency (minimum 1)

### Module Import Examples

```json
{
  "source": "main",
  "target": "recipe", 
  "weight": 1
},
{
  "source": "shopping",
  "target": "typing",
  "weight": 1
}
```

## Common Patterns

### ID Convention

Node and group IDs follow the pattern `module.entity_name`:
- `main.build_pancake_recipe` - function in main module
- `recipe.Recipe` - class in recipe module
- `shopping` - module itself (for groups)

### File Paths

File paths are relative to the analysis target directory:
- `demo_codebase/main.py`
- `src/utils/helpers.py`

### Module Names

Module names derived from file paths:
- `demo_codebase/main.py` → `main`
- `src/utils/helpers.py` → `utils.helpers`

### Cross-References

Edges and moduleImports create cross-references between:
- Functions calling other functions (within/across modules)
- Modules importing other modules
- References to classes, variables, etc.

## Validation

The format includes JSON Schema validation at `schema/codebase_graph.schema.json`. Key validation rules:

- Required fields must be present
- IDs must be unique within their arrays  
- Edge source/target must reference existing node IDs
- Group children must reference existing node IDs
- Enum values must match allowed options

## Version Compatibility

- **version: 1** - Current format version
- **schemaVersion: "1.0.0"** - Schema specification version

Breaking changes increment the version number. The TypeScript implementation maintains backward compatibility when possible.

## Implementation Notes

### Tree-sitter Analysis

The TypeScript analyzer uses tree-sitter to extract:
- Function definitions → nodes with "function" kind
- Class definitions → nodes with "class" kind  
- Function calls → edges with "calls" kind
- Import statements → moduleImports entries

### Limitations

Current analysis limitations:
- Static analysis only (no runtime information)
- Intra-file call detection primarily
- Limited cross-module call resolution
- Python-specific extraction (TypeScript/JavaScript planned)

### Performance Considerations

Large codebases may produce large JSON files:
- Consider pagination for viewer loading
- Use streaming JSON parsing for large files
- Filter edges/nodes based on viewer requirements