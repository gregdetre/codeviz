# Type-Safe TOML Configuration Options - September 11, 2025

---
Date: September 11, 2025
Duration: ~30 minutes
Type: Decision-making, Exploratory
Status: Active
Related Docs: ts/src/config/loadConfig.ts
---

## Context & Goals

Greg wanted to explore options for setting up a global .toml config file while maintaining type safety. The conversation emerged from wanting "the clean, human-readable, limited-functionality, and simplicity of .toml, PLUS type-safety somehow."

## Key Background

**Current Implementation Context:**
- CodeViz already uses per-target TOML configs (e.g., `demo_codebase.codeviz.toml`) 
- Current config loader in `ts/src/config/loadConfig.ts` uses basic TOML parsing with TypeScript types but no runtime validation
- Zod is already installed as a dependency in the project
- Looking to add global configuration capabilities

**User Requirements:**
> "I want to set up a global .toml config file. I also considered making it .ts - the main advantage of that is type-safety. Any suggestions on how to get the best of both worlds, i.e. the clean, human-readable, limited-functionality, and simplicity of .toml, PLUS type-safety somehow...?"

## Main Discussion

### Research Findings

**Zod + TOML Integration:**
- Zod is a TypeScript-first validation library that bridges the gap between compile-time and runtime type safety
- Current approach in 2024: use Zod schemas to validate parsed TOML data at runtime
- Libraries like `zod-config` exist for configuration management but focus on JSON/env vars
- No direct TOML integration found, but pattern is straightforward: TOML → parse → Zod validate

**Key Technical Insight:**
The standard pattern is: TOML file → `@iarna/toml` parser → JavaScript object → Zod schema validation → type-safe result

### Four Options Explored

**Option 1: Zod Schema Validation (Recommended)**
- Define Zod schema once, get both validation and TypeScript types automatically
- Runtime validation catches invalid configs early
- Uses existing Zod dependency
- Trade-off: Schema definition is more verbose than plain TypeScript types

**Option 2: TypeScript + JSON Schema Generation**
- Generate JSON Schema from TypeScript types at build time
- Validate TOML against generated schema at runtime
- Trade-off: Build complexity, two sources of truth

**Option 3: TOML with TypeScript Declaration Files**
- Create `.d.ts` files declaring expected structure
- Pure TOML files with type hints
- Trade-off: No runtime validation, complex build setup

**Option 4: Hybrid Config Builder Pattern**
- Builder pattern with runtime validation
- Type-safe fluent API
- Trade-off: More complex API, less direct TOML usage

## User Clarification

Greg asked for clarification on Option 1: 
> "Let me make sure I understand Option 1. You're saying we use .toml, but also define a Zod schema (that we manually update to keep in sync), and then when we import the config we run it through the Zod schema?"

**Confirmed Understanding:**
1. Write TOML config (human-readable)
2. Define Zod schema once (in TypeScript) 
3. Load with validation: TOML → parse → Zod validate → type-safe result
4. Manual sync required between TOML structure and Zod schema
5. Single source of truth: Zod schema defines both validation rules AND TypeScript types

## Alternatives Considered

**Zod vs Alternatives:**
- **Zod**: TypeScript-first, excellent error messages, type inference, already in dependencies
- **Ajv + JSON Schema**: More mature ecosystem but less TypeScript-native
- **Pure TypeScript**: Compile-time only, no runtime validation
- **Custom validation**: Reinventing the wheel

**TOML vs Other Formats:**
- **TOML**: Human-readable, simple syntax, limited functionality (desired)
- **JSON**: Less readable, no comments
- **YAML**: More complex, indentation-sensitive
- **TypeScript**: Full type safety but less accessible to non-developers

## Decision Made

**Recommended Approach: Option 1 (Zod Schema Validation)**

**Rationale:**
- Already have Zod dependency
- Single source of truth for validation and types
- Excellent developer experience with error messages
- Runtime safety catches config errors early
- Composable and extensible for different config sections

**Key Trade-off Accepted:**
> "The trade-off is: you write the schema definition once (slightly verbose), but get both runtime validation and compile-time types automatically."

**User's Understanding Confirmed:**
The workflow is clear: manually maintain Zod schema as config structure evolves, get automatic type inference and runtime validation in return.

## Open Questions

1. **Global vs Per-Target Config Merge Strategy**: How should global configs interact with existing per-target `.codeviz.toml` files?

2. **Config Location**: Where should the global config file be located? (`~/.codeviz/global.toml`, `./global.codeviz.toml`, etc.)

3. **Schema Evolution**: How to handle schema versioning and migration as config structure changes?

4. **Validation Error UX**: How should validation errors be presented to users?

## Next Steps

**Immediate:**
- Implement Zod-based global config system extending existing `loadConfig.ts`
- Define global config schema structure
- Determine config file location and naming convention

**Future Considerations:**
- Config merging strategy (global + per-target)
- Migration path for existing configs
- Documentation for config schema

## Sources & References

**External Research:**
- **Zod Documentation** (https://zod.dev/) - TypeScript-first schema validation library
- **@iarna/toml Package** (https://www.npmjs.com/package/@iarna/toml) - TOML parser for Node.js
- **zod-config Library** (mentioned in search results) - Configuration management with Zod
- **LogRocket Blog: Schema validation in TypeScript with Zod** - 2024 best practices
- **Various Medium articles** - Recent Zod usage patterns and examples

**Internal References:**
- `ts/src/config/loadConfig.ts` - Current TOML config implementation
- `package.json` - Confirms Zod v3.23.8 already installed
- Various `.codeviz.toml` files - Current per-target config examples

**Code Patterns Discussed:**
```typescript
// Schema definition with defaults and validation
const GlobalConfigSchema = z.object({
  defaults: z.object({
    analyzer: z.object({
      exclude: z.array(z.string()).default([]),
      excludeModules: z.array(z.string()).default([])
    }).default({})
  }).default({})
});

// Type inference and validation
type GlobalConfig = z.infer<typeof GlobalConfigSchema>;
const config = GlobalConfigSchema.parse(parsedToml);
```

## Related Work

**Potential Implementation:**
- Extension of existing `loadConfig.ts` with Zod validation
- New global config loader function
- Schema definition for global configuration structure
- Integration with existing per-target config system