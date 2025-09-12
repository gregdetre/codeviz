import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
(cytoscape as any).use(fcose);
import elk from "cytoscape-elk";
(cytoscape as any).use(elk as any);
import expandCollapse from "cytoscape-expand-collapse";
(cytoscape as any).use(expandCollapse as any);
import type { Core } from "cytoscape";
import { graphToElements } from "./elements.js";
import { generateStyles, applyModuleColorTint, applyGroupBackgroundColors } from "./style.js";
import { defaultTokensLight } from "./style-tokens.js";
import { InteractionManager } from "./interaction-manager.js";
import { search } from "./search.js";
import type { Graph, ViewerConfig, ViewerMode } from "./graph-types.js";
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

  let mode: ViewerMode = (vcfg.mode ?? 'explore') as ViewerMode;
  let groupFolders = true; // default: group by folders
  let layoutName = normalizeLayoutName(vcfg.layout);
  const elements = graphToElements(graph, { mode, groupFolders });
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
    hideLabelsOnViewport: true
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
      ? (cy as any).expandCollapse({ layoutBy: { name: 'fcose', animate: false, randomize: false, numIter: 250 }, animate: false, fisheye: false })
      : null;
    // Auto-collapse folders deeper than level 1
    if (ec) {
      const foldersDeep = cy.nodes('node[type = "folder"]').filter((n: any) => Number(n.data('depth') || 0) > 1);
      if (foldersDeep.length > 0) ec.collapse(foldersDeep, { animate: false });
    }
    // Double-click (or quick double-tap) to toggle collapse on folder & module (file) groups
    if ((cy as any).expandCollapse) {
      let lastTapTs = 0;
      let lastTapId: string | null = null;
      const toggleCollapse = (node: any) => {
        try {
          const api = (cy as any).expandCollapse('get');
          if (!api) return;
          if (api.isExpandable(node)) api.expand(node, { animate: false });
          else if (api.isCollapsible(node)) api.collapse(node, { animate: false });
        } catch (err) {
          console.warn('expand/collapse toggle failed', err);
        }
      };
      cy.on('tap', 'node[type = "folder"], node[type = "module"]', (evt) => {
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
  const modeInfo = document.getElementById('modeInfo');
  if (modeInfo) modeInfo.textContent = `Mode: ${mode}`;
  // Instrument layout timing
  const t0 = performance.now();
  await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
  try { console.debug(`[cv] layout '${layoutName}' done in ${(performance.now()-t0).toFixed(1)}ms`); } catch {}
  try { requestAnimationFrame(() => { try { cy.resize(); cy.fit(cy.elements(':visible'), 20); } catch {} }); } catch {}

  const im = InteractionManager(cy, graph, vcfg);
  im.installBasics();
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

  const modeSelect = document.getElementById('modeSelect') as HTMLSelectElement;
  if (modeSelect) {
    modeSelect.value = mode;
    modeSelect.addEventListener('change', async () => {
      mode = modeSelect.value as ViewerMode;
      if (modeInfo) modeInfo.textContent = `Mode: ${mode}`;
      const newElements = graphToElements(graph, { mode, groupFolders });
      cy.batch(() => {
        cy.elements().remove();
        cy.add(newElements);
        applyModuleColorTint(cy);
        applyGroupBackgroundColors(cy, tokens);
      });
      await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
      try { requestAnimationFrame(() => { try { cy.resize(); cy.fit(cy.elements(':visible'), 20); } catch {} }); } catch {}
      scheduleOverviewRefresh();
    });
  }

  // Group-by UI wiring
  try {
    const groupFoldersToggle = document.getElementById('toggleGroupFolders') as HTMLInputElement | null;
    if (groupFoldersToggle) {
      groupFoldersToggle.checked = groupFolders;
      groupFoldersToggle.addEventListener('change', async () => {
        groupFolders = groupFoldersToggle.checked;
        const newElements = graphToElements(graph, { mode, groupFolders });
        cy.batch(() => {
          cy.elements().remove();
          cy.add(newElements);
          applyModuleColorTint(cy);
          applyGroupBackgroundColors(cy, tokens);
        });
        await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
        try { requestAnimationFrame(() => { try { cy.resize(); cy.fit(cy.elements(':visible'), 20); } catch {} }); } catch {}
        // Auto-collapse folder depth > 1
        try {
          const foldersDeep = cy.nodes('node[type = "folder"]').filter((n: any) => Number(n.data('depth') || 0) > 1);
          const ec = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
          if (ec && foldersDeep.length > 0) ec.collapse(foldersDeep);
        } catch {}
        scheduleOverviewRefresh();
      });
    }
  } catch {}

  // Layout selector wiring
  const layoutSelect = document.getElementById('layoutSelect') as HTMLSelectElement;
  if (layoutSelect) {
    layoutSelect.value = layoutName;
    const updateHybridVisibility = () => {
      const isHybrid = normalizeLayoutName(layoutSelect.value) === 'elk-then-fcose';
      const refineBtn = document.getElementById('refineBtn') as HTMLButtonElement | null;
      if (refineBtn) {
        refineBtn.disabled = !isHybrid;
        if (!isHybrid) refineBtn.title = 'Enable ELK → fCoSE layout to use Re-layout';
        else refineBtn.title = 'Re-run layout optimization (clears selection and highlighting)';
      }
    };
    updateHybridVisibility();
    layoutSelect.addEventListener('change', async () => {
      layoutName = normalizeLayoutName(layoutSelect.value);
      if (layoutInfo) layoutInfo.textContent = `Layout: ${layoutName}`;
      await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
      try { requestAnimationFrame(() => { try { cy.resize(); cy.fit(cy.elements(':visible'), 20); } catch {} }); } catch {}
      updateHybridVisibility();
    });
  }

  // hybrid submode UI removed; sequential is default

  const refineBtn = document.getElementById('refineBtn') as HTMLButtonElement;
  if (refineBtn) {
    refineBtn.addEventListener('click', async () => {
      // Clear any custom highlight/fade state managed by InteractionManager
      try { im.clearFocus(); } catch {}
      // Clear any current selection to avoid having to find whitespace
      try { (cy as any).$(':selected').unselect(); } catch {}
      // Clear details panel if present
      try {
        const detailsElNow = document.getElementById('details') as HTMLElement | null;
        if (detailsElNow) {
          import('./details-panel.js').then(m => m.renderDetails(detailsElNow, null));
        }
      } catch {}
      await applyLayout(cy, 'fcose', { hybridMode: vcfg.hybridMode as any });
      try { requestAnimationFrame(() => { try { cy.resize(); cy.fit(cy.elements(':visible'), 20); } catch {} }); } catch {}
      scheduleOverviewRefresh();
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
      const scored: Array<{ s: Suggestion; score: number }> = [];
      for (const n of graph.nodes) {
        const id = String(n.id || '');
        const label = String(n.label || '');
        const moduleName = String(n.module || '');
        const file = String(n.file || '');
        const fields = [id.toLowerCase(), label.toLowerCase(), moduleName.toLowerCase(), file.toLowerCase()];
        const indexes = fields.map((f) => f.indexOf(query)).filter((i) => i >= 0);
        if (indexes.length === 0) continue;
        const score = Math.min(...indexes);
        scored.push({ s: { id, label, module: moduleName, file, kind: String(n.kind || '') }, score });
      }
      scored.sort((a, b) => a.score - b.score || a.s.label.localeCompare(b.s.label));
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
          try { cy.center(node); } catch {}
          try {
            const detailsNow = document.getElementById('details') as HTMLElement | null;
            if (detailsNow) renderDetails(detailsNow, node as any);
          } catch {}
        }
      } catch {}
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


