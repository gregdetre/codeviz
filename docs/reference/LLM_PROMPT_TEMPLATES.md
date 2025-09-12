# LLM Prompt Templates (Nunjucks + Zod pattern)

This project uses a templated system prompt rendered with Nunjucks, validated by TypeScript types and (optionally) Zod schemas for input contexts. The approach is adapted from our other project’s template system.

- Template engine: Nunjucks (`nunjucks` npm package)
- Template location: `ts/src/annotation/templates/`
- Rendering: The annotator command renders `annotate_system_prompt.njk` with inputs like `contextBudget`.
- Validation: Inputs passed to the template come from typed code. You can add a Zod schema if the context grows.

## Files
- `ts/src/annotation/templates/annotate_system_prompt.njk`: The system prompt used for the Claude project session. It encodes the schema summary, constraints, and task steps. It is rendered with a `contextBudget` variable and an embedded schema summary string.
- `ts/src/annotation/annotate-via-claude.ts`: Renders the template and shells out to `claude` with `--append-system-prompt` and `--add-dir` flags.

## Usage
- CLI exposes:
```
npm run annotate -- --config ./configs/demo_codebase.codeviz.toml --vocab closed --context-budget 100000
```
- The command:
  - Locates `codebase_graph.json` from the config’s output directory
  - Renders the system prompt
  - Executes the `claude` CLI in project mode with `--add-dir` for both the repo and the target directory
  - Parses JSON output and writes `llm_annotation.json` next to the graph

## Customization
- Edit the Nunjucks template to include additional instructions or policy.
- Extend the render context (and add Zod validation if desired) before rendering.
- Keep the output contract stable: the assistant must emit valid JSON only.
