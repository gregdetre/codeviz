# Cytoscape.js Viewer Slowness – Debugging Conversation (2025-09-12)

---
Date: 2025-09-12
Duration: ~90 minutes (iterative)
Type: Problem-solving, Decision-making
Status: Active
Related Docs: `docs/reference/VIEWER_COMMANDS.md`, `docs/reference/LAYOUT.md`, planning: 250911a/b/c/d
---

## Context & Goals
The viewer became “incredibly sluggish” during simple pan/zoom on `demo_codebase/`. It worked smoothly for a couple of seconds, then interactions would stall. Goal: gather clues, form hypotheses, test mitigations, and restore responsiveness without losing readability.

## Key Background
- Cytoscape.js viewer using fcose and ELK; expand-collapse; tooltips via Floating UI; two-pane UI.
- Recent visual polish added module color tints and focus styles.
- Logs showed repeated warnings about invalid style properties and long requestAnimationFrame (RAF) handlers.
- System monitors did not reveal a single persistent CPU hog.

## Main Discussion
### Observed Issues (from user console)
- Warnings:
  - “The style property `box-shadow: 0 0 0 2px #0ea5e9` is invalid”
  - “The style property `background-color: hsl(331 41% 93%)` is invalid” (and similar)
- Performance:
  - “[Violation] 'requestAnimationFrame' handler took N ms” repeatedly during pan/zoom
  - Sluggishness persisted across ELK and fCoSE modes; uncertain if layout switches took effect
- Group Folders initially off; later confirmed on is OK

### Hypotheses
1. Invalid Cytoscape style properties cause continuous console spam and devtools overhead; may correlate with long frames.
2. Tooltip `autoUpdate` (Floating UI) performs frequent calculations while hovering/panning; can create jank.
3. HiDPI rendering (native pixel ratio) increases pixel fill; drawing edges/labels becomes expensive during pan.
4. Layout parameters could be heavier than needed for small graphs (animation + iteration count).
5. Unbatched element updates on mode/group changes trigger extra reflows.

### Mitigations Implemented
- Style fixes / color formatting:
  - Removed unsupported `box-shadow` from `.focus`; reverted to border-only highlight.
  - Switched HSL formatting from space-separated to comma style: `hsl(h, s%, l%)` to conform to Cytoscape parser.
- Rendering/perf options (iterated):
  - Speed-first: `pixelRatio: 1`, `textureOnViewport: true`, `motionBlur: true`, `hideLabelsOnViewport: true`.
  - Crisp-first: restore default pixel ratio; found sluggish again on Retina.
  - Balanced: `pixelRatio: 1.5`, `hideEdgesOnViewport: true`, `motionBlur: false`, `hideLabelsOnViewport: true`.
- Layout tuning:
  - fCoSE defaults: `animate: false`, `randomize: false`, `numIter: 400` (also in hybrid’s fCoSE step).
  - Added timing logs for layout: `[cv] layout '<name>' done in Xms`.
- Batching:
  - Wrapped mode/group re-renders in `cy.batch()` for `remove()`/`add()`/style application.
- Tooltips:
  - Debounced tooltip `show` by ~120ms; ensured cleanup on hide/pan/zoom to reduce `autoUpdate` churn.
- Logging instrumentation:
  - New server endpoint `POST /api/log`; client forwards `console.warn/error` (size-capped) for `out/viewer.log`.

### Results after fixes
- Viewer responsive again; no stalls while panning in testing.
- User noticed blur when `pixelRatio: 1` (expected). Restoring default pixel ratio reintroduced some sluggishness.
- Settled on balanced settings (above): good responsiveness with improved crispness compared to 1.0.

## Alternatives Considered (not fully explored)
- WebGL renderer path (Cytoscape.js WebGL preview/renderer) for GPU acceleration.
- Aggressive “pan-only mode”: hide edges and labels during interaction; restore after a short debounce.
- Runtime "Performance mode" UI toggle: Crisp vs Balanced vs Fast presets without reload.
- Broader layout sweeps: fcose quality tiers (if exposed), ELK algorithm/direction and edge routing variants.
- Event listener audits for duplication across modules and potential leaks.
- Throttle tooltip position updates further (e.g., resolve at most every N ms while hovering).
- Additional style simplifications (lighter arrows during pan, reduced text outline costs).

## Decisions Made
- Remove invalid styles; use comma HSL values.
- Keep non-animated fCoSE with reduced iterations by default.
- Batch element updates for mode/group changes.
- Add layout timing and forward console warnings/errors to server log for future diagnosis.
- Adopt balanced defaults: `pixelRatio: 1.5`, `hideEdgesOnViewport: true`, `motionBlur: false`, `hideLabelsOnViewport: true`.

## Open Questions
- Exact root-cause weight: How much was log spam vs HiDPI draw cost vs tooltips?
- Cross-browser differences: Does Safari/Firefox behave similarly at native pixel ratios?
- Auto-preset thresholds: Switch presets based on element counts/viewport density?
- WebGL renderer benefits vs complexity at our scale.

## Next Steps
- Consider a Performance toggle with presets:
  - Crisp: native pixel ratio, edges visible on pan
  - Balanced (default): ~1.5 pixel ratio, edges hidden on pan, labels hidden on pan
  - Fast: pixel ratio 1.0, hide edges/labels on pan
- Add pan/zoom interaction debouncer to restore edges/labels after a short idle period.
- Extend layout logging with element counts and edge visibility state at layout time.
- Add one-click diagnostics to dump current perf settings + last timings to `viewer.log`.

## Sources & References
- Cytoscape.js performance and layouts (official docs and blogs)
- Internal: `docs/reference/VIEWER_COMMANDS.md`, `docs/reference/LAYOUT.md`, planning documents 250911a/b/c/d
- User-provided console warnings and long-task traces

## Related Work
- Viewer: `ts/viewer/src/style.ts`, `style-tokens.ts`, `app.ts`, `layout-manager.ts`, `tooltips/TooltipManager.ts`
- Server: `ts/src/server/server.ts` (log ingestion)
