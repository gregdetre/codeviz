import type { Core } from "cytoscape";
import type { Graph } from "./graph-types.js";
import { updateAutoGroupVisibility } from "./visibility.js";

export type TagIndex = {
  allTagKeys: string[]; // includes pinned and 'untagged' sentinel
  tagKeyToDisplay: Map<string, string>;
  tagKeyToNodeIds: Map<string, Set<string>>; // function nodes only
  untaggedNodeIds: Set<string>; // function nodes with no tags
};

function normalizeTag(tag: string): string {
  return (tag || "").trim().toLowerCase();
}

function displayNameFor(tagKey: string, casePool?: string[]): string {
  const key = normalizeTag(tagKey);
  if (key === 'important') return 'Important';
  if (key === 'entrypoint') return 'Entrypoint';
  if (key === 'untagged') return 'Untagged';
  // Prefer original-cased token from provided pool when available
  if (casePool && casePool.length > 0) {
    const found = casePool.find(t => normalizeTag(t) === key);
    if (found) return found;
  }
  // Fallback: Title-case
  return key.length ? key.charAt(0).toUpperCase() + key.slice(1) : key;
}

function classNameForTag(tagKey: string): string {
  const norm = normalizeTag(tagKey).replace(/[^a-z0-9_\-]+/g, '-');
  return `cv-tag-${norm}`;
}

export function buildTagIndex(graph: Graph, annotations: any | null): TagIndex {
  const functionNodeIds = new Set<string>();
  for (const n of graph.nodes) {
    if (String(n.kind) === 'function') functionNodeIds.add(n.id);
  }

  const tagKeyToNodeIds = new Map<string, Set<string>>();
  const untaggedNodeIds = new Set<string>();

  const globalTags: string[] = Array.isArray(annotations?.globalTags) ? annotations.globalTags.slice() : [];
  const projectTags: string[] = Array.isArray(annotations?.projectTags) ? annotations.projectTags.slice() : [];
  const allConfigured = [...globalTags, ...projectTags];

  // Node -> tags mapping from annotations
  const nodeEntries: Array<{ id: string; tags: string[] }> = Array.isArray(annotations?.nodes)
    ? annotations.nodes.map((n: any) => ({ id: String(n?.id || ''), tags: Array.isArray(n?.tags) ? n.tags.map(String) : [] }))
    : [];

  const nodeIdToTags = new Map<string, string[]>();
  for (const e of nodeEntries) nodeIdToTags.set(e.id, e.tags);

  // Populate tag -> node ids, restricted to function nodes
  for (const fnId of functionNodeIds) {
    const tagsRaw = nodeIdToTags.get(fnId) || [];
    const tags = tagsRaw.map(normalizeTag).filter(t => t.length > 0);
    if (!tags || tags.length === 0) {
      untaggedNodeIds.add(fnId);
      continue;
    }
    for (const t of tags) {
      if (!tagKeyToNodeIds.has(t)) tagKeyToNodeIds.set(t, new Set());
      tagKeyToNodeIds.get(t)!.add(fnId);
    }
  }

  // All tag keys: pinned, untagged, configured, and observed
  const observedTagKeys = Array.from(tagKeyToNodeIds.keys());
  const pinned: string[] = ['important', 'entrypoint'];
  const keysSet = new Set<string>();
  for (const p of pinned) keysSet.add(p);
  keysSet.add('untagged');
  for (const t of allConfigured) keysSet.add(normalizeTag(t));
  for (const t of observedTagKeys) keysSet.add(normalizeTag(t));
  const allTagKeys = Array.from(keysSet);

  // Display names, prefer configured case when available
  const casePool = allConfigured.concat(observedTagKeys);
  const tagKeyToDisplay = new Map<string, string>();
  for (const k of allTagKeys) tagKeyToDisplay.set(k, displayNameFor(k, casePool));

  return { allTagKeys, tagKeyToDisplay, tagKeyToNodeIds, untaggedNodeIds };
}

export function computeTagCounts(cy: Core | null, idx: TagIndex): Array<{ key: string; label: string; total: number; visible: number }> {
  const results: Array<{ key: string; label: string; total: number; visible: number }> = [];
  const hiddenCheck = (id: string) => {
    if (!cy) return true;
    try { const el = cy.getElementById(id); return !el || el.empty() ? true : (String(el.style('display')) === 'none') || el.hasClass('cv-tag-hidden'); } catch { return true; }
  };
  for (const key of idx.allTagKeys) {
    const label = idx.tagKeyToDisplay.get(key) || key;
    let total = 0;
    let visible = 0;
    if (key === 'untagged') {
      total = idx.untaggedNodeIds.size;
      if (cy) idx.untaggedNodeIds.forEach(id => { if (!hiddenCheck(id)) visible++; });
    } else {
      const s = idx.tagKeyToNodeIds.get(key);
      total = s ? s.size : 0;
      if (cy && s) s.forEach(id => { if (!hiddenCheck(id)) visible++; });
    }
    results.push({ key, label, total, visible });
  }
  return results;
}

function sortTagKeysForDisplay(counts: Array<{ key: string; label: string; total: number }>): string[] {
  const important = 'important';
  const entrypoint = 'entrypoint';
  const untagged = 'untagged';
  const others = counts
    .filter(c => c.key !== important && c.key !== entrypoint && c.key !== untagged)
    .sort((a, b) => (b.total - a.total) || a.label.localeCompare(b.label))
    .map(c => c.key);
  const order: string[] = [important, entrypoint, untagged, ...others];
  // Ensure uniqueness and preserve order
  const seen = new Set<string>();
  const final: string[] = [];
  for (const k of order) { if (!seen.has(k)) { seen.add(k); final.push(k); } }
  // Add any missing keys (edge-cases)
  for (const c of counts) if (!seen.has(c.key)) { seen.add(c.key); final.push(c.key); }
  return final;
}

