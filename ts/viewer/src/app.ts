import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
(cytoscape as any).use(fcose);
import elk from "cytoscape-elk";
(cytoscape as any).use(elk as any);
import type { Core } from "cytoscape";
import { graphToElements } from "./elements.js";
import { generateStyles, applyModuleColorTint } from "./style.js";
import { InteractionManager } from "./interaction-manager.js";
import { search } from "./search.js";
import type { Graph, ViewerConfig, ViewerMode } from "./graph-types.js";
import { applyLayout, normalizeLayoutName } from "./layout-manager.js";
import { loadGraph as loadGraphRaw } from "./load-graph.js";
import { initFileOpener } from "./file-opener.js";

async function loadGraph(): Promise<Graph> { return await loadGraphRaw(process.env.NODE_ENV !== 'production'); }

async function loadViewerConfig(): Promise<ViewerConfig> {
  const res = await fetch('/viewer-config.json');
  return await res.json();
}

export async function initApp() {
  const [graph, vcfg] = await Promise.all([loadGraph(), loadViewerConfig()]);

  // Initialize file opener with workspace root
  initFileOpener(vcfg);

  let mode: ViewerMode = (vcfg.mode ?? 'explore') as ViewerMode;
  let layoutName = normalizeLayoutName(vcfg.layout);
  const elements = graphToElements(graph, { mode });
  const cy = cytoscape({ container: document.getElementById('cy') as HTMLElement, elements, style: generateStyles(undefined as any, { highlight: vcfg.highlight }) });
  (window as any).__cy = cy; // expose for e2e tests

  applyModuleColorTint(cy);

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
  await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });

  const im = InteractionManager(cy, graph, vcfg);
  im.installBasics();

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
  if (fnToggle) fnToggle.addEventListener('change', () => { cy.nodes('[type = "function"]').style('display', fnToggle.checked ? 'element' : 'none'); });
  const clsToggle = document.getElementById('toggleClasses') as HTMLInputElement;
  if (clsToggle) clsToggle.addEventListener('change', () => { cy.nodes('[type = "class"]').style('display', clsToggle.checked ? 'element' : 'none'); });
  const varToggle = document.getElementById('toggleVariables') as HTMLInputElement;
  if (varToggle) varToggle.addEventListener('change', () => { cy.nodes('[type = "variable"]').style('display', varToggle.checked ? 'element' : 'none'); });

  const filterMode = document.getElementById('filterMode') as HTMLSelectElement;
  if (filterMode) filterMode.addEventListener('change', () => im.setFilterMode(filterMode.value as any));

  const modeSelect = document.getElementById('modeSelect') as HTMLSelectElement;
  if (modeSelect) {
    modeSelect.value = mode;
    modeSelect.addEventListener('change', async () => {
      mode = modeSelect.value as ViewerMode;
      if (modeInfo) modeInfo.textContent = `Mode: ${mode}`;
      const newElements = graphToElements(graph, { mode });
      cy.elements().remove();
      cy.add(newElements);
      applyModuleColorTint(cy);
      await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
    });
  }

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
        else refineBtn.title = 'Re-run layout optimization';
      }
    };
    updateHybridVisibility();
    layoutSelect.addEventListener('change', async () => {
      layoutName = normalizeLayoutName(layoutSelect.value);
      if (layoutInfo) layoutInfo.textContent = `Layout: ${layoutName}`;
      await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });
      updateHybridVisibility();
    });
  }

  // hybrid submode UI removed; sequential is default

  const refineBtn = document.getElementById('refineBtn') as HTMLButtonElement;
  if (refineBtn) {
    refineBtn.addEventListener('click', async () => {
      await applyLayout(cy, 'fcose', { hybridMode: vcfg.hybridMode as any });
    });
  }

  const searchBox = document.getElementById('searchBox') as HTMLInputElement;
  if (searchBox) {
    let timer: any;
    searchBox.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => search(cy, searchBox.value, 'fade'), 150);
    });
  }

  const detailsEl = document.getElementById('details') as HTMLElement;
  if (detailsEl) {
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      import('./details-panel.js').then(m => m.renderDetails(detailsEl, node));
    });
    cy.on('tap', (evt) => {
      if (evt.target === cy) import('./details-panel.js').then(m => m.renderDetails(detailsEl, null));
    });
  }

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


