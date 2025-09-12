import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
(cytoscape as any).use(fcose);
import elk from "cytoscape-elk";
(cytoscape as any).use(elk as any);
import expandCollapse from "cytoscape-expand-collapse";
(cytoscape as any).use(expandCollapse as any);
import type { Core } from "cytoscape";
import cxtmenu from "cytoscape-cxtmenu";
(cytoscape as any).use(cxtmenu as any);
import { graphToElements } from "./elements.js";
import { generateStyles, applyModuleColorTint, applyGroupBackgroundColors } from "./style.js";
import { defaultTokensLight } from "./style-tokens.js";
import { InteractionManager } from "./interaction-manager.js";
import { search } from "./search.js";
import type { Graph, ViewerConfig } from "./graph-types.js";
import { applyLayout, normalizeLayoutName } from "./layout-manager.js";
import { loadGraph as loadGraphRaw, loadAnnotations } from "./load-graph.js";
import { initFileOpener } from "./file-opener.js";
import { renderDetails } from "./details-panel.js";

async function loadGraph(): Promise<Graph> { return await loadGraphRaw(process.env.NODE_ENV !== 'production'); }

async function loadViewerConfig(): Promise<ViewerConfig> {
  const res = await fetch('/viewer-config.json');
  return await res.json();
}

