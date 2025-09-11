# TypeScript vs Python for Code Analysis - September 11, 2025

---
Date: September 11, 2025
Duration: ~30 minutes
Type: Exploratory, Decision-making
Status: Active
Related Docs: TBD
---

## Context & Goals

User exploring whether the entire codeviz tool could be written in TypeScript instead of the current Python implementation, specifically questioning the feasibility of analyzing Python code from TypeScript. The question emerged from considering architectural consistency and potential benefits of a single-language stack.

## Key Background

Current codeviz architecture:
- **Python CLI**: Typer-based command structure for extraction and analysis
- **TypeScript Viewer**: Vite + Cytoscape.js web-based visualization
- **Mixed Stack**: Python for analysis, TypeScript for presentation
- **Working Status**: Extraction functional, viewer needs coordination fixes

User constraint: "codeviz is partly written in Python to better analyse Python code" - questioning if this assumption is still necessary with modern cross-language analysis tools.

## Main Discussion

### Static Analysis Capabilities in TypeScript

**Tree-sitter emerges as primary recommendation:**
- Fast, incremental parsing with pre-built Python grammar
- JavaScript/TypeScript bindings readily available
- Battle-tested by GitHub, Atom, and modern development tools
- Ideal for real-time analysis and large codebases

**ANTLR4 as robust alternative:**
- `lexanth/python-ast` library provides Python parsing for TypeScript using antlr4ts
- Comprehensive Python grammar support with visitor pattern API
- More established but potentially heavier than Tree-sitter

**Language Server Protocol (LSP) integration:**
- Interface with existing Python language servers (Pylsp, Pyright)
- Access rich semantic analysis without reimplementing type checking
- Standard protocol with wide ecosystem support

### Dynamic Analysis Approaches

**Hybrid subprocess approach recommended:**
- Shell out to Python with tracing/profiling flags, capture output
- Use Node.js `child_process` to run Python scripts with instrumentation
- Interface with existing Python tools: `trace`, `cProfile`, `sys.settrace()`

**Maintains Python tool ecosystem access while enabling TypeScript orchestration**

### Real-World Validation

**Existing TypeScript-based tools analyzing Python:**
- AST Explorer (astexplorer.net) - Web-based AST viewer supporting Python via Tree-sitter
- CodeQL - Cross-language analysis (C++/TypeScript core) analyzing Python
- Sourcegraph - TypeScript-based code intelligence platform with Python support

## Alternatives Considered

**Continue with Python-based analysis:**
- Pros: Direct AST access, rich ecosystem, semantic analysis capabilities
- Cons: Mixed technology stack, deployment complexity, web integration friction

**Full TypeScript rewrite:**
- Pros: Single language stack, better web integration, V8 performance, easier distribution
- Cons: Need to interface with Python tooling for dynamic analysis

**Language Server Protocol adoption:**
- Pros: Leverage existing analysis without reimplementation
- Cons: Additional complexity, dependency on external language servers

## Decisions Made

**TypeScript implementation is viable** with combination of:
1. **Tree-sitter for static analysis** - primary parsing and AST generation
2. **Subprocess execution for dynamic analysis** - interface with Python tooling
3. **LSP integration for semantic analysis** - leverage existing language intelligence

**Architecture recommendation:**
```typescript
class PythonAnalyzer {
  async parseAST(code: string): Promise<SyntaxNode>          // Tree-sitter
  async executeWithTracing(script: string): Promise<ExecutionTrace>  // subprocess
  async getSemanticInfo(uri: string): Promise<SemanticTokens>       // LSP
}
```

## Key Advantages Identified

**Technical benefits:**
- Web-native integration with Cytoscape.js viewer
- Rich npm ecosystem for parsing, analysis, visualization
- V8 optimization combined with Tree-sitter speed
- Single Node.js binary distribution vs Python dependency management

**Development benefits:**
- Single language stack maintainability
- Better integration between analysis and visualization layers
- Potentially superior performance for large codebases

## Open Questions

- Performance comparison: Tree-sitter + Node.js vs native Python AST
- Completeness of semantic analysis through LSP vs direct Python analysis
- Learning curve and development velocity considerations
- Long-term maintenance of cross-language analysis approach

## Implementation Considerations

**Capability coverage:** "90%+ of the capabilities of a Python-based tool" with Tree-sitter + subprocess approach

**Integration complexity:** Need to design clean interfaces between TypeScript orchestration and Python tooling execution

**Ecosystem dependency:** Reliance on maintaining Tree-sitter grammars and LSP compatibility

## Sources & References

**Tree-sitter Resources:**
- **Tree-sitter Documentation** (https://tree-sitter.github.io/) - Official parsing library documentation
- **py-tree-sitter** (https://github.com/tree-sitter/py-tree-sitter) - Python bindings reference
- **tree-sitter-typescript** (https://github.com/tree-sitter/tree-sitter-typescript) - TypeScript grammar implementation

**ANTLR Integration:**
- **lexanth/python-ast** (https://github.com/lexanth/python-ast) - Python parser for JavaScript/TypeScript
- **ANTLR4 Documentation** (https://www.antlr.org/) - Parser generator reference
- **antlr4ts** (https://github.com/tunnelvisionlabs/antlr4ts) - Optimized TypeScript target

**Cross-Language Analysis Examples:**
- **AST Explorer** (https://astexplorer.net/) - Web-based multi-language AST visualization
- **Static Analysis Tools List** (https://github.com/analysis-tools-dev/static-analysis) - Comprehensive tooling survey
- **Language Server Protocol** (https://langserver.org/) - Standard specification

**Commercial Tools:**
- **SonarQube** - Multi-language static analysis platform
- **CodeQL** - Cross-language security analysis
- **Sourcegraph** - TypeScript-based code intelligence

## Related Work

This conversation directly informs architectural decisions for the codeviz project and may result in:
- Prototype TypeScript-based Python analyzer
- Performance benchmarking between approaches  
- Updated architecture documentation
- Implementation roadmap for potential migration