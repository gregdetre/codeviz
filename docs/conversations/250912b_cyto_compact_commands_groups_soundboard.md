---
Date: 2025-09-12
Duration: ~15 min
Type: Decision-making
Status: Resolved
Related Docs:
- docs/reference/VIEWER_COMMANDS.md
- ts/src/server/assistant_prompt.txt
- ts/viewer/src/command-executor.ts
---

# Cytoscape-Compatible Compact Commands: Groups, Sets, and Traversals

## Context & Goals
We reviewed whether our compact JSON command interface remains aligned with standard Cytoscape.js semantics while adding support for operating on groups (folders, modules) and improving LLM ergonomics.

Key goals (from `VIEWER_COMMANDS.md`):
- "Prioritises the high-value low-risk/complexity features ..."
- "Provides almost all of the power of running Cytoscape.js commands. But in JSON, so it can be validated/secured."
- "Stay close to the real/standard Cytoscape.js interface ... so it'll be easy for the LLM chatbot to use."
- "Compact, i.e. doesn't waste tokens."

## Key Background
User asked: "Is this staying true to the original spirit, i.e. hewing close to the real/standard Cytoscape.js interface ... so that it'll be easy for LLMs to understand based on their pretraining?"

We confirmed yes, with small, intentional exceptions (named sets, path/degree ops). We discussed reducing custom surface (e.g. removing `group-highlight`) and expanding selection expressiveness while remaining Cytoscape-native.

## Main Discussion

### Adherence to Cytoscape semantics
- Keep selectors in `q` using Cytoscape syntax (no custom DSL).
- Map ops to core/collection methods; optional expand/collapse via standard extension.
- Represent groups as compound nodes with `type = 'module'|'folder'` and data (`path`, `depth`).

### Reduce custom surface area
- Decision: Drop `group-highlight` class and alias it to `highlighted` for backward compatibility.
- Retain `module-highlight` as a style hook; otherwise rely on `highlighted`/`faded`.

### Improve selection ergonomics (still standard)
- Add set refinement and incident edge ops while staying thin over Cytoscape collections:
  - `filterSet`: refine a named set using a selector.
  - `selectEdgesIncident`: edges touching a set of nodes.
- Extend `select` traversal relations to include: `ancestors|descendants|children|parent`.
- Add `nodesOnly` toggle to `selectPath`.
- Broaden selector examples to include `^=` and `$=` and pseudo-classes `:parent`, `:child`, `:leaf`, `:selected`.

### Security and boundedness
- Continue whitelisting classes and styles; cap set counts and traversal steps.

## Alternatives Considered
- Keep `group-highlight` (rejected): adds project-specific vocabulary; better to alias/remove.
- Add `$A & node[...]` set-refinement syntax (deferred): prefer explicit `filterSet` op to keep JSON schema simple and safe.

## Decisions Made
- Remove `group-highlight` class from allowlist; alias to `highlighted` in executor for BC.
- Add `filterSet`, `selectEdgesIncident` core ops.
- Extend `select` relations with compound traversal (`ancestors|descendants|children|parent`).
- Add `nodesOnly` option to `selectPath`.
- Update docs to v1.2 selectors and v2.2 ops; update assistant prompt to advertise capabilities and constraints.

## Next Steps
- Monitor LLM usage to validate that the reduced custom surface improves zero-shot command quality.
- Consider future additions: typed-edge traversal, more analytics (betweenness, components-by-index), subgraph layouts.

## Sources & References
- See `docs/reference/VIEWER_COMMANDS.md` for the compact command spec and examples.
- Executor implementation: `ts/viewer/src/command-executor.ts`.
- Assistant prompt: `ts/src/server/assistant_prompt.txt`.

## Related Work
- Grouping and compound nodes are implemented in `ts/viewer/src/elements.ts` and styled in `ts/viewer/src/style.ts`.