export function applyTagFilter(cy: Core, idx: TagIndex, selected: Set<string>): void {
  try { cy.style().selector('.cv-tag-hidden').style({ display: 'none' } as any).update(); } catch {}
  try { cy.style().selector('edge.cv-tag-hidden').style({ display: 'none' } as any).update(); } catch {}

  // Ensure per-tag CSS classes exist on function nodes for selector-based operations
  try {
    for (const [t, ids] of idx.tagKeyToNodeIds.entries()) {
      const cls = classNameForTag(t);
      for (const id of ids) {
        try {
          const el = cy.getElementById(id);
          if (el && !el.empty()) el.addClass(cls);
        } catch {}
      }
    }
  } catch {}

  const normSelected = new Set(Array.from(selected).map(normalizeTag));
  const selectUntagged = normSelected.has('untagged');

  // Hide/show function nodes by adding/removing overlay class only
  const shouldShowNode = (id: string): boolean => {
    if (idx.untaggedNodeIds.has(id)) return selectUntagged;
    // Collect tag keys of node
    let hasAny = false;
    for (const [t, ids] of idx.tagKeyToNodeIds.entries()) {
      if (ids.has(id)) {
        hasAny = true;
        if (normSelected.has(t)) return true;
      }
    }
    return hasAny ? false : selectUntagged; // defensive
  };

  const fnNodes = cy.nodes("node[type = 'function']");
  fnNodes.forEach(n => {
    try {
      const id = String(n.id());
      const show = shouldShowNode(id);
      if (show) n.removeClass('cv-tag-hidden');
      else n.addClass('cv-tag-hidden');
    } catch {}
  });

  // Update edges overlay class based on hidden endpoints
  try {
    const hiddenIds = new Set<string>();
    cy.nodes('.cv-tag-hidden').forEach(n => { hiddenIds.add(String(n.id())); });
    cy.edges().forEach(e => {
      try {
        const s = String(e.source().id());
        const t = String(e.target().id());
        if (hiddenIds.has(s) || hiddenIds.has(t)) e.addClass('cv-tag-hidden');
        else e.removeClass('cv-tag-hidden');
      } catch {}
    });
  } catch {}

  // Maintain auto-visibility for groups and collapsed meta-edges
  try { updateAutoGroupVisibility(cy); } catch {}
}

export async function installTagsWidget(cy: Core, graph: Graph, annotations: any | null): Promise<void> {
  try { cy.style().selector('.cv-tag-hidden').style({ display: 'none' } as any).update(); } catch {}
  try { cy.style().selector('edge.cv-tag-hidden').style({ display: 'none' } as any).update(); } catch {}

  const root = document.getElementById('tagsSection') as HTMLElement | null;
  if (!root) return;
  // Hide the section when no annotations are available
  if (!annotations || !Array.isArray(annotations.nodes)) { root.setAttribute('hidden', 'true'); return; }

  root.removeAttribute('hidden');
  const listHost = root.querySelector('#tagsList') as HTMLElement | null;
  if (!listHost) return;

  const idx = buildTagIndex(graph, annotations);

  const render = (selected: Set<string>) => {
    const counts = computeTagCounts(cy, idx);
    const order = sortTagKeysForDisplay(counts.map(c => ({ key: c.key, label: c.label, total: c.total })));
    const selectedNorm = new Set(Array.from(selected).map(normalizeTag));
    const html = [
      `<div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin:6px 0;">`+
      `<div style="font-weight:600;">Tags</div>`+
      `<div style="display:flex; gap:6px;">`+
      `<button type="button" id="tagsAllBtn" title="Select all tags">All</button>`+
      `<button type="button" id="tagsNoneBtn" title="Select none">None</button>`+
      `</div>`+
      `</div>`,
      `<div style="display:flex; flex-direction:column; gap:4px;">`+
      order.map(k => {
        const c = counts.find(x => x.key === k)!;
        const checked = selectedNorm.has(k);
        const disabled = (k === 'important' || k === 'entrypoint') && c.total === 0 ? '' : '';
        const label = c.label;
        const countText = `${c.visible}/${c.total}`;
        return `
          <label style="display:flex; align-items:center; gap:6px; font-size:13px;">
            <input type="checkbox" data-tag-key="${k}" ${checked ? 'checked' : ''} ${disabled} />
            <span>${label}</span>
            <span style="margin-left:auto; font-size:12px; color:#666;">${countText}</span>
          </label>
        `;
      }).join('')+
      `</div>`
    ].join('');
    listHost.innerHTML = html;

    // Wire events
    const allBtn = listHost.querySelector('#tagsAllBtn') as HTMLButtonElement | null;
    const noneBtn = listHost.querySelector('#tagsNoneBtn') as HTMLButtonElement | null;
    if (allBtn) allBtn.onclick = () => { const next = new Set(idx.allTagKeys); applyTagFilter(cy, idx, next); render(next); };
    if (noneBtn) noneBtn.onclick = () => { const next = new Set<string>(); applyTagFilter(cy, idx, next); render(next); };

    listHost.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.addEventListener('click', (evt: any) => {
        const key = normalizeTag(String((evt.currentTarget as HTMLElement).getAttribute('data-tag-key') || ''));
        const onlyThis = !!evt.shiftKey; // Shift-click = only this
        let next: Set<string>;
        if (onlyThis) {
          next = new Set([key]);
        } else {
          next = new Set(selectedNorm);
          if (next.has(key)) next.delete(key); else next.add(key);
        }
        applyTagFilter(cy, idx, next);
        render(next);
      });
    });
  };

  // Default: all tags selected
  render(new Set(idx.allTagKeys));
}


