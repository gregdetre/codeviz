# Prism.js Syntax Highlighting Integration

## Overview

Prism.js is a lightweight, extensible syntax highlighter with 12+ years of stability (since 2012) and one of the largest communities in the syntax highlighting space. With ~10M weekly npm downloads and 12.7k GitHub stars, it provides production-ready syntax highlighting with minimal overhead.

## Why Prism.js for CodeViz

### Key Advantages
- **Tiny core**: 2KB minified & gzipped, with language definitions adding only 300-500 bytes each
- **Mature ecosystem**: 200+ language definitions, extensive plugin library
- **Custom token manipulation**: Essential for making function names clickable via Custom Class plugin and hooks
- **Battle-tested**: Used by MDN, React docs, and millions of websites
- **Synchronous highlighting**: Simpler integration with existing CodeViz architecture

### Trade-offs vs Alternatives
- **vs Shiki**: Prism is 7x faster but has slightly less accurate highlighting (Shiki uses VS Code's TextMate grammars)
- **vs Highlight.js**: Prism has better customization APIs for our clickable tokens requirement
- **Development status**: Prism v2 development appears stalled (last update 2023), but v1 remains stable and widely used

## Implementation Strategy

### Core Integration

```typescript
// Install
npm install prismjs @types/prismjs

// Basic usage in details-panel.ts
import Prism from 'prismjs';
import 'prismjs/components/prism-python'; // Load Python support
import 'prismjs/plugins/custom-class/prism-custom-class';

// Highlight code with custom classes for clickable functions
function highlightCode(code: string, language: string, callableNodes: Set<string>) {
  // Add custom classes to callable functions
  Prism.plugins.customClass.add(({content, type}) => {
    if (type === 'function' && callableNodes.has(content)) {
      return 'cv-callable-function';
    }
  });
  
  return Prism.highlight(code, Prism.languages[language], language);
}
```

### Making Functions Clickable

Leverage Prism's hooks system to add data attributes to function tokens:

```typescript
// Hook into token wrapping to add clickable attributes
Prism.hooks.add('wrap', function(env) {
  const nodeId = getNodeIdForFunction(env.content);
  if (nodeId && env.type === 'function') {
    env.attributes['data-node-id'] = nodeId;
    env.attributes['class'] = (env.attributes['class'] || '') + ' cv-clickable';
    env.attributes['role'] = 'button';
    env.attributes['tabindex'] = '0';
  }
});

// CSS for clickable styling
.cv-clickable {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
}

.cv-clickable:hover {
  text-decoration-style: solid;
  background: rgba(59, 130, 246, 0.1);
}
```

### Event Handling

```typescript
// Attach click handlers after highlighting
container.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('cv-clickable')) {
    const nodeId = target.dataset.nodeId;
    if (nodeId) {
      focusNode(nodeId); // Existing CodeViz function
    }
  }
});
```

## Key Plugins for CodeViz

### Custom Class Plugin
- **Purpose**: Add custom classes to specific tokens
- **Use case**: Mark callable functions, add semantic classes
- **API**: `Prism.plugins.customClass.add(callback)`

### Line Numbers Plugin (Optional)
- **Purpose**: Display line numbers alongside code
- **Integration**: Aligns with source file line numbers from Tree-sitter analysis

### Autolinker Plugin (Future)
- **Purpose**: Convert URLs and emails to clickable links
- **Use case**: Link documentation references in comments

## Performance Considerations

### Bundle Size Impact
- Core: 2KB gzipped
- Python language: ~0.5KB
- Custom Class plugin: ~0.3KB
- **Total overhead**: ~3KB for basic implementation

### Runtime Performance
- Synchronous highlighting (no async complexity)
- Processes ~1000 lines in <50ms
- No WASM dependencies (unlike Shiki)
- Works efficiently with existing lazy-loading pattern

## Integration Points

### 1. Details Panel Code Section
**File**: `ts/viewer/src/details-panel.ts`
- Replace plain text display with highlighted code
- Add click handlers for callable functions
- Maintain lazy-loading on section expand

### 2. Server API Enhancement
**File**: `ts/src/server/server.ts`
- `/api/source` endpoint returns callable function list alongside code
- Enables client-side highlighting with context

### 3. Graph Data Utilization
- Use existing Tree-sitter analysis to identify callable functions
- Map function names to node IDs for navigation

## Migration Path

### Phase 1: Basic Highlighting
1. Install Prism.js and Python language support
2. Replace plain text rendering with `Prism.highlight()`
3. Apply default Prism theme (or custom theme matching VS Code)

### Phase 2: Clickable Functions
1. Implement Custom Class plugin configuration
2. Add wrap hook for data attributes
3. Wire up click handlers to existing focus logic

### Phase 3: Enhanced Features
1. Add line numbers aligned with source
2. Implement copy-to-clipboard functionality
3. Consider server-side highlighting for large files

## Gotchas & Considerations

### Token Matching Challenges
- Function names in code may not exactly match node labels
- Need fuzzy matching or normalization strategy
- Consider qualified names (module.function) vs simple names

### Dynamic Loading
- Language definitions should be loaded on-demand
- Use dynamic imports to avoid bundling all languages:
  ```typescript
  await import(`prismjs/components/prism-${language}`);
  ```

### Theme Coordination
- Prism themes are CSS-based
- Need to coordinate with existing Cytoscape.js color scheme
- Consider VS Code theme alignment for consistency

### Security
- Prism outputs HTML strings requiring innerHTML
- Already using DOMPurify for markdown; apply same sanitization
- Alternatively, use Prism's token array API for safer rendering

## Alternative Approaches

### Server-Side Highlighting
For large files or consistent rendering:
```typescript
// Server: ts/src/server/server.ts
fastify.get('/api/highlighted-source', async (request, reply) => {
  const { file, language } = request.query;
  const code = await readFileSlice(file, start, end);
  const html = Prism.highlight(code, Prism.languages[language], language);
  return { html, callableFunctions };
});
```

### Custom Tokenizer
For advanced use cases, extend Prism's grammar:
```javascript
Prism.languages.pythonCustom = Prism.languages.extend('python', {
  'callable-function': /\b(?:function1|function2|function3)\b/
});
```

## Resources

### Official Documentation
- [Prism.js Official Site](https://prismjs.com/) - Core documentation and examples
- [Prism Plugins](https://prismjs.com/plugins/) - Plugin directory and usage
- [Extending Prism](https://prismjs.com/extending) - Custom language and plugin development

### Integration Examples
- [Custom Class Plugin Docs](https://prismjs.com/plugins/custom-class/) - Token customization
- [Prism Hooks List](https://gordonlesti.com/prism-hooks-list/) - Complete hooks reference
- [React + Prism Integration (2025)](https://medium.com/@malith_dilshan/customized-syntax-highlighter-for-react-using-prism-js-ce4d02659ceb)

### Community Resources
- [GitHub Issues](https://github.com/PrismJS/prism/issues) - Known issues and workarounds
- [NPM Package](https://www.npmjs.com/package/prismjs) - Version history and stats
- [Performance Comparison (2024)](https://andrewmedvedev.dev/blogs/comparing-highlights-syntax/) - Prism vs Shiki vs Highlight.js

## Conclusion

Prism.js offers the optimal balance of performance, customization, and community support for CodeViz's syntax highlighting needs. Its lightweight core, extensive plugin system, and mature ecosystem make it ideal for adding interactive, clickable syntax highlighting to code snippets while maintaining the project's performance standards.

*Last updated: September 2025*
*Research date: 12 September 2025*