export async function initApp() {
  const [graph, vcfg, annotations] = await Promise.all([loadGraph(), loadViewerConfig(), loadAnnotations()]);
  // Prepare tokens override from config colors, if provided
  const tokens = { ...defaultTokensLight } as any;
  if (vcfg && vcfg.colors) {
    if (vcfg.colors.moduleBg && typeof vcfg.colors.moduleBg.h === 'number') tokens.colors.node.moduleBg = vcfg.colors.moduleBg as any;
    if (vcfg.colors.folderBg && typeof vcfg.colors.folderBg.h === 'number') tokens.colors.node.folderBg = vcfg.colors.folderBg as any;
  }

  // Initialize file opener with workspace root
  initFileOpener(vcfg);

  let groupFolders = true; // default: group by folders
  let layoutName = normalizeLayoutName(vcfg.layout);
  // Precompute module -> file mapping for quick lookups (used by search suggestions)
  const moduleToFile = new Map<string, string>();
  try {
    for (const n of graph.nodes) {
      if (n.module && n.file && !moduleToFile.has(n.module)) moduleToFile.set(n.module, n.file);
    }
  } catch {}
  const elements = graphToElements(graph, { mode: 'explore' as any, groupFolders });
  const cy = cytoscape({
    container: document.getElementById('cy') as HTMLElement,
    elements,
    style: generateStyles(tokens, { highlight: vcfg.highlight }),
    wheelSensitivity: typeof vcfg.wheelSensitivity === 'number' ? vcfg.wheelSensitivity : undefined,
    pixelRatio: 1.5,
    textureOnViewport: true,
    motionBlur: false,
    motionBlurOpacity: 0.0,
    hideEdgesOnViewport: true,
    hideLabelsOnViewport: true,
    // Allow Shift+drag box selection and Shift+click additive semantics
    boxSelectionEnabled: false
  });
  (window as any).__cy = cy; // expose for e2e tests

  // Keep Cytoscape aware of container size changes
  try {
    const container = document.getElementById('cy') as HTMLElement | null;
    if (container && typeof (window as any).ResizeObserver !== 'undefined') {
      const ro = new (window as any).ResizeObserver(() => { try { cy.resize(); } catch {} });
      ro.observe(container);
    }
  } catch {}

  // Forward important console messages to server log in dev
  try {
    const send = (m: string) => { try { fetch('/api/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: m }) }); } catch {} };
    const origWarn = console.warn.bind(console);
    console.warn = (...args: any[]) => {
      try {
        origWarn(...args);
        const s = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        if (s.length < 1500) send(`[warn] ${s}`);
      } catch {}
    };
    const origError = console.error ? console.error.bind(console) : origWarn;
    console.error = (...args: any[]) => {
      try {
        origError(...args);
        const s = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        if (s.length < 1500) send(`[error] ${s}`);
      } catch {}
    };
  } catch {}

  applyModuleColorTint(cy);
  applyGroupBackgroundColors(cy, tokens);

  // Initialize expand/collapse if available (disable animation/fisheye; lightweight layout)
  try {
    const ec = (cy as any).expandCollapse
      ? (cy as any).expandCollapse({ layoutBy: { name: 'fcose', animate: false, randomize: false, numIter: 250 }, animate: false, fisheye: false, groupEdgesOfSameTypeOnCollapse: true, edgeTypeInfo: 'type' })
      : null;
    // Targeted aggregator: keep aggregates only where at least one endpoint is a collapsed node
    const reaggregateEdges = () => {
      try {
        const api = (cy as any).expandCollapse('get');
        if (!api) return;
        // Reset any prior collapsed-edge aggregates
        if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
        // For each collapsed node, find direct meta-edges and collapse parallel edges by other endpoint+type
        const collapsedNodes = cy.nodes('.cy-expand-collapse-collapsed-node');
        if (!collapsedNodes || collapsedNodes.length === 0) return;
        collapsedNodes.forEach((cn: any) => {
          // Candidate edges connected to this collapsed node
          const connected = cn.connectedEdges();
          // Group by (otherId, type)
          const bins: Record<string, any[]> = {};
          connected.forEach((e: any) => {
            const type = String(e.data('type') || e.data('edgeType') || 'unknown');
            const src = e.source();
            const tgt = e.target();
            const other = src.id() === cn.id() ? tgt : src;
            const key = other.id() + '::' + type;
            (bins[key] = bins[key] || []).push(e);
          });
          Object.values(bins).forEach((edges: any[]) => {
            if (edges.length < 2) return; // nothing to aggregate
            try {
              const col = cy.collection(edges);
              if (typeof api.collapseEdgesBetweenNodes === 'function') {
                api.collapseEdgesBetweenNodes(col.connectedNodes(), { groupEdgesOfSameTypeOnCollapse: true, edgeTypeInfo: 'type' });
              } else if (typeof api.collapseEdges === 'function') {
                api.collapseEdges(col, { groupEdgesOfSameTypeOnCollapse: true, edgeTypeInfo: 'type' });
              }
            } catch {}
          });
        });
      } catch {}
    };
    // Expose for tests/devtools
    (window as any).__cv = Object.assign((window as any).__cv || {}, { reaggregateCollapsedEdges: reaggregateEdges });
    // Auto-collapse all groups (any compound node) on first load
    if (ec) {
      const groups = cy.nodes('node:parent');
      if (groups && groups.length > 0) ec.collapse(groups, { animate: false });
      // After collapsing, aggregate edges only around collapsed groups
      reaggregateEdges();
    }
    // Double-click (or quick double-tap) to toggle collapse on any group
    if ((cy as any).expandCollapse) {
      let lastTapTs = 0;
      let lastTapId: string | null = null;
      const toggleCollapse = (node: any) => {
        try {
          const api = (cy as any).expandCollapse('get');
          if (!api) return;
          if (api.isExpandable(node)) {
            // Expand any collapsed edges first so node expand can repair meta-edges back to originals
            try { if (typeof api.expandAllEdges === 'function') api.expandAllEdges(); } catch {}
            api.expand(node, { animate: false });
          } else if (api.isCollapsible(node)) {
            api.collapse(node, { animate: false });
          }
          // Refresh edge aggregation after toggle to keep group-level edges compact
          reaggregateEdges();
        } catch (err) {
          console.warn('expand/collapse toggle failed', err);
        }
      };
      cy.on('tap', 'node:parent', (evt) => {
        try {
          // Prefer native double-click count when available
          const oe: any = (evt as any).originalEvent;
          if (oe && typeof oe.detail === 'number' && oe.detail >= 2) {
            toggleCollapse(evt.target);
            lastTapId = null;
            lastTapTs = 0;
            return;
          }
          // Fallback: detect double-tap within 300ms on same node
          const now = performance.now();
          const id = String(evt.target.id());
          if (lastTapId === id && (now - lastTapTs) < 300) {
            toggleCollapse(evt.target);
            lastTapId = null;
            lastTapTs = 0;
          } else {
            lastTapId = id;
            lastTapTs = now;
          }
        } catch {}
      });
    }
  } catch {}

  // Set initial document title with project name
  try {
    const baseTitle = 'CodeViz (TS)';
    const project = (vcfg.projectName || graph.rootDir?.split(/[\\\/]/).pop() || '').trim();
    document.title = project ? `${project} – ${baseTitle}` : baseTitle;
  } catch {}

  const layoutInfo = document.getElementById('layoutInfo');
  if (layoutInfo) layoutInfo.textContent = `Layout: ${layoutName}`;
  // Modes removed; Explore is the default/static mode
  // Instrument layout timing
  const t0 = performance.now();
  await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
  try { console.debug(`[cv] layout '${layoutName}' done in ${(performance.now()-t0).toFixed(1)}ms`); } catch {}
  try { requestAnimationFrame(() => { try { cy.resize(); cy.fit(cy.elements(':visible'), 20); } catch {} }); } catch {}

  const im = InteractionManager(cy, graph, vcfg);
  im.installBasics();
  // Install context menu (node/group)
  try {
    const mod = await import('./context-menu.js');
    mod.installContextMenu(cy, graph, vcfg, im);
  } catch (err) {
    console.warn('Context menu unavailable:', err);
  }
  // Annotations status (optional)
  try {
    const annStatus = document.getElementById('annStatus');
    if (annStatus) {
      if (annotations && Array.isArray(annotations.nodes)) {
        const count = annotations.nodes.length;
        annStatus.textContent = `Annotations: loaded (${count} nodes)`;
        annStatus.style.color = '#059669';
      } else {
        annStatus.textContent = 'Annotations: none (optional)';
        annStatus.style.color = '#9CA3AF';
        console.warn('[cv] No llm_annotation.json found – proceeding without annotations');
      }
    }
  } catch {}
  // TODO: use annotations to render tag-based filter widget (v1.1)

  // Update title based on selection focus
  try {
    const baseTitle = document.title;
    cy.on('tap', 'node', (evt) => {
      try {
        const n = evt.target as any;
        const label = String(n.data('label') || n.id());
        const nodeType = String(n.data('type') || '');
        const moduleName = String(n.data('module') || '');
        const prefix = nodeType === 'function' && moduleName ? `${moduleName}.${label}` : label;
        const project = (vcfg.projectName || graph.rootDir?.split(/[\\\/]/).pop() || '').trim();
        document.title = project
          ? `${prefix ? prefix + ' – ' : ''}${project} – CodeViz (TS)`
          : `${prefix ? prefix + ' – ' : ''}CodeViz (TS)`;
      } catch {}
    });
    cy.on('tap', (evt) => {
      if ((evt as any).target === cy) {
        try {
          const project = (vcfg.projectName || graph.rootDir?.split(/[\\\/]/).pop() || '').trim();
          document.title = project ? `${project} – CodeViz (TS)` : 'CodeViz (TS)';
        } catch {}
      }
    });
  } catch {}

  // Test hook: allow E2E tests (and dev console) to execute compact commands
  (window as any).__execCommands = async (commands: any[]) => {
    try {
      const mod = await import('./command-executor.js');
      await mod.executeCompactCommands(cy, commands);
    } catch (err) {
      console.warn('execCommands error:', err);
    }
  };

  // Optional: expose sets listing for snapshot without leaking IDs
  try {
    const mod = await import('./command-executor.js');
    if (typeof (mod as any).listNamedSets === 'function') {
      (window as any).__codevizSets = { list: () => (mod as any).listNamedSets() };
    }
  } catch {}

  // Lazy-init tooltips (modules + functions)
  try {
    const mod = await import('./tooltips/TooltipManager.js');
    mod.installTooltips(cy);
  } catch (err) {
    // Non-fatal if tooltips are not available
    console.warn('Tooltips not available:', err);
  }

  const callsToggle = document.getElementById('toggleCalls') as HTMLInputElement;
  if (callsToggle) callsToggle.addEventListener('change', () => { cy.edges('[type = "calls"]').style('display', callsToggle.checked ? 'element' : 'none'); });
  const importsToggle = document.getElementById('toggleImports') as HTMLInputElement;
  if (importsToggle) importsToggle.addEventListener('change', () => { cy.edges('[type = "imports"]').style('display', importsToggle.checked ? 'element' : 'none'); });
  const fnToggle = document.getElementById('toggleFunctions') as HTMLInputElement;
  if (fnToggle) fnToggle.addEventListener('change', () => { cy.nodes('[type = "function"]').style('display', fnToggle.checked ? 'element' : 'none'); scheduleOverviewRefresh(); });
  const clsToggle = document.getElementById('toggleClasses') as HTMLInputElement;
  if (clsToggle) clsToggle.addEventListener('change', () => { cy.nodes('[type = "class"]').style('display', clsToggle.checked ? 'element' : 'none'); scheduleOverviewRefresh(); });
  const varToggle = document.getElementById('toggleVariables') as HTMLInputElement;
  if (varToggle) varToggle.addEventListener('change', () => { cy.nodes('[type = "variable"]').style('display', varToggle.checked ? 'element' : 'none'); scheduleOverviewRefresh(); });

  const filterMode = document.getElementById('filterMode') as HTMLSelectElement;
  if (filterMode) filterMode.addEventListener('change', () => { im.setFilterMode(filterMode.value as any); scheduleOverviewRefresh(); });

  // Group-by UI wiring
  try {
    const groupFoldersToggle = document.getElementById('toggleGroupFolders') as HTMLInputElement | null;
    if (groupFoldersToggle) {
      groupFoldersToggle.checked = groupFolders;
      groupFoldersToggle.addEventListener('change', async () => {
        groupFolders = groupFoldersToggle.checked;
        const newElements = graphToElements(graph, { mode: 'explore' as any, groupFolders });
        cy.batch(() => {
          cy.elements().remove();
          cy.add(newElements);
          applyModuleColorTint(cy);
          applyGroupBackgroundColors(cy, tokens);
        });
        // Collapse all groups by default when regrouping
        try {
          const api = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
          if (api) {
            const groups = cy.nodes('node:parent');
            if (groups.length > 0) api.collapse(groups, { animate: false });
            // Targeted edge aggregation
            reaggregateEdges();
          }
        } catch {}
        await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
        try { requestAnimationFrame(() => { try { cy.resize(); cy.fit(cy.elements(':visible'), 20); } catch {} }); } catch {}
        scheduleOverviewRefresh();
      });
    }
  } catch {}

  // Layout selector wiring
  const layoutSelect = document.getElementById('layoutSelect') as HTMLSelectElement;
  if (layoutSelect) {
    layoutSelect.value = layoutName;
    layoutSelect.addEventListener('change', async () => {
      layoutName = normalizeLayoutName(layoutSelect.value);
      if (layoutInfo) layoutInfo.textContent = `Layout: ${layoutName}`;
      await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
      try { requestAnimationFrame(() => { try { cy.resize(); cy.fit(cy.elements(':visible'), 20); } catch {} }); } catch {}
    });
  }

  // Recompute layout helper (shared by button and programmatic calls)
  async function recomputeLayoutLocal(aggressive: boolean = false): Promise<void> {
    try {
      // Snapshot current visibility to preserve hidden/visible states across layout
      const prevDisplay: Record<string, string> = {};
      try {
        const all = cy.elements();
        for (let i = 0; i < all.length; i++) {
          const el = all[i];
          try { prevDisplay[el.id()] = String(el.style('display')); } catch {}
        }
      } catch {}
      let sub: any = undefined;
      try {
        const sel = cy.$(':selected');
        if (sel && sel.length > 0) {
          sub = (sel as any).closedNeighborhood ? (sel as any).closedNeighborhood() : sel.neighborhood().union(sel);
        }
      } catch {}
      const opts: any = { hybridMode: vcfg.hybridMode as any };
      if (aggressive) opts.fcose = { randomize: true, numIter: 1200 };
      if (sub && sub.length > 0) opts.eles = sub;
      await applyLayout(cy, layoutName, opts);
      // Restore previous visibility exactly
      try {
        cy.batch(() => {
          for (const id in prevDisplay) {
            try { cy.getElementById(id).style('display', prevDisplay[id]); } catch {}
          }
        });
      } catch {}
    } catch {}
  }

  // Recompute layout (no side effects; keep selection/filters/viewport)
  const recomputeLayoutBtn = document.getElementById('recomputeLayoutBtn') as HTMLButtonElement | null;
  if (recomputeLayoutBtn) {
    recomputeLayoutBtn.addEventListener('click', async () => {
      try { await recomputeLayoutLocal(false); } catch {}
    });
  }

  // Aggressive recompute: same layout but with stronger fCoSE settings
  const recomputeAggressiveBtn = document.getElementById('recomputeAggressiveBtn') as HTMLButtonElement | null;
  if (recomputeAggressiveBtn) {
    recomputeAggressiveBtn.addEventListener('click', async () => {
      try { await recomputeLayoutLocal(true); } catch {}
    });
  }

  // Recenter viewport to visible elements
  const recenterBtn = document.getElementById('recenterBtn') as HTMLButtonElement | null;
  if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
      try { (cy as any).resize?.(); } catch {}
      try {
        const sel = cy.$(':selected:visible');
        if (sel && sel.length > 0) { cy.fit(sel, 20); return; }
        // If nothing is selected, fit to current focus/highlight set if present
        const focusNodes = cy.$('node.focus, node.incoming-node, node.outgoing-node, node.second-degree').filter(':visible');
        const focusEdges = cy.$('edge.incoming-edge, edge.outgoing-edge, edge.second-degree').filter(':visible');
        const focusSet = focusNodes.union(focusEdges);
        if (focusSet && focusSet.length > 0) { cy.fit(focusSet, 20); return; }
        cy.fit(cy.elements(':visible'), 20);
      } catch {}
    });
  }

  // Clear selection only
  const clearSelectionBtn = document.getElementById('clearSelectionBtn') as HTMLButtonElement | null;
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', () => {
      try { (cy as any).$(':selected').unselect(); } catch {}
      try { im.clearFocus(); } catch {}
      // Refresh details to overview if nothing selected
      try {
        const detailsElNow = document.getElementById('details') as HTMLElement | null;
        if (detailsElNow) {
          import('./details-panel.js').then(m => m.renderDetails(detailsElNow, null));
        }
      } catch {}
      try { scheduleOverviewRefresh(); } catch {}
    });
  }

  // Clear only styling/highlight classes (do not change display)
  const clearStylingBtn = document.getElementById('clearStylingBtn') as HTMLButtonElement | null;
  if (clearStylingBtn) {
    clearStylingBtn.addEventListener('click', () => {
      try {
        cy.elements().removeClass('faded');
        cy.elements().removeClass('focus incoming-node outgoing-node second-degree module-highlight');
      } catch {}
      scheduleOverviewRefresh();
    });
  }

  // Clear filters: reset search, filter mode, and element toggles to defaults
  const clearFiltersBtn = document.getElementById('clearFiltersBtn') as HTMLButtonElement | null;
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      try {
        // Reset search
        const sb = document.getElementById('searchBox') as HTMLInputElement | null;
        if (sb) { sb.value = ''; }
        search(cy, '', 'fade');
        // Reset filter mode to fade
        const fm = document.getElementById('filterMode') as HTMLSelectElement | null;
        if (fm) { fm.value = 'fade'; im.setFilterMode('fade'); }
        // Reset toggles to checked and apply
        const toggleIds = [
          'toggleCalls','toggleImports','toggleFunctions','toggleClasses','toggleVariables'
        ];
        for (const id of toggleIds) {
          const el = document.getElementById(id) as HTMLInputElement | null;
          if (el) {
            el.checked = true;
            el.dispatchEvent(new Event('change'));
          }
        }
      } catch {}
      scheduleOverviewRefresh();
    });
  }

  // Expand / Collapse all groups (if plugin available)
  const expandAllBtn = document.getElementById('expandAllBtn') as HTMLButtonElement | null;
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      try {
        const api = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
        // Expand collapsed edges first to ensure original per-node edges are restored
        if (api && typeof api.expandAllEdges === 'function') api.expandAllEdges();
        if (api && typeof api.expandAll === 'function') api.expandAll({ animate: false });
        // Re-aggregate collapsed edges if helper exists
        try { (window as any).__cv?.reaggregateCollapsedEdges?.(); } catch {}
      } catch {}
    });
  }
  const collapseAllBtn = document.getElementById('collapseAllBtn') as HTMLButtonElement | null;
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      try {
        const api = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
        if (api && typeof api.collapseAll === 'function') api.collapseAll({ animate: false });
        try { (window as any).__cv?.reaggregateCollapsedEdges?.(); } catch {}
      } catch {}
    });
  }

  // Typeahead search dropdown + existing filter behaviour
  const searchBox = document.getElementById('searchBox') as HTMLInputElement;
  const searchResultsEl = document.getElementById('searchResults') as HTMLDivElement | null;
  const searchContainer = searchBox ? (searchBox.parentElement as HTMLElement | null) : null;
  if (searchBox) {
    type Suggestion = { id: string; label: string; module: string; file: string; kind: string };
    let timer: any;
    let suggestions: Suggestion[] = [];
    let selectedIndex = -1;

    const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

    function computeSuggestions(q: string): Suggestion[] {
      const query = (q || '').trim().toLowerCase();
      if (!query) return [];
      // cat priority: 0 = folder, 1 = module (file), 2 = entity (function/class/variable)
      const scored: Array<{ s: Suggestion; score: number; cat: number }> = [];

      // Entity nodes (functions, classes, variables) from raw graph
      // Modes were removed; always include entities in suggestions
      try {
        for (const n of graph.nodes) {
          const id = String(n.id || '');
          const label = String(n.label || '');
          const moduleName = String(n.module || '');
          const file = String(n.file || '');
          const fields = [id.toLowerCase(), label.toLowerCase(), moduleName.toLowerCase(), file.toLowerCase()];
          const indexes = fields.map((f) => f.indexOf(query)).filter((i) => i >= 0);
          if (indexes.length === 0) continue;
          const score = Math.min(...indexes);
          scored.push({ s: { id, label, module: moduleName, file, kind: String(n.kind || '') }, score, cat: 2 });
        }
      } catch {}

      // Group nodes: modules (files)
      try {
        const mods = cy.nodes('node[type = "module"]');
        mods.forEach((mn: any) => {
          const id: string = String(mn.id()); // e.g. module:path/to/file.py
          const label: string = String(mn.data('label') || mn.data('path') || id);
          const modPath: string = String(mn.data('path') || '');
          const repFile: string = moduleToFile.get(modPath) || '';
          const fields = [id.toLowerCase(), label.toLowerCase(), modPath.toLowerCase(), repFile.toLowerCase()];
          const indexes = fields.map((f) => f.indexOf(query)).filter((i) => i >= 0);
          if (indexes.length === 0) return;
          const score = Math.min(...indexes);
          scored.push({ s: { id, label, module: modPath, file: repFile, kind: 'module' }, score, cat: 1 });
        });
      } catch {}

      // Group nodes: folders
      try {
        const flds = cy.nodes('node[type = "folder"]');
        flds.forEach((fn: any) => {
          const id: string = String(fn.id()); // e.g. folder:src/utils
          const label: string = String(fn.data('label') || fn.data('path') || id);
          const path: string = String(fn.data('path') || '');
          const fields = [id.toLowerCase(), label.toLowerCase(), path.toLowerCase()];
          const indexes = fields.map((f) => f.indexOf(query)).filter((i) => i >= 0);
          if (indexes.length === 0) return;
          const score = Math.min(...indexes);
          scored.push({ s: { id, label, module: '', file: path, kind: 'folder' }, score, cat: 0 });
        });
      } catch {}

      scored.sort((a, b) => (a.cat - b.cat) || (a.score - b.score) || a.s.label.localeCompare(b.s.label));
      return scored.slice(0, 30).map((x) => x.s);
    }

    function renderDropdown(list: Suggestion[]): void {
      if (!searchResultsEl) return;
      if (list.length === 0) {
        searchResultsEl.innerHTML = '';
        searchResultsEl.hidden = true;
        return;
      }
      const html = list.map((it, idx) => {
        const selected = idx === selectedIndex ? ' selected' : '';
        const title = `${escapeHtml(it.label || it.id)}`;
        const meta = `${escapeHtml(it.module || '')}${it.module && it.file ? ' — ' : ''}${escapeHtml(it.file || '')}`;
        const kind = escapeHtml(it.kind || '');
        return `
          <div class="search-result-item${selected}" data-node-id="${escapeHtml(it.id)}">
            <div class="search-result-title">
              <span>${title}</span>
              ${kind ? `<span class="search-result-badge">${kind}</span>` : ''}
            </div>
            <div class="search-result-meta">${meta}</div>
          </div>
        `;
      }).join('');
      searchResultsEl.innerHTML = html;
      searchResultsEl.hidden = false;
      // Wire clicks
      Array.from(searchResultsEl.querySelectorAll('[data-node-id]')).forEach((el, idx) => {
        el.addEventListener('mouseenter', () => { selectedIndex = idx; updateSelectionHighlight(); });
        el.addEventListener('click', (evt) => {
          evt.preventDefault();
          const id = (el as HTMLElement).getAttribute('data-node-id')!;
          focusNode(id);
        });
      });
    }

    function updateSelectionHighlight(): void {
      if (!searchResultsEl) return;
      const items = Array.from(searchResultsEl.querySelectorAll('.search-result-item')) as HTMLElement[];
      items.forEach((el, i) => {
        if (i === selectedIndex) el.classList.add('selected'); else el.classList.remove('selected');
      });
    }

    function hideDropdown(): void {
      if (!searchResultsEl) return;
      searchResultsEl.hidden = true;
    }

    function showDropdown(): void {
      if (!searchResultsEl) return;
      if (suggestions.length > 0) searchResultsEl.hidden = false;
    }

    function focusNode(nodeId: string): void {
      try { im.clearFocus(); } catch {}
      try { im.focus(nodeId); } catch {}
      try {
        const node = cy.getElementById(nodeId);
        if (node && !node.empty()) {
          try { node.select(); } catch {}
          try { cy.center(node); } catch {}
          try {
            const detailsNow = document.getElementById('details') as HTMLElement | null;
            if (detailsNow) renderDetails(detailsNow, node as any);
          } catch {}
        }
      } catch {}
      // Recompute layout using current selection after focusing
      try { recomputeLayoutLocal(false); } catch {}
      hideDropdown();
    }

    searchBox.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Keep existing filter behaviour
        search(cy, searchBox.value, 'fade');
        // Update suggestions dropdown
        selectedIndex = -1;
        suggestions = computeSuggestions(searchBox.value);
        renderDropdown(suggestions);
        scheduleOverviewRefresh();
      }, 150);
    });

    searchBox.addEventListener('keydown', (ev) => {
      if (!searchResultsEl || searchResultsEl.hidden) return;
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (suggestions.length === 0) return;
        selectedIndex = (selectedIndex + 1) % suggestions.length;
        updateSelectionHighlight();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (suggestions.length === 0) return;
        selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
        updateSelectionHighlight();
      } else if (ev.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          ev.preventDefault();
          focusNode(suggestions[selectedIndex].id);
        }
        // if no selection, leave existing filter behaviour in place
      } else if (ev.key === 'Escape') {
        hideDropdown();
      }
    });

    // Hide dropdown on outside click
    document.addEventListener('click', (e) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (searchContainer && !searchContainer.contains(target)) hideDropdown();
    });

    // Show dropdown when input focused if there are suggestions
    searchBox.addEventListener('focus', () => { if (suggestions.length > 0) showDropdown(); });
  }

  const detailsEl = document.getElementById('details') as HTMLElement;
  if (detailsEl) {
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      // expose annotations for details-pane consumption
      (window as any).__cv_annotations = annotations;
      renderDetails(detailsEl, node);
    });
    cy.on('tap', (evt) => {
      if (evt.target === cy) renderDetails(detailsEl, null);
    });
  }

  // Throttled overview refresh when no selection is active
  const scheduleOverviewRefresh = (() => {
    let scheduled = false;
    return () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        try {
          const selected = cy.$(':selected');
          if (selected && selected.length > 0) return; // do not overwrite selection details
          const detailsNow = document.getElementById('details') as HTMLElement | null;
          if (!detailsNow) return;
          import('./details-panel.js').then(m => m.renderDetails(detailsNow, null)).catch(() => {});
        } catch {}
      }, 120);
    };
  })();

  // Initial render: show hierarchical overview on first load
  try {
    const detailsNow = document.getElementById('details') as HTMLElement | null;
    if (detailsNow) {
      renderDetails(detailsNow, null);
    }
  } catch {}

  // Lazy-load chat client
  try {
    const chatRoot = document.getElementById('chat');
    if (chatRoot) {
      const mod = await import('./chat/chat.js');
      mod.initChat();
    }
  } catch (err) {
    console.warn('Chat unavailable:', err);
  }
}


