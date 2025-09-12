import type { NodeSingular } from "cytoscape";
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
// Dynamically load Python grammar on demand during rendering

// Mutable mapping for current render: function name -> node id
let __cvClickableNameToId: Record<string, string> | null = null;
let __cvPrismWrapHookRegistered = false;

function ensurePrismWrapHook(): void {
  if (__cvPrismWrapHookRegistered) return;
  try {
    Prism.hooks.add('wrap', (env: any) => {
      try {
        if (!__cvClickableNameToId) return;
        if (env && env.type === 'function') {
          const name = String(env.content || '');
          const nodeId = (__cvClickableNameToId as any)[name];
          if (nodeId) {
            env.attributes = env.attributes || {};
            env.attributes['data-node-id'] = nodeId;
            env.attributes['class'] = String((env.attributes['class'] || '') + ' cv-clickable');
            env.attributes['role'] = 'button';
            env.attributes['tabindex'] = '0';
          }
        }
      } catch {}
    });
    __cvPrismWrapHookRegistered = true;
  } catch {}
}

// Get workspace root from viewer config
let workspaceRoot: string | null = null;
async function getWorkspaceRoot(): Promise<string> {
  if (workspaceRoot !== null) return workspaceRoot as string;
  try {
    const res = await fetch('/viewer-config.json');
    const config = await res.json();
    workspaceRoot = config.workspaceRoot || '';
    return workspaceRoot as string;
  } catch {
    workspaceRoot = '';
    return workspaceRoot as string;
  }
}

