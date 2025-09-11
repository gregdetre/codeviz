# Chalk Usage Guide

Terminal string styling implementation using the chalk library for CodeViz CLI commands.

## See also

- `VISUAL_DESIGN_STYLING.md` - Overall visual design components and UI/UX patterns
- `ts/src/cli/index.ts:8` - Current chalk integration and usage examples
- [Chalk documentation](https://github.com/chalk/chalk) - Official API reference and examples

## Current Implementation

### Version Selection
**Using Chalk 5.x (ESM)** - CodeViz imports chalk as ES modules with TypeScript support
```typescript
import chalk from "chalk";
console.log(chalk.green("Success message"));
```

## Key Gotchas & Pitfalls

### ESM vs CommonJS Compatibility
**Critical Issue**: Chalk 5+ is ESM-only and breaks CommonJS projects

**Problem**: `Error [ERR_REQUIRE_ESM]: require() of ES Module`
- Occurs when using `require("chalk")` with Chalk 5+
- TypeScript projects may encounter build errors with Chalk 5

**Solutions**:
- **Current approach**: Use ESM imports (`import chalk from "chalk"`)
- **Fallback**: Downgrade to chalk@4.1.2 for CommonJS compatibility
- **Workaround**: Dynamic imports for mixed environments

### Security Considerations  
**Recent incident**: Chalk 5.6.1 was compromised (Sep 2025) with malicious wallet-hijacking code
- **Safe version**: Use 5.6.2+ only
- **Monitoring**: Check for supply chain attacks in dependencies

## API Changes (v4 → v5)

### Removed Methods
- `.keyword()`, `.hsl()`, `.hsv()`, `.hwb()`, `.ansi()` - use color-convert package instead
- Template literals moved to separate `chalk-template` package

### Moved Exports
- `chalk.Instance` → `Chalk` (named export)
- `chalk.supportsColor` → `supportsColor` (named export)

## Usage Patterns

### Success/Info/Warning Pattern
```typescript
// Current CodeViz implementation
console.log(chalk.green(`[${timestamp}] Success operation`));
console.log(chalk.blue(`Info: ${details}`));
console.log(chalk.cyan(`URL: ${browserUrl}`));
```

### Error Handling
```typescript
// For future error states
console.log(chalk.red(`Error: ${errorMessage}`));
console.log(chalk.yellow(`Warning: ${warningMessage}`));
```

## Migration Strategy

### Current State
- CodeViz uses Chalk 5.x with ESM imports
- TypeScript build pipeline handles ESM compatibility
- No CommonJS requirements in current architecture

### If Issues Arise
1. **Build errors**: Consider chalk@4.1.2 downgrade
2. **Mixed module types**: Evaluate project ESM migration
3. **Performance needs**: Chalk 5 offers 50% smaller install size

## Best Practices

### Color Consistency
- Green: Success states, completion messages
- Blue: Informational output, file references  
- Cyan: URLs, interactive elements
- Red: Errors, failures (future implementation)
- Yellow: Warnings, cautions (future implementation)

### Terminal Compatibility
- Chalk automatically detects color support
- Fallback to no-color on unsupported terminals
- Respects NO_COLOR environment variable