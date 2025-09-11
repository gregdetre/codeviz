---
Date: 2025-09-11
Duration: ~15 min
Type: Decision-making
Status: Active
Related Docs: docs/reference/VIEWER_COMMANDS.md, docs/reference/libraries/cyto/NODE_GROUPING.md, docs/reference/LAYOUT.md
---

# Folder Grouping & Expand/Collapse – Conversation

## Context & Goals
We currently group functions by module (file). We want to introduce grouping by folders (nested) in the viewer, with sensible defaults for expand/collapse. Longer-term, grouping should be user-configurable.

## Key Background (quotes)
- "Right now, we group functions by module (i.e. file)."
- "Perhaps the next step would be to group the files by folders (and indeed nest by subfolders)."
- "Ultimately I want to allow the user to customise the grouping … checkboxes like `file`, `folder`."
- "Also, what do you think about renaming `module` throughout the code to `file`?" → Decision: ignore for now.
- "It would be good to be able to expand/collapse groups … auto-collapsing deeper than 2 levels."
- On edge aggregation: "Hmmm, not sure. Perhaps it should depend on whether the group is expanded or collapsed?"

## Decisions Made
- Implement nested folder grouping (Folder → Subfolder → File → Function) using Cytoscape compound nodes. fCoSE/ELK support this well.
- Add left-pane UI toggle: "Group folders" (enabled by default for now).
- Default behavior: auto-collapse groups deeper than 2 levels. Provide expand/collapse controls (plugin-backed), with room to refine later.
- Defer schema/UI rename of "module" → "file" to a later pass to avoid breaking compatibility.

## Implementation Notes
- Viewer-only implementation: build virtual folder compound nodes from `GraphNode.file` path segments; parent `module:` nodes under the deepest folder.
- Keep existing function-level edges; skip aggregated (bundled) edges for now. Revisit aggregation later, potentially dependent on collapsed state.
- Integrate `cytoscape-expand-collapse` for expand/collapse, initialize in the viewer, and programmatically collapse folders with depth > 2 at load.
- Preserve existing layout workflow: seed with ELK (if hybrid), then refine with fCoSE; expand/collapse uses `layoutBy` to reflow.

## Open Questions
1. Edge aggregation policy: When a folder (or file) is collapsed, do we draw aggregated edges between parents (files/folders) or only show function-level edges? Initial answer: TBD; likely aggregated when collapsed, detailed when expanded.
2. Default "Group folders" state: On by default now; keep or make sticky per project?
3. Folder depth control: Add a slider or preset (e.g., collapse >2, >3)?

## Next Steps
- Implement nested folder grouping and UI toggle.
- Initialize expand/collapse plugin; collapse depth > 2 on load.
- Smoke-test on `demo_codebase/` and real projects.

## Sources & References
- See `docs/reference/libraries/cyto/NODE_GROUPING.md` and `docs/reference/libraries/cyto/EXTENSIONS.md` for compound and expand/collapse patterns.
- Layout approach: `docs/reference/LAYOUT.md`, `docs/reference/libraries/cyto/HYBRID_LAYOUTS.md`.