export async function renderDetails(targetEl: HTMLElement, node: NodeSingular | null): Promise<void> {
  targetEl.innerHTML = '';
  if (!node) {
    // Render hierarchical overview of current visible (non-faded) scope
    try {
      renderOverview(targetEl);
    } catch {
      targetEl.innerHTML = '<div data-testid="details-empty">No selection</div>';
    }
    return;
  }
  const label = node.data('label') ?? node.id();
  const kind = node.data('type') ?? 'entity';
  const file = node.data('file') ?? '';
  const line = node.data('line') ?? '';
  const signature = node.data('signature') ?? '';
  const doc = node.data('doc') ?? '';
  const endLine = node.data('endLine') ?? '';
  const modulePath = node.data('module') ?? '';
  const tags = node.data('tags') ?? {};
  const outgoing = node.outgoers('node');
  const incoming = node.incomers('node');
  const tagKeys = Object.keys(tags);
  
  // Optional: if a group (module/folder) is selected, show its contents overview
  let groupContentsHtml = '';
  try {
    const cy: any = (window as any).__cy;
    if (cy && kind === 'module') {
      const modId: string = String((node as any).data('path') || '');
      if (modId) {
        const m = collectModuleEntryShared(cy, modId);
        const section = renderModuleSectionShared(m);
        if (section) {
          groupContentsHtml = `
            <div style="margin-top:10px;">
              <div style="font-weight:600; margin-bottom:6px;">Contents</div>
              ${section}
            </div>
          `;
        }
      }
    } else if (cy && kind === 'folder') {
      const mods = (node as any).descendants('node[type = "module"]');
      if (mods && mods.length > 0) {
        const entries: ListingModuleEntry[] = [];
        mods.forEach((mn: any) => {
          const modId: string = String(mn.data('path') || '');
          if (modId) entries.push(collectModuleEntryShared(cy, modId));
        });
        entries.sort((a, b) => a.label.localeCompare(b.label));
        const html = entries.map(renderModuleSectionShared).filter(Boolean).join('');
        if (html) {
          groupContentsHtml = `
            <div style=\"margin-top:10px;\">\n              <div style=\"font-weight:600; margin-bottom:6px;\">Folder contents</div>\n              ${html}\n            </div>
          `;
        }
      }
    }
  } catch {}
  
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
      ${file ? `
      <details id="code-section" style="margin-top:8px;">
        <summary style="cursor:pointer;">Code</summary>
        <div id="code-container" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:12px; white-space: pre; overflow:auto; border:1px solid #e5e7eb; border-radius:6px; padding:8px; background:#fafafa; margin-top:6px;">
          <div id="code-loading" style="font-size:12px; color:#666;">Click to load…</div>
        </div>
      </details>` : ''}
      <div id="summaryLoading" class="cv-loading" hidden style="margin-top:8px;">
        <i class="ph ph-spinner" aria-hidden="true"></i>
        <span style="font-size:12px; color:#666;">Summarising…</span>
      </div>
      <div id="summaryContainer" style="margin-top:6px; font-size:13px; line-height:1.5;"></div>
      ${tagKeys.length
        ? `<div><strong>Tags</strong><ul>${Object.entries(tags).map(([k,v]) => `<li>${escapeHtml(k)}: ${escapeHtml(String(v))}</li>`).join('')}</ul>
             <div style="font-size:12px;color:#666;">LLM-generated (optional)</div>
           </div>`
        : `<div><strong>Tags</strong><div style="font-size:12px;color:#666;">None (LLM annotations optional)</div></div>`}
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
      ${groupContentsHtml}
    </div>
  `;
  targetEl.innerHTML = html;
  targetEl.querySelectorAll('a[data-node-id]').forEach((el) => {
    el.addEventListener('click', (evt) => {
      evt.preventDefault();
      try { (evt as any).stopPropagation?.(); } catch {}
      const id = (el as HTMLElement).getAttribute('data-node-id')!;
      const cy = node.cy();
      const target = cy.getElementById(id);
      if (target && !target.empty()) {
        (target as any).trigger('tap');
        cy.center(target);
      }
    });
  });

  // Lazy-load source when Code section is opened
  try {
    const codeSection = document.getElementById('code-section');
    if (codeSection) {
      codeSection.addEventListener('toggle', async () => {
        try {
          if (!(codeSection as HTMLDetailsElement).open) return;
          const container = document.getElementById('code-container');
          if (!container || container.getAttribute('data-loaded') === '1') return;
          const qs = new URLSearchParams({ file, start: String(lineNum || 1), end: String(Number(endLine) || 0) });
          const res = await fetch(`/api/source?${qs.toString()}`);
          const data = await res.json();
          const code = String(data?.content ?? '');
          // Build clickable map from neighbours (caller/callees) by simple function name
          const clickable: Record<string, string> = {};
          try {
            outgoing.forEach((n: any) => {
              const nm = String(n.data('label') || '').trim();
              if (nm) clickable[nm] = String(n.id());
            });
            incoming.forEach((n: any) => {
              const nm = String(n.data('label') || '').trim();
              if (nm && !clickable[nm]) clickable[nm] = String(n.id());
            });
          } catch {}

          __cvClickableNameToId = clickable;
          ensurePrismWrapHook();

          // Load Python grammar only when needed
          try { await import('prismjs/components/prism-python'); } catch {}

          // Highlight and sanitize
          let html: string = '';
          try {
            const lang = (Prism as any).languages['python'];
            if (lang && code) {
              html = Prism.highlight(code, lang, 'python');
            }
          } catch {}
          try {
            const { default: DOMPurify } = await import('dompurify');
            container.innerHTML = DOMPurify.sanitize(`<code class="language-python">${html || ''}</code>`);
          } catch {
            container.innerHTML = `<code class="language-python">${html || ''}</code>`;
          }

          // Fallback when empty
          if (!code) {
            container.textContent = '(empty)';
          }

          // Delegate click handling for clickable function tokens
          try {
            container.addEventListener('click', (e) => {
              const tgt = e.target as HTMLElement;
              let el: HTMLElement | null = tgt;
              while (el && el !== container) {
                if (el.classList && el.classList.contains('cv-clickable')) break;
                el = el.parentElement;
              }
              if (el && el.classList && el.classList.contains('cv-clickable')) {
                e.preventDefault();
                e.stopPropagation();
                const id = el.getAttribute('data-node-id');
                if (id) {
                  const cy = node.cy();
                  const target = cy.getElementById(id);
                  if (target && !target.empty()) {
                    (target as any).trigger('tap');
                    cy.center(target);
                  }
                }
              }
            }, { once: true } as any);
          } catch {}

          container.setAttribute('data-loaded', '1');
        } catch (err) {
          const container = document.getElementById('code-container');
          if (container) container.textContent = `Error loading source: ${String((err as any)?.message || err)}`;
        }
      }, { once: true } as any);
    }
  } catch {}

  // Render existing summary from annotations, if available; auto-run summarisation for function nodes with spinner
  try {
    const out = document.getElementById('summaryContainer');
    if (out) {
      const spinner = document.getElementById('summaryLoading');
      const currentNodeId = String(node.id());
      (out as HTMLElement).setAttribute('data-node-id', currentNodeId);
      try {
        const anns = (window as any).__cv_annotations;
        if (anns && Array.isArray(anns.nodes)) {
          const entry = anns.nodes.find((n: any) => n && n.id === String(node.id()));
          const md = entry && typeof entry.summary === 'string' ? entry.summary : '';
          if (md) {
            const { marked } = await import('marked');
            const { default: DOMPurify } = await import('dompurify');
            out.innerHTML = DOMPurify.sanitize(String(marked.parse(md, { breaks: true } as any) || ''));
          }
          // Auto-trigger summarisation for functions (always run on selection)
          if (kind === 'function') {
            try {
              if (spinner) spinner.removeAttribute('hidden');
              out.textContent = md ? out.textContent : '';
              const payload = { node: { id: String(node.id()), label, module: modulePath, file, line: lineNum, endLine, signature, doc } };
              const res = await fetch('/api/summarise-node', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              const data = await res.json();
              const md2 = String(data?.summary || '');
              // Ensure still on same node
              const outNow = document.getElementById('summaryContainer');
              if (outNow && (outNow as HTMLElement).getAttribute('data-node-id') === currentNodeId) {
                if (md2) {
                  const { marked } = await import('marked');
                  const { default: DOMPurify } = await import('dompurify');
                  (outNow as HTMLElement).innerHTML = DOMPurify.sanitize(String(marked.parse(md2, { breaks: true } as any) || ''));
                  try {
                    const res2 = await fetch('/out/llm_annotation.json');
                    if (res2.ok) (window as any).__cv_annotations = await res2.json();
                  } catch {}
                } else {
                  (outNow as HTMLElement).textContent = '(no summary)';
                }
              }
            } catch (e) {
              try { (out as HTMLElement).textContent = `Error summarising: ${String((e as any)?.message || e)}`; } catch {}
            } finally {
              if (spinner) spinner.setAttribute('hidden', '');
            }
          }
        }
      } catch {}
    }
  } catch {}

  // No manual summarise button; auto-run is handled above

  // Native anchor navigation handles editor deep link; no extra click handler needed
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

// Shared types and helpers for module/folder listings
type ListingEntityItem = { id: string; label: string; kind: 'function' | 'class' | 'variable' };
type ListingModuleEntry = { id: string; label: string; functions: ListingEntityItem[]; classes: ListingEntityItem[]; variables: ListingEntityItem[] };

function collectModuleEntryShared(cy: any, moduleId: string): ListingModuleEntry {
  const modNode = cy.getElementById(`module:${moduleId}`);
  const modLabel = (modNode && !modNode.empty()) ? String(modNode.data('label') || moduleId) : moduleId;
  const m: ListingModuleEntry = { id: moduleId, label: modLabel, functions: [], classes: [], variables: [] };
  // Respect visibility toggles and search-hide, but ignore fade caused solely by selection focus
  let scoped = cy.nodes('[type = "function"], [type = "class"], [type = "variable"]').filter(':visible');
  try {
    const sb = document.getElementById('searchBox') as HTMLInputElement | null;
    const hasSearch = Boolean((sb?.value || '').trim());
    if (hasSearch) scoped = scoped.not('.faded');
  } catch {}
  scoped.forEach((n: any) => {
    if (String(n.data('module') || '') !== moduleId) return;
    const kind = String(n.data('type') || 'function') as any;
    const item: ListingEntityItem = { id: String(n.id()), label: String(n.data('label') || n.id()), kind };
    if (kind === 'function') m.functions.push(item);
    else if (kind === 'class') m.classes.push(item);
    else m.variables.push(item);
  });
  m.functions.sort((a, b) => a.label.localeCompare(b.label));
  m.classes.sort((a, b) => a.label.localeCompare(b.label));
  m.variables.sort((a, b) => a.label.localeCompare(b.label));
  return m;
}

function renderEntityListShared(title: string, list: ListingEntityItem[]): string {
  if (!list || list.length === 0) return '';
  const items = list.map(it => `<li><a href="#" data-node-id="${escapeHtml(it.id)}">${escapeHtml(it.label)}</a></li>`).join('');
  return `
    <details>
      <summary>${escapeHtml(title)} (${list.length})</summary>
      <ul style="margin: 6px 0 6px 16px;">${items}</ul>
    </details>
  `;
}

function renderModuleSectionShared(m: ListingModuleEntry): string {
  const f = m.functions.length, c = m.classes.length, v = m.variables.length;
  const counts = [f ? `${f} fn` : '', c ? `${c} cls` : '', v ? `${v} var` : ''].filter(Boolean).join(', ');
  const body = [
    renderEntityListShared('Functions', m.functions),
    renderEntityListShared('Classes', m.classes),
    renderEntityListShared('Variables', m.variables)
  ].filter(Boolean).join('');
  if (!body) return '';
  return `
    <details open>
      <summary><a href="#" data-node-id="module:${escapeHtml(m.id)}">${escapeHtml(m.label)}</a>${counts ? ` (${counts})` : ''}</summary>
      <div style="margin-left: 12px;">${body}</div>
    </details>
  `;
}


// Overview (no-selection) renderer: hierarchical, collapsible, filter-aware
function renderOverview(targetEl: HTMLElement): void {
  const cy: any = (window as any).__cy;
  if (!cy || typeof cy.nodes !== 'function') {
    targetEl.innerHTML = '<div data-testid="details-empty">No selection</div>';
    return;
  }

  // Scope: visible; ignore fade if there is no search term (so selection fade doesn't hide items)
  let scopeEntities = cy
    .nodes('[type = "function"], [type = "class"], [type = "variable"]')
    .filter(':visible');
  try {
    const sb = document.getElementById('searchBox') as HTMLInputElement | null;
    const hasSearch = Boolean((sb?.value || '').trim());
    if (hasSearch) scopeEntities = scopeEntities.not('.faded');
  } catch {}

  const totalEntities = scopeEntities.length;

  // If nothing matches current filter, show an empty-state message
  if (totalEntities === 0) {
    const anyNodesVisible = cy.nodes(':visible').not('.faded').length > 0;
    targetEl.innerHTML = `
      <div data-testid="overview">
        <div style="font-weight:600; margin-bottom:6px;">Overview</div>
        <div style="font-size:12px; color:#666;">${anyNodesVisible ? 'No functions/classes/variables match current filter.' : 'No visible nodes match current filter.'}</div>
      </div>
    `;
    return;
  }

  const hasFolders = cy.nodes('node[type = "folder"]').length > 0;

  type EntityItem = { id: string; label: string; kind: 'function' | 'class' | 'variable' };
  type ModuleEntry = { id: string; label: string; functions: EntityItem[]; classes: EntityItem[]; variables: EntityItem[] };

  const moduleMap = new Map<string, ModuleEntry>();

  // Group entities by their module
  scopeEntities.forEach((n: any) => {
    const moduleId: string = String(n.data('module') || '');
    const kind: 'function' | 'class' | 'variable' = String(n.data('type') || 'function') as any;
    if (!moduleId) return;
    let m = moduleMap.get(moduleId);
    if (!m) {
      const modNode = cy.getElementById(`module:${moduleId}`);
      const modLabel = (modNode && !modNode.empty()) ? (String(modNode.data('label') || moduleId)) : moduleId;
      m = { id: moduleId, label: modLabel, functions: [], classes: [], variables: [] };
      moduleMap.set(moduleId, m);
    }
    const item: EntityItem = { id: String(n.id()), label: String(n.data('label') || n.id()), kind };
    if (kind === 'function') m.functions.push(item);
    else if (kind === 'class') m.classes.push(item);
    else m.variables.push(item);
  });

  // Sort module entries and their entity lists
  const sortedModules = Array.from(moduleMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  for (const m of sortedModules) {
    m.functions.sort((a, b) => a.label.localeCompare(b.label));
    m.classes.sort((a, b) => a.label.localeCompare(b.label));
    m.variables.sort((a, b) => a.label.localeCompare(b.label));
  }

  // If folder grouping is active, build folder tree from module parent chains
  type FolderNode = { id: string; label: string; depth: number; children: Map<string, FolderNode>; modules: ModuleEntry[] };
  const folderById = new Map<string, FolderNode>();
  const rootFolders = new Set<string>();

  function ensureFolderNode(node: any): FolderNode {
    const id: string = String(node.id());
    let f = folderById.get(id);
    if (!f) {
      f = { id, label: String(node.data('label') || node.data('path') || id), depth: Number(node.data('depth') || 0), children: new Map(), modules: [] };
      folderById.set(id, f);
    }
    return f;
  }

  if (hasFolders) {
    for (const m of sortedModules) {
      const modNode = cy.getElementById(`module:${m.id}`);
      if (!modNode || modNode.empty()) continue;
      const ancestors = modNode.parents('node[type = "folder"]');
      if (ancestors.length === 0) continue;
      // Sort by depth ascending to establish hierarchy
      const chain = ancestors.sort((a: any, b: any) => (Number(a.data('depth') || 0) - Number(b.data('depth') || 0)));
      // Link chain in our map
      let prev: FolderNode | null = null;
      chain.forEach((folderNode: any) => {
        const cur = ensureFolderNode(folderNode);
        if (!prev) rootFolders.add(cur.id);
        else if (!prev.children.has(cur.id)) prev.children.set(cur.id, cur);
        prev = cur;
      });
      // Attach module to the deepest folder
      if (prev) (prev as FolderNode).modules.push(m);
    }
  }

  // Helpers to render lists
  function renderEntityList(title: string, list: EntityItem[]): string {
    return renderEntityListShared(title, list as unknown as ListingEntityItem[]);
  }

  function renderModule(m: ModuleEntry): string {
    return renderModuleSectionShared(m as unknown as ListingModuleEntry);
  }

  function collectFolderStats(fid: string): { modules: number; entities: number } {
    const fMaybe = folderById.get(fid);
    if (!fMaybe) return { modules: 0, entities: 0 };
    const fNode: FolderNode = fMaybe as FolderNode;
    let modules = 0;
    let entities = 0;
    for (const m of fNode.modules) {
      modules += 1;
      entities += m.functions.length + m.classes.length + m.variables.length;
    }
    for (const child of fNode.children.values()) {
      const s = collectFolderStats(child.id);
      modules += s.modules;
      entities += s.entities;
    }
    return { modules, entities };
  }

  function renderFolder(fid: string): string {
    const f = folderById.get(fid);
    if (!f) return '';
    // Skip empty folders
    const stats = collectFolderStats(fid);
    if (stats.modules === 0) return '';
    const childFolders = Array.from(f.children.values()).sort((a, b) => a.label.localeCompare(b.label));
    const childrenHtml = [
      ...childFolders.map(ch => renderFolder(ch.id)),
      ...f.modules.map(renderModule)
    ].filter(Boolean).join('');
    return `
      <details open>
        <summary><a href="#" data-node-id="${escapeHtml(f.id)}">${escapeHtml(f.label)}</a> (${stats.modules} mod, ${stats.entities} items)</summary>
        <div style="margin-left: 12px;">${childrenHtml}</div>
      </details>
    `;
  }

  let contentHtml = '';
  if (hasFolders) {
    const roots = Array.from(rootFolders.values());
    // Some modules may be at root without folder ancestors; render them under a virtual group
    const orphanModules = sortedModules.filter(m => {
      const modNode = cy.getElementById(`module:${m.id}`);
      return !modNode || modNode.empty() || modNode.parents('node[type = "folder"]').length === 0;
    });
    const foldersHtml = roots
      .map(fid => renderFolder(fid))
      .filter(Boolean)
      .join('');
    const orphansHtml = orphanModules.length ? `
      <details open>
        <summary>Other modules (${orphanModules.length})</summary>
        <div style="margin-left: 12px;">${orphanModules.map(renderModule).join('')}</div>
      </details>
    ` : '';
    contentHtml = foldersHtml + orphansHtml;
  } else {
    // No folder grouping: render modules at top level
    contentHtml = sortedModules.map(renderModule).filter(Boolean).join('');
  }

  const header = `<div style="font-weight:600; margin-bottom:6px;">Overview</div>`;
  const sub = `<div style="font-size:12px; color:#666; margin-bottom:6px;">Showing ${totalEntities} items across ${sortedModules.length} modules</div>`;
  targetEl.innerHTML = `<div data-testid="overview">${header}${sub}${contentHtml || '<div style="font-size:12px; color:#666;">Nothing to show.</div>'}</div>`;

  // Wire anchor clicks to focus nodes
  targetEl.querySelectorAll('a[data-node-id]').forEach((el) => {
    el.addEventListener('click', (evt) => {
      evt.preventDefault();
      try { (evt as any).stopPropagation?.(); } catch {}
      const id = (el as HTMLElement).getAttribute('data-node-id')!;
      try {
        const target = cy.getElementById(id);
        if (target && !target.empty()) {
          (target as any).trigger('tap');
          cy.center(target);
        }
      } catch {}
    });
  });
}


