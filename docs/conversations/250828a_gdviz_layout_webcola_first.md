# gdviz Execution Flow Layout – WebCola-first – 2025-08-28

---
Date: 2025-08-28
Duration: ~30m
Type: Decision-making, Research Review
Status: Active
Related Docs: `gdviz/README.md`, `gdviz/docs/reference/README.md`
---

## Context & Goals
Investigate why Execution Flow layout feels "broken" (swimlanes not respected, misalignment), decide on a layout engine/approach that supports strict group containment, alignment, and compound nodes with collapse/expand.

## Key Background
Quotes from the user:

> "The arrangement & positioning for Execution Mode just seems broken. The swimlanes sort of display as grey rectangles, but nothing sits within them or aligns properly."

> "More generally, my intention going forwards is that a lot of the functionality will depend on: Putting nodes inside rectangle-groups; being able to sometimes treat those rectangle-groups as a single entity (move/collapse)."

> "The swimlanes are just one example of a kind of grouping, and I think the idea is that they should be strict."

> "I'm not sure what the default grouping interface should be. File seems like a natural one... I would love to be able to nest them, but if that's really difficult, we can defer that till later."

> "Dragging to move things around is a nice-to-have. The collapse/expand to de-clutter is probably more important."

> "Let's try WebCola first, and ignore ELK for now. Start simple; worry about scaling later (hundreds of nodes possible, not thousands)."

## Main Discussion

### Why lanes feel broken now
- Force simulation is unconstrained; swimlane rectangles are decorative, not enforced. Nodes aren’t constrained to lane bands, so they drift.
- No concept of compound/group nodes in the sim, so children aren’t contained by group bounds; groups can’t be moved or collapsed coherently.

### What we need
- Strict containment: nodes must remain inside their lane/group rectangle.
- Alignment: ability to align nodes along shared x/y within lanes or guidelines.
- Compound grouping: treat groups as first-class (drag/translate as a unit, and allow collapse→proxy node→expand).

### Libraries discussed
- WebCola: constraint-based; supports alignment constraints, non-overlap, and hierarchical groups (compound nodes). Integrates with D3 rendering.
- ELK.js: deterministic layered DAG layout (great for minimal crossings), but deprioritized for now in favor of interactivity.
- Cytoscape.js (+ cola extension): turnkey compounds/collapse; heavier stack and would diverge from current D3 viewer.

### Interactivity priorities
- Emphasis on collapse/expand to manage clutter.
- Dragging nice-to-have; not required for v1.

## Alternatives Considered
- D3-only with soft constraints (forceX/forceY, clamping, collide): quick to prototype but not truly strict containment; higher jitter risk.
- Cytoscape.js with `cytoscape.js-cola`: robust compounds and interactions; would shift away from custom D3 viewer.
- ELK.js layered mode: ideal for crisp execution-flow diagrams; deferred per decision to focus on WebCola first.

## Decisions Made
- Use WebCola as the primary layout engine for Execution Flow (interactive mode).
- Model swimlanes as strict top-level groups; nodes must stay within lane bounds.
- Default grouping by file; add nesting later (e.g., directory→file) as needed.
- Prioritize collapse/expand of groups over node/group dragging.
- Ignore ELK for now; revisit later for a deterministic view if needed.
- Start simple; accept up to hundreds of nodes; optimize later if performance issues appear.

## Open Questions
- Exact lane taxonomy for Execution Flow (phases/stages) and how nodes map to lanes.
- Collapse semantics: edge bundling/counts when groups collapse; label/metrics shown on proxies.
- Group nesting depth and when to auto-collapse for readability at larger scales.

## Next Steps
1. Prototype WebCola layout with:
   - Lane rectangles as top-level groups; enforce containment and avoid-overlap.
   - File-based groups nested within lanes (single level to start).
   - Alignment constraints within lanes for clearer vertical/horizontal structure.
   - Collapse/expand: replace children with a proxy node; bundle incident edges with counts.
2. Evaluate with representative graphs (hundreds of nodes) and measure stability/interaction.
3. Iterate on constraints and defaults (e.g., initial collapsed state for large groups).

## Sources & References
- Alignment constraints with guidelines (WebCola example) (Monash IALab): https://ialab.it.monash.edu/webcola/examples/alignment.html
- Hierarchical grouped layout (WebCola example) (Monash IALab): https://ialab.it.monash.edu/webcola/examples/smallgroups.html
- WebCola repository (constraints, groups, D3 adaptor) (GitHub): https://github.com/tgdwyer/WebCola
- Cytoscape.js cola extension (alternative) (GitHub): https://github.com/cytoscape/cytoscape.js-cola

## Related Work
- See `gdviz/README.md` for Quick Start and viewer context
- See `gdviz/docs/reference/README.md` for modes and user workflows

