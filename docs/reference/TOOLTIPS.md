# Tooltips

## Introduction
Lightweight tooltips provide contextual information for graph nodes and edges. They use Floating UI for positioning and a single shared DOM element for performance.

## See also
- `libraries/FLOATING_UI_TOOLTIP_INTEGRATION.md` – rationale, patterns, and advanced usage
- `ts/viewer/src/tooltips/TooltipManager.ts` – implementation (creation, formatting, events)
- `ts/viewer/index.html` – base `.codeviz-tooltip` styles
- `ts/viewer/src/app.ts` – lazy installation at startup

## Principles and key decisions
- Use Floating UI for robust, minimal positioning; style with CSS.
- Reuse one tooltip element (prevents leaks; faster than per-target instances).
- Anchor to Cytoscape geometry via virtual elements (nodes and edge midpoints).
- Debounced show (120ms) to reduce flicker; cleanup on hide/pan/zoom.
- Tooltip has `pointer-events: none` to avoid intercepting input.

## Implementation overview
- Initialization (lazy in app):
```220:227:ts/viewer/src/app.ts
// Lazy-init tooltips (modules + functions)
try {
  const mod = await import('./tooltips/TooltipManager.js');
  mod.installTooltips(cy);
} catch (err) {
  // Non-fatal if tooltips are not available
  console.warn('Tooltips not available:', err);
}
```

- Tooltip element creation and styling:
```4:26:ts/viewer/src/tooltips/TooltipManager.ts
function ensureTooltipEl(): HTMLDivElement {
  let el = document.querySelector('.codeviz-tooltip') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.className = 'codeviz-tooltip';
    el.style.cssText = [
      'position:absolute',
      'background:rgba(0,0,0,0.85)',
      'color:white',
      'padding:6px 8px',
      'border-radius:6px',
      'font-size:12px',
      'line-height:1.35',
      'pointer-events:none',
      'z-index:1000',
      'display:none',
      'max-width:320px',
      'word-wrap:break-word'
    ].join(';');
    document.body.appendChild(el);
  }
  return el;
}
```

- Base CSS in the viewer shell:
```163:177:ts/viewer/index.html
/* Tooltip base class used by Floating UI */
.codeviz-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.35;
    pointer-events: none;
    z-index: 1000;
    display: none;
    max-width: 320px;
    word-wrap: break-word;
}
```

- Positioning anchors (virtual elements):
```28:45:ts/viewer/src/tooltips/TooltipManager.ts
function createVirtualElement(node: cytoscape.NodeSingular, cy: cytoscape.Core) {
  return {
    getBoundingClientRect() {
      const bbox = node.renderedBoundingBox();
      const container = cy.container()!.getBoundingClientRect();
      return {
        x: container.left + bbox.x1,
        y: container.top + bbox.y1,
        width: bbox.w,
        height: bbox.h,
        top: container.top + bbox.y1,
        left: container.left + bbox.x1,
        right: container.left + bbox.x2,
        bottom: container.top + bbox.y2,
      } as DOMRect;
    },
  } as any;
}
```

- Edge anchor (midpoint bounding rect):
```47:70:ts/viewer/src/tooltips/TooltipManager.ts
function createEdgeVirtualElement(edge: cytoscape.EdgeSingular, cy: cytoscape.Core) {
  return {
    getBoundingClientRect() {
      // Use rendered midpoint of the edge for tooltip anchoring
      const mid = edge.midpoint('rendered');
      const mbr = edge.renderedBoundingBox();
      const container = cy.container()!.getBoundingClientRect();
      const w = Math.max(8, Math.min(24, mbr.w || 12));
      const h = Math.max(8, Math.min(24, mbr.h || 12));
      const x = container.left + (mid.x - w / 2);
      const y = container.top + (mid.y - h / 2);
      return {
        x,
        y,
        width: w,
        height: h,
        top: y,
        left: x,
        right: x + w,
        bottom: y + h,
      } as DOMRect;
    },
  } as any;
}
```

