# CodeViz Core Data Structures

Core data structures and relationships for codebase analysis and visualization.

## See also

- `JSON_FILE_FORMAT.md` - JSON schema and output format specification
- `ts/src/config/loadConfig.ts` - Configuration data structures
- `ts/src/analyzer/extract-python.ts` - Analysis data structures and algorithms
- `ts/src/server/server.ts` - Server routing and data serving
- `schema/codebase_graph.schema.json` - JSON Schema validation rules

## Introduction

CodeViz represents codebases as directed graphs with typed nodes and edges. This document describes the core data structures used throughout the analysis pipeline, from tree-sitter parsing to graph visualization.

## Configuration Structures

### CodevizConfig

Per-target configuration loaded from `.codeviz.toml` files.

```typescript
type CodevizConfig = {
  analyzer?: { exclude?: string[] };
  output?: { path?: string };
  viewer?: { layout?: string };
};
```

**Properties:**
- **analyzer.exclude**: File patterns to exclude from analysis (glob patterns)
- **output.path**: Custom output file path (default: `out/codebase_graph.json`)
- **viewer.layout**: Default layout algorithm for visualization

**Usage:**
- Resolved automatically based on target directory name
- Example: `demo_codebase.codeviz.toml` for analyzing `demo_codebase/`
- Fallback to empty config if file not found

## Graph Data Structures

### Node

Represents a code entity (function, class, variable, etc.).

```typescript
type GraphNode = {
  id: string;           // Unique identifier (module.entity_name)
  label: string;        // Display name
  file: string;         // Relative file path
  line: number | null;  // Line number (1-indexed)
  module: string;       // Module/package name
  kind: string;         // Entity type (function, class, variable)
  tags: Record<string, string[]>; // Metadata key-value pairs
  signature: string | null;       // Function/method signature
  doc: string | null;            // Documentation string
};
```

**Key Relationships:**
- Grouped by module for compound visualization
- Referenced by edges as source/target entities
- File paths relative to analysis target directory

### Edge

Represents relationships between code entities.

```typescript
type GraphEdge = {
  source: string;       // Source node ID
  target: string;       // Target node ID
  kind: EdgeKind;       // Relationship type
  conditions: string[]; // Optional conditions
  order: number | null; // Sequence order
};

type EdgeKind = "calls" | "bash_entry" | "build_step" | "runtime_call";
```

**Edge Types:**
- **calls**: Function/method invocation (most common)
- **bash_entry**: Shell script execution entry point
- **build_step**: Build process step dependency
- **runtime_call**: Dynamic/runtime call relationship

### Group

Represents module/package hierarchy for compound node visualization.

```typescript
type GraphGroup = {
  id: string;       // Group identifier (module name)
  kind: "module";   // Group type (currently only modules)
  children: string[]; // Node IDs belonging to this group
};
```

**Usage:**
- Creates compound nodes in Cytoscape.js visualization
- Enables collapsing/expanding module views
- One group per module containing all functions/classes in that module

### Module Import

Represents import dependencies between modules.

```typescript
type ModuleImport = {
  source: string; // Importing module
  target: string; // Imported module  
  weight: number; // Import frequency/strength (minimum 1)
};
```

**Characteristics:**
- Module-level relationships (not entity-level)
- Weight indicates import frequency or strength
- Enables module dependency visualization

## Analysis Pipeline Data Structures

### Tree-sitter Integration

Internal structures for AST analysis:

```typescript
// Tree-sitter node traversal state
type AnalysisState = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groupsMap: Map<string, string[]>;
  moduleImports: Map<string, Map<string, number>>;
  currentFuncId: string | null;
};
```

### Parser Output Processing

```typescript
// Extract options and control
type ExtractOptions = {
  targetDir: string;  // Directory to analyze
  outPath: string;    // Output JSON file path
  verbose?: boolean;  // Enable verbose logging
};

// File collection state
type FileCollector = {
  files: string[];    // Python files to analyze
  excludePatterns: string[]; // Patterns to skip
};
```

## Data Flow and Relationships

### Analysis Pipeline

1. **Configuration Loading**
   - Load `.codeviz.toml` → `CodevizConfig`
   - Apply exclusion patterns and output settings

2. **File Discovery**
   - Recursively scan target directory
   - Filter Python files, apply exclusions
   - Build file list for parsing

3. **AST Analysis** 
   - Parse each file with tree-sitter
   - Extract functions → `GraphNode[]`
   - Detect calls → `GraphEdge[]`
   - Track imports → `ModuleImport[]`

4. **Graph Construction**
   - Group nodes by module → `GraphGroup[]`
   - Aggregate import relationships
   - Build complete graph structure

5. **Output Generation**
   - Serialize to JSON format
   - Validate against schema
   - Write to configured output path

### Key Invariants

**Node Uniqueness:**
- Node IDs must be unique across the entire graph
- Format: `{module}.{entity_name}` ensures uniqueness
- Module groups contain only their own nodes

**Reference Integrity:**
- Edge source/target must reference existing node IDs
- Group children must reference existing node IDs
- Module imports reference module names (not full node IDs)

**Path Consistency:**
- All file paths relative to analysis target directory
- Unix-style path separators in output (forward slashes)
- Module names derived from file paths consistently

## Memory and Performance Considerations

### Large Codebase Handling

**Memory Usage:**
- Nodes: ~200 bytes per function (estimated)
- Edges: ~100 bytes per call relationship
- Large codebases may generate 10K+ nodes, 50K+ edges

**Performance Patterns:**
- Use Maps for O(1) lookups during analysis
- Stream JSON output for very large graphs
- Consider pagination in viewer for 1000+ nodes

### Optimization Strategies

**Analysis Phase:**
- Exclude test files and documentation by default
- Skip binary files and generated code
- Cache parsed ASTs for incremental analysis

**Output Phase:**
- JSON streaming for large outputs
- Compression for storage and transfer
- Client-side filtering in viewer

## Extension Points

### Adding New Languages

To support additional languages (TypeScript, Java, etc.):

1. **Add tree-sitter parser** for the language
2. **Implement language-specific extractor** following Python pattern
3. **Update node kinds** for language-specific entities
4. **Add edge types** for language-specific relationships

### Custom Analysis

**Node Metadata:**
- Use `tags` object for custom metadata
- Add language-specific properties
- Preserve existing schema structure

**Edge Relationships:**
- Define new `EdgeKind` values
- Document relationship semantics
- Update schema validation

**Viewer Integration:**
- Custom node styling based on metadata
- Filter by custom edge types
- Language-specific layout algorithms

## Implementation Notes

### Type Safety

The TypeScript implementation ensures type safety through:
- Explicit type definitions for all data structures
- Schema validation at runtime
- Consistent serialization/deserialization

### Error Handling

Common error scenarios and handling:
- **Missing files**: Skip gracefully, log warning
- **Parse errors**: Log error, continue with other files  
- **Invalid references**: Filter out broken edges
- **Schema violations**: Fail fast with clear error messages

### Testing Strategy

Data structure testing focuses on:
- **Graph construction**: Verify nodes, edges, groups created correctly
- **Reference integrity**: All edge targets exist as nodes
- **Schema compliance**: Output validates against JSON schema
- **Round-trip**: Parse output and reconstruct graph structure