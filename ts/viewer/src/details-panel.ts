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
  const modulePath = node.data('module') ?? '';
  const tags = node.data('tags') ?? {};
  const outgoing = node.outgoers('node');
  const incoming = node.incomers('node');

  const html = `
    <div data-testid="details">
      <div><strong>${escapeHtml(label)}</strong></div>
      <div>${escapeHtml(kind)}</div>
      <div class="file-path-container" style="display: flex; align-items: center; gap: 6px; cursor: pointer;" 
           data-file="${escapeHtml(file)}" data-line="${escapeHtml(String(line))}">
        <svg class="vscode-icon" width="16" height="16" viewBox="0 0 24 24" style="opacity: 0.8;">
          <path fill="#007ACC" d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
        </svg>
        <span class="file-path">${escapeHtml(file)}:${escapeHtml(String(line))}</span>
      </div>
      ${modulePath ? `<div>module: ${escapeHtml(modulePath)}</div>` : ''}
      ${signature ? `<pre>${escapeHtml(signature)}</pre>` : ''}
      ${doc ? `<div class="doc">${escapeHtml(doc)}</div>` : ''}
      ${Object.keys(tags).length ? `<div><strong>Tags</strong><ul>${Object.entries(tags).map(([k,v]) => `<li>${escapeHtml(k)}: ${escapeHtml(String(v))}</li>`).join('')}</ul></div>` : ''}
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

  // Add click handler for file path container to open in VS Code
  const filePathContainer = targetEl.querySelector('.file-path-container');
  if (filePathContainer) {
    filePathContainer.addEventListener('click', (evt) => {
      evt.preventDefault();
      const fileAttr = (filePathContainer as HTMLElement).getAttribute('data-file');
      const lineAttr = (filePathContainer as HTMLElement).getAttribute('data-line');
      
      if (fileAttr && lineAttr) {
        // Use the file-opener module to handle VS Code integration
        import('./file-opener.js').then(({ openFileInEditor }) => {
          const success = openFileInEditor(fileAttr, parseInt(lineAttr, 10), 'vscode');
          if (!success) {
            console.warn('Failed to open file in VS Code');
          }
        }).catch((error) => {
          console.warn('Failed to load file-opener module:', error);
        });
      }
    });
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}


