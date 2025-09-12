# Tree-sitter Parsing Integration

Tree-sitter is an incremental parsing library that builds concrete syntax trees (CST) for source code and efficiently updates them as files are edited. CodeViz uses Tree-sitter for robust, language-agnostic parsing to extract code structure and dependencies.

## See Also

- `ts/src/analyzer/extract-python.ts` - Current Python extraction implementation using Tree-sitter
- `package.json` - Tree-sitter dependencies (v0.25.0+)
- `docs/reference/ARCHITECTURE.md` - System architecture overview including parser integration
- [Tree-sitter Official Documentation](https://tree-sitter.github.io/) - Comprehensive guide to Tree-sitter
- [Tree-sitter GitHub Repository](https://github.com/tree-sitter/tree-sitter) - Source code and issue tracking
- [Tree-sitter Python Grammar](https://github.com/tree-sitter/tree-sitter-python) - Python language parser we currently use
- [Tree-sitter TypeScript Grammar](https://github.com/tree-sitter/tree-sitter-typescript) - TypeScript/TSX parser for planned extension

## Principles and Key Decisions

- **Concrete Syntax Trees**: Tree-sitter generates CSTs that preserve all source details (whitespace, comments, formatting) rather than abstract syntax trees (ASTs), providing complete source fidelity
- **Incremental Parsing**: When source files change, Tree-sitter efficiently updates only the modified portions of the tree, enabling real-time parsing in editors
- **Error Recovery**: Tree-sitter continues parsing even with syntax errors, producing partial trees that remain useful for analysis
- **Language Agnostic**: The same parsing infrastructure works across all languages via grammar plugins
- **S-Expression Queries**: Pattern matching uses Lisp-like S-expressions for expressive, tree-based queries

## Core Concepts

### Concrete vs Abstract Syntax Trees

Tree-sitter produces **Concrete Syntax Trees (CST)** rather than Abstract Syntax Trees (AST):

- **CST Characteristics**:
  - Preserves all source text including whitespace, comments, parentheses
  - One-to-one mapping from grammar to tree structure
  - Larger than ASTs but provides complete source fidelity
  - Essential for tools needing exact formatting (formatters, linters)

- **AST Characteristics**:
  - Contains only semantic information
  - Removes syntactic sugar (parentheses, semicolons)
  - Smaller and faster to process
  - Better for compilers and semantic analysis

In CodeViz, we extract semantic information from the CST to build our graph structure, effectively converting CST nodes to AST-like representations for visualization.

### Incremental Parsing Algorithm

Tree-sitter's incremental parsing provides exceptional performance:

1. **Initial Parse**: Creates complete syntax tree on first file open
2. **Edit Detection**: Tracks byte ranges of edits in source text
3. **Tree Reuse**: Preserves unchanged subtrees from previous parse
4. **Targeted Updates**: Re-parses only modified regions
5. **Structure Sharing**: New tree internally shares nodes with old tree

Performance benchmarks show:
- 36x speedup over traditional parsers (Symflower's JavaParser migration)
- 4.5x faster than native Scala compiler parser
- Sub-millisecond updates for typical edits

### Error Recovery

Tree-sitter handles incomplete/invalid code gracefully:

```python
def incomplete_function(
    # Tree-sitter still produces valid tree structure
    # even with missing closing parenthesis and body
```

The parser:
- Identifies error boundaries precisely
- Continues parsing after errors
- Produces `ERROR` nodes in tree
- Maintains structural validity for rest of file

## Current Implementation in CodeViz

### Python Extraction Pipeline

Our Python analyzer (`ts/src/analyzer/extract-python.ts`) demonstrates Tree-sitter integration:

```typescript
// Parser initialization
const parser = new Parser();
parser.setLanguage(Python);

// Parse source file
const source = await readFile(filePath, "utf8");
const tree = parser.parse(source);

// Tree traversal
walk(tree.rootNode, (node) => {
  if (node.type === "function_definition") {
    // Extract function metadata
    const name = findIdentifier(node);
    const signature = extractFunctionSignature(node);
    const docstring = extractFunctionDocstring(node, source);
    // ... create graph node
  }
});
```

Key extraction features:
- **Function definitions**: Names, signatures, docstrings, line ranges
- **Import statements**: Module dependencies and aliases
- **Call expressions**: Function call relationships
- **Module structure**: File-to-module mapping

### Node Types We Process

```javascript
// Primary node types for Python
"function_definition"    // Functions and methods
"class_definition"       // Classes (planned)
"import_statement"       // import module
"import_from_statement"  // from module import item
"call"                   // Function calls
"assignment"            // Variable assignments (planned)
```

### Query Patterns (Future Enhancement)

Tree-sitter's S-expression query language enables powerful pattern matching:

```scheme
; Find all function definitions with decorators
(decorated_definition
  decorator: (decorator)
  definition: (function_definition
    name: (identifier) @function.name))

; Match specific call patterns
(call
  function: (attribute
    object: (identifier) @module
    attribute: (identifier) @method))
```

## Extending to TypeScript/JavaScript

### Installation Requirements

```bash
npm install tree-sitter-typescript tree-sitter-javascript
```

### Grammar Usage Pattern

```typescript
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";

// TypeScript files
const tsParser = new Parser();
tsParser.setLanguage(TypeScript.typescript);

// TSX files  
const tsxParser = new Parser();
tsxParser.setLanguage(TypeScript.tsx);

// JavaScript files
const jsParser = new Parser();
jsParser.setLanguage(JavaScript);
```

### Node Types for TypeScript

Key nodes to extract:
- `function_declaration` - Named functions
- `arrow_function` - Arrow function expressions
- `class_declaration` - Classes
- `method_definition` - Class methods
- `import_statement` - ES6 imports
- `export_statement` - Module exports
- `call_expression` - Function/method calls
- `type_alias_declaration` - Type definitions
- `interface_declaration` - Interface definitions

## Multi-Language Support Strategy

### Language Detection

```typescript
function getParserForFile(filePath: string): Parser {
  const ext = path.extname(filePath);
  const parser = new Parser();
  
  switch(ext) {
    case '.py':
      parser.setLanguage(Python);
      break;
    case '.ts':
    case '.tsx':
      parser.setLanguage(TypeScript.typescript);
      break;
    case '.js':
    case '.jsx':
      parser.setLanguage(JavaScript);
      break;
    // Add more languages as needed
  }
  
  return parser;
}
```

### Unified Graph Schema

Our JSON output format remains consistent across languages:

```json
{
  "nodes": [
    {
      "id": "module.function",
      "label": "function",
      "kind": "function",  // or "class", "method", "variable"
      "language": "python", // or "typescript", "javascript"
      "signature": "...",
      "file": "path/to/file.ext",
      "line": 42
    }
  ]
}
```

## Performance Characteristics

### Parsing Speed

Recent benchmarks (2024):
- **Initial parse**: ~91 lines/ms for large files
- **Incremental updates**: <1ms for typical edits
- **Memory efficiency**: Shared tree structures minimize allocation
- **Tree-sitter-haskell optimization**: 50x speedup achieved by fixing malloc bottlenecks

### Scalability

Tree-sitter handles:
- Files with 100,000+ lines efficiently
- Real-time parsing in editors
- Concurrent parsing of multiple files
- Memory-efficient tree sharing

### Comparison with Alternatives

| Parser Type | Speed | Memory | Error Recovery | Incremental |
|------------|-------|---------|----------------|-------------|
| Tree-sitter | Fast | Efficient | Excellent | Yes |
| Hand-written | Fastest | Variable | Good | Rare |
| ANTLR | Moderate | Heavy | Good | No |
| Regex-based | Fast | Light | Poor | No |

## Common Patterns and Best Practices

### Efficient Tree Walking

```typescript
// Avoid repeated traversals
const functionMap = new Map();
const importMap = new Map();

// Single traversal collecting all data
walk(tree.rootNode, (node) => {
  switch(node.type) {
    case "function_definition":
      functionMap.set(node.id, extractFunction(node));
      break;
    case "import_statement":
      importMap.set(node.id, extractImport(node));
      break;
  }
});
```

### Memory Management

```typescript
// Reuse parser instances
const parserCache = new Map<string, Parser>();

function getParser(language: string): Parser {
  if (!parserCache.has(language)) {
    const parser = new Parser();
    parser.setLanguage(getLanguage(language));
    parserCache.set(language, parser);
  }
  return parserCache.get(language)!;
}
```

### Error Handling

```typescript
try {
  const tree = parser.parse(source);
  
  if (tree.rootNode.hasError()) {
    console.warn(`Parse errors in ${filePath}`);
    // Still process partial tree
  }
  
  processTree(tree);
} catch (error) {
  console.error(`Failed to parse ${filePath}:`, error);
  // Return empty results rather than crashing
  return { nodes: [], edges: [] };
}
```

## Troubleshooting

### Common Issues

1. **Missing Language Support**
   - Error: `Cannot find module 'tree-sitter-language'`
   - Solution: Install specific language package

2. **Parser Version Mismatch**
   - Error: `ABI version mismatch`
   - Solution: Rebuild native modules after Tree-sitter update

3. **Large File Performance**
   - Symptom: Slow parsing on files >10MB
   - Solution: Consider chunking or limiting parse depth

4. **Memory Leaks**
   - Symptom: Growing memory usage
   - Solution: Ensure trees are properly released

### Debugging Techniques

```typescript
// Visualize tree structure
function printTree(node: any, indent = 0) {
  console.log(" ".repeat(indent) + node.type);
  for (let i = 0; i < node.childCount; i++) {
    printTree(node.child(i), indent + 2);
  }
}

// Query debugging
const query = parser.getLanguage().query(`
  (function_definition) @func
`);
const matches = query.matches(tree.rootNode);
console.log(`Found ${matches.length} functions`);
```

## Future Enhancements

### Planned Features

1. **TypeScript/JavaScript Support** (High Priority)
   - Implement `extract-typescript.ts` analyzer
   - Handle JSX/TSX syntax
   - Extract type information

2. **Advanced Query Integration**
   - Use S-expression queries for complex patterns
   - Support user-defined extraction rules
   - Enable custom node filters

3. **Incremental Analysis**
   - Cache parsed trees between runs
   - Update only changed files
   - Maintain dependency graph

4. **Additional Languages**
   - Rust (tree-sitter-rust)
   - Go (tree-sitter-go)
   - Java (tree-sitter-java)
   - C/C++ (tree-sitter-c, tree-sitter-cpp)

### Performance Optimizations

- Parallel file parsing with worker threads
- Streaming parse for very large files
- Lazy tree traversal for specific queries
- WebAssembly compilation for browser support

## Resources

### Documentation
- [Tree-sitter Documentation](https://tree-sitter.github.io/) - Official guide
- [Creating Parsers Guide](https://tree-sitter.github.io/tree-sitter/creating-parsers/) - Grammar development
- [Query Syntax Guide](https://tree-sitter.github.io/tree-sitter/using-parsers/queries/) - Pattern matching

### Community
- [Tree-sitter Discussions](https://github.com/tree-sitter/tree-sitter/discussions) - Q&A forum
- [Grammar Repository List](https://github.com/tree-sitter/tree-sitter/wiki/List-of-parsers) - Available language parsers
- [Tree-sitter Playground](https://tree-sitter.github.io/tree-sitter/playground) - Online parser testing

### Academic Papers
- [Tree-sitter: An Incremental Parsing System for Programming Tools](https://arxiv.org/abs/2308.12543) - Original paper
- [Error Recovery in LR Parsing](https://dl.acm.org/doi/10.1145/3426424) - Theoretical foundation

## Appendix: Tree-sitter Version History

### Recent Releases (2024-2025)
- **v0.25.1** (August 2025): Python bindings update
- **v0.25.0** (July 2025): Major API improvements
- **v0.24.0** (January 2025): Performance optimizations
- **v0.23.0** (August 2024): Query language enhancements

### CodeViz Compatibility
- Current: tree-sitter v0.25.0, tree-sitter-python v0.25.0
- Minimum: tree-sitter v0.20.0 for basic functionality
- Recommended: Latest stable for best performance

---

*Last updated: September 2025*