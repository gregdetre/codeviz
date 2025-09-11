import type { NodeSingular } from "cytoscape";

// Get workspace root from viewer config
let workspaceRoot: string | null = null;
async function getWorkspaceRoot(): Promise<string> {
  if (workspaceRoot !== null) return workspaceRoot;
  try {
    const res = await fetch('/viewer-config.json');
    const config = await res.json();
    workspaceRoot = config.workspaceRoot || '';
    return workspaceRoot;
  } catch {
    workspaceRoot = '';
    return workspaceRoot;
  }
}

export async function renderDetails(targetEl: HTMLElement, node: NodeSingular | null): Promise<void> {
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
  
  // Get workspace root and construct VS Code URL (encode path; append :line only if valid)
  const wsRoot = await getWorkspaceRoot();
  const joined = file.startsWith('/') ? file : (wsRoot ? `${wsRoot}/${file}` : `/${file}`);
  const absolutePath = joined.replace(/\\/g, '/');
  const lineNum = Number(line);
  const lineSuffix = Number.isFinite(lineNum) && lineNum > 0 ? `:${lineNum}` : '';
  const vscodeUrl = `vscode://file${encodeURI(absolutePath)}${lineSuffix}`;

  const html = `
    <div data-testid="details">
      <div><strong>${escapeHtml(label)}</strong></div>
      <div>${escapeHtml(kind)}</div>
      <a href="${vscodeUrl}" 
         class="file-path-container" 
         style="display: flex; align-items: center; gap: 6px; text-decoration: none; color: inherit;">
        <img class="vscode-icon" src="/img/vscode.svg" width="16" height="16" alt="VS Code" style="display:inline-block; opacity:0.9; vertical-align:middle;"/>
        <span class="file-path">${escapeHtml(absolutePath)}${lineSuffix ? escapeHtml(lineSuffix) : ''}</span>
      </a>
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

  // Native anchor navigation handles editor deep link; no extra click handler needed
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}