- Content formatters (examples):
```72:80:ts/viewer/src/tooltips/TooltipManager.ts
function formatFnTooltip(node: cytoscape.NodeSingular): string {
  const signature = node.data('signature') ?? '';
  const file = node.data('file') ?? '';
  const line = node.data('line') ?? '';
  let content = '';
  if (signature) content += `<strong><code>${escapeHtml(signature)}</code></strong>`;
  if (file) content += `<div style="opacity:0.8">${escapeHtml(file)}:${escapeHtml(String(line))}</div>`;
  return content;
}
```

```98:114:ts/viewer/src/tooltips/TooltipManager.ts
function formatEdgeTooltip(edge: cytoscape.EdgeSingular): string {
  const kind = edge.data('type') || edge.data('kind') || 'edge';
  const src = edge.source();
  const tgt = edge.target();
  const sLabel = src.data('label') || src.id();
  const tLabel = tgt.data('label') || tgt.id();
  const sModule = src.data('module') || '';
  const tModule = tgt.data('module') || '';
  const order = edge.data('order');
  const conditions: string[] = edge.data('conditions') || [];
  const weight = edge.data('weight');

  let content = `<strong>${escapeHtml(String(kind))}</strong>`;
  content += `<div>${escapeHtml(String(sModule ? `${sModule}.` : ''))}${escapeHtml(String(sLabel))} → ${escapeHtml(String(tModule ? `${tModule}.` : ''))}${escapeHtml(String(tLabel))}</div>`;
  if (typeof order === 'number') content += `<div style=\"opacity:0.9\">order: ${escapeHtml(String(order))}</div>`;
  if (conditions && conditions.length > 0) content += `<div style=\"opacity:0.9\">conditions: ${escapeHtml(conditions.join(', '))}</div>`;
  if (typeof weight === 'number') content += `<div style=\"opacity:0.9\">weight: ${escapeHtml(String(weight))}</div>`;
  return content;
}
```

- Event wiring and lifecycle:
```165:189:ts/viewer/src/tooltips/TooltipManager.ts
cy.on('mouseover', 'node[type = "function"]', (evt) => { /* show node tooltip */ });
cy.on('mouseout',  'node[type = "function"]', hide);
cy.on('mouseover', 'node[type = "module"]',   (evt) => { /* show module tooltip */ });
cy.on('mouseout',  'node[type = "module"]',   hide);
cy.on('mouseover', 'node[type = "folder"]',   (evt) => { /* show folder tooltip */ });
cy.on('mouseout',  'node[type = "folder"]',   hide);
cy.on('mouseover', 'edge', (evt) => { /* show edge tooltip */ });
cy.on('mouseout',  'edge', hide);
// Hide on pan/zoom to avoid lagging tooltips
cy.on('pan zoom', hide);
```

## Behaviour
- Show delay: 120ms; immediate hide on mouseout.
- Position updates via Floating UI `autoUpdate`; cleanup on hide.
- Pan/zoom hides tooltip to prevent positional lag.

### Aggregated edges (collapsed groups)
- When folder/file groups are collapsed, edges between groups are aggregated using the expand-collapse plugin.
- The aggregated edge gains class `cy-expand-collapse-collapsed-edge` and holds its underlying edges in `edge.data('collapsedEdges')`.
- We render a dashed line with logarithmic width: `width = 2 + log2(N)` where N is the number of underlying edges.
- The edge label shows `(N)` only when N > 1.
- Tooltip content includes:
  - Type (calls/imports)
  - Source group → target group
  - `edges: N`
  - Up to 5 example underlying edges (source → target labels)

## Extending/Customising
- Change content: edit formatter functions in `TooltipManager.ts` (e.g., add docstrings, counts, tags).
- Add new kinds: wire additional selectors in `installTooltips` (e.g., class/variable nodes).
- Styling: adjust `.codeviz-tooltip` CSS in `index.html` or override via variables/classes.
- Positioning: tweak middleware (offset/flip/shift) in `computePosition` calls.
- Delay: adjust the 120ms debounce in `show`/`showEdge`.

## Common gotchas
- Always cleanup `autoUpdate` on hide to avoid memory leaks (handled by `hide`).
- Keep `pointer-events: none` to prevent flicker and event interception.
- Edge anchors use midpoints; very short edges may produce small rects (sizes are clamped).

## Future work
- Richer HTML (syntax-highlighted signatures, doc excerpts, metrics).
- Edge details (call frequency, runtime traces when available).
- Accessibility enhancements and keyboard-triggered hints.

