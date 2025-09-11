# Word-Wrap Library Integration

TypeScript text wrapping utility with configurable delimiters, indentation, and formatting options for the CodeViz project.

## See also

- `word-wrap` npm package: https://www.npmjs.com/package/word-wrap - official package page with usage examples
- GitHub repository: https://github.com/jonschlinkert/word-wrap - source code and issue tracking
- `ts/package.json` - project dependencies where word-wrap should be added
- `ts/src/cli/index.ts` - CLI implementation where text formatting may be needed
- `FLOATING_UI_TOOLTIP_INTEGRATION.md` - Tooltip library that may need text wrapping for content
- `COMMAND_LINE_USAGE.md` - CLI documentation that covers text output scenarios
- CVE-2023-26115 advisory: https://github.com/advisories/GHSA-j8xg-fqg3-53r7 - security vulnerability details for versions < 1.2.4

## Library Overview

**word-wrap** is the most popular TypeScript-compatible text wrapping library with 46M+ weekly downloads and 1,947 dependent packages. It provides simple, configurable word wrapping with zero dependencies.

**Current Status**: Not yet integrated into CodeViz project
**Recommended Version**: 1.2.5+ (addresses CVE-2023-26115 ReDoS vulnerability)

## Key Features

- **Configurable width**: Set line length (default 50 characters)
- **Custom delimiters**: Control newline characters via `newline` option
- **Indentation support**: Add prefixes to each line via `indent` option  
- **Word breaking**: Force break long words with `cut` option
- **Whitespace control**: Trim trailing spaces with `trim` option
- **TypeScript support**: Includes built-in type definitions

## Installation & Setup

```bash
npm install word-wrap
```

No separate `@types` package needed - TypeScript definitions are included.

## Basic Usage

```typescript
import wrap from 'word-wrap';

// Basic wrapping
const wrapped = wrap('Long text that needs to be wrapped', {
  width: 60
});

// With custom indentation and delimiter
const formatted = wrap(text, {
  width: 80,
  indent: '  ', 
  newline: '\n\n'
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | number | 50 | Maximum line width in characters |
| `indent` | string | '  ' | String to prepend to each line |
| `newline` | string | '\n' | Line delimiter character(s) |
| `escape` | function | undefined | Custom line transformation function |
| `trim` | boolean | false | Remove trailing whitespace from lines |
| `cut` | boolean | false | Break words mid-character if longer than width |

## Security Considerations

**Critical**: Versions before 1.2.4 contain CVE-2023-26115, a Regular Expression Denial of Service (ReDoS) vulnerability.

- **Affected versions**: < 1.2.4
- **CVSS Score**: 5.3 (Moderate)  
- **Impact**: Excessive CPU consumption through inefficient regex
- **Mitigation**: Upgrade to version 1.2.4 or later

## Integration Patterns for CodeViz

### CLI Output Formatting
```typescript
// Format help text or command output
const formatCliOutput = (text: string, terminalWidth: number = 80) => {
  return wrap(text, {
    width: terminalWidth - 4, // Account for padding
    indent: '  ',
    trim: true
  });
};
```

### Documentation Generation
```typescript
// Format extracted code documentation
const formatDocString = (docText: string) => {
  return wrap(docText, {
    width: 72,
    indent: ' * ',
    newline: '\n',
    trim: true
  });
};
```

### Error Message Formatting
```typescript
// Format multi-line error messages
const formatError = (message: string) => {
  return wrap(message, {
    width: 60,
    indent: 'Error: ',
    cut: false // Don't break words mid-character
  });
};
```

## Performance Notes

- **Lightweight**: Zero dependencies, minimal overhead
- **Simple implementation**: Basic string processing, no complex algorithms
- **Memory efficient**: Processes text in-place without large buffers

## Common Gotchas

1. **Empty string handling**: Returns empty string for empty input (expected behavior)
2. **Unicode considerations**: Counts Unicode characters as single units, may not handle complex scripts perfectly
3. **Performance with large text**: No specific optimizations for very large strings
4. **Regex vulnerability**: Ensure version >= 1.2.4 to avoid ReDoS issues

## Limitations

- **Basic text wrapping only**: No advanced typography features like hyphenation or justification
- **Character-based width**: Uses character count, not pixel width for proportional fonts
- **No language-aware breaking**: Doesn't consider language-specific word break rules
- **Simple regex processing**: May not handle all edge cases with complex text patterns

## Testing Integration

When adding word-wrap to tests:

```typescript
describe('text formatting', () => {
  test('wraps long lines correctly', () => {
    const input = 'Very long text that should be wrapped';
    const result = wrap(input, { width: 10 });
    expect(result.split('\n')).toHaveLength(4);
  });
  
  test('respects indentation', () => {
    const result = wrap('test text', { indent: '>> ' });
    expect(result).toMatch(/^>> /);
  });
});
```

## Migration from Other Libraries

If migrating from similar libraries:

- **From wordwrap**: API is similar, but check delimiter option names
- **From other wrappers**: word-wrap uses simpler configuration object
- **Performance**: Generally faster than more feature-rich alternatives

## Future Considerations

- **Alternative libraries**: Consider `@universal-packages/text-wrap` for more advanced features if needed
- **Font-aware wrapping**: Use `word-wrappr` if pixel-based width calculation becomes necessary
- **Large text processing**: Monitor performance for very large codebases and consider alternatives if needed