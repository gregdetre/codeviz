# Viewer Controls and State Model - 2025-09-12

---
Date: 2025-09-12
Duration: ~20 min
Type: Decision-making
Status: Resolved
Related Docs: ../reference/USER_GUIDE.md, ../reference/LAYOUT.md
---

## Context & Goals
We discussed simplifying the viewer by clarifying state layers and decoupling controls. Goal: make controls map to orthogonal state, reduce ambiguity, and remove Explore/Modules modes.

## Key Background
> "Thinking of it as: viewport, force-directed layout, selection state, visibility state."

We aligned on a slightly richer, orthogonal model to guide UI decisions.

## Main Discussion
### Orthogonal State Layers
- Graph topology state: nodes/edges present (affected by expand/collapse). Can invalidate layout.
- Layout state: algorithm choice and computed positions (ELK, fCoSE, hybrid); independent of viewport.
- Visibility/filter state: shown/hidden/faded via toggles and search; shouldn’t implicitly re-run layout.
- Styling/highlight state: focus, neighbours, path highlights (classes-only).
- Selection state: Cytoscape selection; ESC should clear.
- Viewport state: zoom/pan (camera-only).
- Mode state (removed): Explore remains as the default.

### UI Mapping Decisions
- Recenter: camera-only fit to visible elements.
- Recompute layout: re-run current algorithm (ELK/fCoSE/Hybrid) without changing viewport/selection/filters.
- Clear selection: unselect elements; no other state changes.
- Clear filters: reset search, element toggles, and filter mode to defaults; no styling/layout/viewport change.
- Clear styling: remove focus/highlight classes; no visibility change.
- Expand all / Collapse all: operate on groups; may prompt recompute for best layout.
- Reset: explicitly deferred for now.
- Remove Modes: Modules view and mode toggling removed; Explore is default.

## Alternatives Considered
- Keep Modules mode: rejected to reduce cognitive load and UI branching.
- Single “Reset” doing everything: deferred; prefer small, composable actions.

## Decisions Made
- Remove Explore/Modules modes; keep Explore as default.
- Add buttons: Recenter, Recompute layout, Clear selection, Clear filters, Clear styling, Expand all, Collapse all.
- ESC clears selection and focus; ignored when typing in inputs.
- Recompute layout is side-effect-free beyond node positions.

## Next Steps
- Implement UI changes and handlers (done in this iteration).
- Update USER_GUIDE.md and LAYOUT.md to reflect new controls and semantics (done).

## Sources & References
- See `ts/viewer/src/app.ts` and `ts/viewer/index.html` for control wiring.
- See `ts/viewer/src/interaction-manager.ts` for ESC and focus behavior.
- Cytoscape.js: https://js.cytoscape.org/

