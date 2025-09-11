import type { NodeSingular } from "cytoscape";

export function renderDetails(targetEl: HTMLElement, node: NodeSingular | null): void {
  targetEl.innerHTML = '';
  if (!node) {
    targetEl.innerHTML = '<div data-testid="details-empty">No selection</div>';
    return;
  }
  const label = node.data('label') ?? node.id();
  const kind = node.data('type') ?? 'entity';
  const file = node.data('file') ?? '';
  const line = node.data('line') ?? '';
  const signature = node.data('signature') ?? '';
  const doc = node.data('doc') ?? '';
  const outgoing = node.outgoers('node');
  const incoming = node.incomers('node');

  const html = `
    <div data-testid="details">
      <div><strong>${escapeHtml(label)}</strong></div>
      <div>${escapeHtml(kind)}</div>
      <div>${escapeHtml(file)}:${escapeHtml(String(line))}</div>
      ${signature ? `<pre>${escapeHtml(signature)}</pre>` : ''}
      ${doc ? `<div class="doc">${escapeHtml(doc)}</div>` : ''}
      <div style="margin-top:8px; display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <div><strong>Outgoing</strong></div>
          <ul>
            ${outgoing.map(n => `<li><a href="#" data-node-id="${escapeHtml(n.id())}">${escapeHtml(n.data('label') || n.id())}</a></li>`).join('')}
          </ul>
        </div>
        <div>
          <div><strong>Incoming</strong></div>
          <ul>
            ${incoming.map(n => `<li><a href="#" data-node-id="${escapeHtml(n.id())}">${escapeHtml(n.data('label') || n.id())}</a></li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
  targetEl.innerHTML = html;
  targetEl.querySelectorAll('a[data-node-id]').forEach((el) => {
    el.addEventListener('click', (evt) => {
      evt.preventDefault();
      const id = (el as HTMLElement).getAttribute('data-node-id')!;
      const cy = node.cy();
      const target = cy.getElementById(id);
      if (target && !target.empty()) {
        (target as any).trigger('tap');
        cy.center(target);
      }
    });
  });
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}


