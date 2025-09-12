import type cytoscape from 'cytoscape';
import { computePosition, autoUpdate, offset, flip, shift } from '@floating-ui/dom';

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

function formatFnTooltip(node: cytoscape.NodeSingular): string {
  const signature = node.data('signature') ?? '';
  const file = node.data('file') ?? '';
  const line = node.data('line') ?? '';
  let content = '';
  if (signature) content += `<strong><code>${escapeHtml(signature)}</code></strong>`;
  if (file) content += `<div style="opacity:0.8">${escapeHtml(file)}:${escapeHtml(String(line))}</div>`;
  return content;
}

function formatModuleTooltip(node: cytoscape.NodeSingular): string {
  const label = node.data('label') ?? node.id();
  const path = node.data('path') ?? '';
  let content = `<strong>Module: ${escapeHtml(label)}</strong>`;
  if (path) content += `<div style="opacity:0.8">${escapeHtml(path)}</div>`;
  return content;
}

function formatFolderTooltip(node: cytoscape.NodeSingular): string {
  const label = node.data('label') ?? node.id();
  const path = node.data('path') ?? '';
  let content = `<strong>Folder: ${escapeHtml(label)}</strong>`;
  if (path) content += `<div style="opacity:0.8">${escapeHtml(path)}</div>`;
  return content;
}

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
  if (typeof order === 'number') content += `<div style="opacity:0.9">order: ${escapeHtml(String(order))}</div>`;
  if (conditions && conditions.length > 0) content += `<div style="opacity:0.9">conditions: ${escapeHtml(conditions.join(', '))}</div>`;
  if (typeof weight === 'number') content += `<div style="opacity:0.9">weight: ${escapeHtml(String(weight))}</div>`;
  return content;
}

function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function installTooltips(cy: cytoscape.Core) {
  const tooltip = ensureTooltipEl();
  let cleanup: (() => void) | null = null;

  let hoverTimer: any = null;
  function show(node: cytoscape.NodeSingular, html: string) {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    hoverTimer = setTimeout(() => {
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      const ref = createVirtualElement(node, cy);
      cleanup = autoUpdate(ref as any, tooltip, () => {
        computePosition(ref as any, tooltip, {
          placement: 'top',
          middleware: [offset(8), flip(), shift({ padding: 6 })]
        }).then(({ x, y }) => {
          Object.assign(tooltip.style, { left: `${x}px`, top: `${y}px` });
        });
      });
    }, 120);
  }

  function showEdge(edge: cytoscape.EdgeSingular, html: string) {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    hoverTimer = setTimeout(() => {
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      const ref = createEdgeVirtualElement(edge, cy);
      cleanup = autoUpdate(ref as any, tooltip, () => {
        computePosition(ref as any, tooltip, {
          placement: 'top',
          middleware: [offset(8), flip(), shift({ padding: 6 })]
        }).then(({ x, y }) => {
          Object.assign(tooltip.style, { left: `${x}px`, top: `${y}px` });
        });
      });
    }, 120);
  }

  function hide() {
    tooltip.style.display = 'none';
    if (cleanup) { cleanup(); cleanup = null; }
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  }

  cy.on('mouseover', 'node[type = "function"]', (evt) => {
    show(evt.target, formatFnTooltip(evt.target));
  });
  cy.on('mouseout', 'node[type = "function"]', hide);

  cy.on('mouseover', 'node[type = "module"]', (evt) => {
    show(evt.target, formatModuleTooltip(evt.target));
  });
  cy.on('mouseout', 'node[type = "module"]', hide);

  cy.on('mouseover', 'node[type = "folder"]', (evt) => {
    show(evt.target, formatFolderTooltip(evt.target));
  });
  cy.on('mouseout', 'node[type = "folder"]', hide);

  // Edge tooltips (calls/imports/moduleImport, etc.)
  cy.on('mouseover', 'edge', (evt) => {
    const e = evt.target as cytoscape.EdgeSingular;
    showEdge(e, formatEdgeTooltip(e));
  });
  cy.on('mouseout', 'edge', hide);

  // Hide on pan/zoom to avoid lagging tooltips
  cy.on('pan zoom', hide);
}

export default { installTooltips };


