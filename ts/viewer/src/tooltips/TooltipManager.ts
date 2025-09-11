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

function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function installTooltips(cy: cytoscape.Core) {
  const tooltip = ensureTooltipEl();
  let cleanup: (() => void) | null = null;

  function show(node: cytoscape.NodeSingular, html: string) {
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
  }

  function hide() {
    tooltip.style.display = 'none';
    if (cleanup) { cleanup(); cleanup = null; }
  }

  cy.on('mouseover', 'node[type = "function"]', (evt) => {
    show(evt.target, formatFnTooltip(evt.target));
  });
  cy.on('mouseout', 'node[type = "function"]', hide);

  cy.on('mouseover', 'node[type = "module"]', (evt) => {
    show(evt.target, formatModuleTooltip(evt.target));
  });
  cy.on('mouseout', 'node[type = "module"]', hide);

  // Hide on pan/zoom to avoid lagging tooltips
  cy.on('pan zoom', hide);
}

export default { installTooltips };


