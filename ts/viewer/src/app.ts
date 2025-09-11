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
import { applyLayout } from "./layout-manager.js";
import { loadGraph as loadGraphRaw } from "./load-graph.js";

async function forward(level: string, message: string, data?: any) {
  try {
    await fetch('/client-log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level, message, data }) }).catch(() => {});
  } catch {}
}

function wireLogging() {
  const origLog = console.log, origWarn = console.warn, origError = console.error;
  console.log = (...args: any[]) => { origLog.apply(console, args); forward('log', args.map(String).join(' '), args).catch(() => {}); };
  console.warn = (...args: any[]) => { origWarn.apply(console, args); forward('warn', args.map(String).join(' '), args).catch(() => {}); };
  console.error = (...args: any[]) => { origError.apply(console, args); forward('error', args.map(String).join(' '), args).catch(() => {}); };
}

async function loadGraph(): Promise<Graph> { return await loadGraphRaw(process.env.NODE_ENV !== 'production'); }

async function loadViewerConfig(): Promise<ViewerConfig> {
  const res = await fetch('/viewer-config.json');
  return await res.json();
}

export async function initApp() {
  wireLogging();
  const [graph, vcfg] = await Promise.all([loadGraph(), loadViewerConfig()]);

  let mode: ViewerMode = (vcfg.mode ?? 'default') as ViewerMode;
  const layoutName = (vcfg.layout ?? 'elk') as 'elk'|'fcose'|'hybrid';
  const elements = graphToElements(graph, { mode });
  const cy = cytoscape({ container: document.getElementById('cy') as HTMLElement, elements, style: generateStyles() });

  applyModuleColorTint(cy);

  const layoutInfo = document.getElementById('layoutInfo');
  if (layoutInfo) layoutInfo.textContent = `Layout: ${layoutName}`;
  const modeInfo = document.getElementById('modeInfo');
  if (modeInfo) modeInfo.textContent = `Mode: ${mode}`;
  await applyLayout(cy, layoutName, { hybridMode: vcfg.hybridMode as any });

  const im = InteractionManager(cy);
  im.installBasics();

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

  const refineBtn = document.getElementById('refineBtn') as HTMLButtonElement;
  if (refineBtn && layoutName === 'hybrid') {
    refineBtn.addEventListener('click', async () => {
      await applyLayout(cy, 'fcose', { hybridMode: vcfg.hybridMode as any });
    });
  } else if (refineBtn) {
    refineBtn.disabled = true;
    refineBtn.title = 'Enable Hybrid layout to use Refine';
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
}


