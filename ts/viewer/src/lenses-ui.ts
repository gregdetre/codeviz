import type { Core } from "cytoscape";
import type { Graph } from "./graph-types.js";
import type { Lens } from "./lens-types.js";
import { buildLens, applyLens } from "./lens.js";

type LensesContext = {
  getGroupFolders: () => boolean;
  setGroupFolders: (enabled: boolean) => Promise<void> | void;
  getFilterMode: () => 'fade' | 'hide' | string;
  setFilterMode: (mode: 'fade' | 'hide') => void;
};

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return await res.json();
}

async function postJson(url: string, body: any): Promise<any> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function installLensesUI(cy: Core, graph: Graph, annotations: any | null, ctx: LensesContext): Promise<void> {
  const section = document.getElementById('lensesSection') as HTMLDetailsElement | null;
  const listEl = document.getElementById('lensesList') as HTMLElement | null;
  const saveAsBtn = document.getElementById('lensSaveAsBtn') as HTMLButtonElement | null;
  const saveBtn = document.getElementById('lensSaveBtn') as HTMLButtonElement | null;
  const deleteBtn = document.getElementById('lensDeleteBtn') as HTMLButtonElement | null;
  const nameEl = document.getElementById('currentLensName') as HTMLElement | null;
  if (!section || !listEl) return;

  let currentName: string | null = null;

  const updateHeader = () => {
    if (nameEl) nameEl.textContent = currentName ? currentName : '(none)';
    if (saveBtn) saveBtn.disabled = !currentName;
    if (deleteBtn) deleteBtn.disabled = !currentName;
  };

  async function refreshList(): Promise<void> {
    try {
      const data = await fetchJson('/out/lenses/index.json');
      const names: string[] = Array.isArray(data?.names) ? data.names : [];
      const html = names.map((nm) => `<button type="button" class="lens-item" data-lens-name="${nm}">${nm}</button>`).join('');
      listEl!.innerHTML = html || '<div style="color:#666; font-size:12px;">No saved lenses</div>';
      listEl!.querySelectorAll('.lens-item').forEach((el) => {
        el.addEventListener('click', async () => {
          const nm = (el as HTMLElement).getAttribute('data-lens-name')!;
          await loadLens(nm);
        });
      });
    } catch (err) {
      listEl!.innerHTML = `<div class="cv-error">Failed to list lenses: ${(err as any)?.message || err}</div>`;
    }
  }

  async function loadLens(name: string): Promise<void> {
    try {
      const raw = await fetchJson(`/out/lenses/${encodeURIComponent(name)}.json`);
      const lens = raw as Lens;
      currentName = name;
      updateHeader();
      // Apply grouping and filter mode via host setters first to keep app state in sync
      try { await ctx.setGroupFolders(!!lens.viewer?.groupFolders); } catch {}
      try { ctx.setFilterMode((lens.viewer?.filterMode as any) || 'fade'); } catch {}
      await applyLens(cy, lens, { graph, annotations, groupFolders: !!lens.viewer?.groupFolders, filterMode: (lens.viewer?.filterMode as any) || 'fade', layoutName: 'elk-then-fcose' });
    } catch (err) {
      alert(`Failed to load lens: ${(err as any)?.message || err}`);
    }
  }

  async function saveAs(): Promise<void> {
    const name = prompt('Lens name? (A–Z, a–z, 0–9, -, _)');
    if (!name) return;
    const safe = name.replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 64);
    if (!safe) { alert('Invalid name'); return; }
    try {
      const lens = buildLens(cy, { graph, annotations, groupFolders: ctx.getGroupFolders(), filterMode: (ctx.getFilterMode() as any) || 'fade', layoutName: 'elk-then-fcose' });
      lens.name = safe;
      lens.modifiedAt = new Date().toISOString();
      await postJson('/api/lens/save', { name: safe, lens });
      currentName = safe;
      updateHeader();
      await refreshList();
    } catch (err) {
      alert(`Failed to save lens: ${(err as any)?.message || err}`);
    }
  }

  async function save(): Promise<void> {
    if (!currentName) return;
    try {
      const lens = buildLens(cy, { graph, annotations, groupFolders: ctx.getGroupFolders(), filterMode: (ctx.getFilterMode() as any) || 'fade', layoutName: 'elk-then-fcose' });
      lens.name = currentName;
      lens.modifiedAt = new Date().toISOString();
      await postJson('/api/lens/save', { name: currentName, lens });
      await refreshList();
    } catch (err) {
      alert(`Failed to save lens: ${(err as any)?.message || err}`);
    }
  }

  async function remove(): Promise<void> {
    if (!currentName) return;
    if (!confirm(`Delete lens '${currentName}'?`)) return;
    try {
      const res = await fetch(`/api/lens/${encodeURIComponent(currentName)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      currentName = null;
      updateHeader();
      await refreshList();
    } catch (err) {
      alert(`Failed to delete lens: ${(err as any)?.message || err}`);
    }
  }

  if (saveAsBtn) saveAsBtn.onclick = () => { saveAs(); };
  if (saveBtn) saveBtn.onclick = () => { save(); };
  if (deleteBtn) deleteBtn.onclick = () => { remove(); };

  await refreshList();
}


