import cytoscape from 'cytoscape';
// ELK for deterministic layered layout
// @ts-expect-error types may not be present for plugin
import elk from 'cytoscape-elk';
import { validateGraph } from './schema';
import type { GdvizCodebaseGraph } from './types';

cytoscape.use(elk);

type GraphData = GdvizCodebaseGraph;

function status(msg: string) {
  try { console.log('[gdviz-cyto]', msg); } catch {}
  try {
    const s = document.getElementById('status');
    if (s) s.textContent = msg;
  } catch {}
}

async function loadGraph(): Promise<GraphData> {
  const resp = await fetch('/gdviz/out/codebase_graph.json');
  if (!resp.ok) throw new Error('Failed to load /gdviz/out/codebase_graph.json');
  const json = await resp.json();
  // Dev validation (non-blocking warning)
  try {
    const v = await validateGraph(json);
    if (!v.ok) {
      console.warn('[gdviz-cyto] schema validation errors:', v.errors.slice(0, 10));
    }
  } catch (e) {
    console.warn('[gdviz-cyto] schema validation failed to run', e);
  }
  return json;
}

function hslToHex(h: number, s: number, l: number): string {
  // h: 0-360, s: 0-100, l: 0-100
  const s1 = s / 100;
  const l1 = l / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l1 - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const toHex = (v: number) => {
    const n = Math.round((v + m) * 255);
    return n.toString(16).padStart(2, '0');
  };
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function hashColorForModule(moduleName: string): string {
  let hash = 0;
  for (let i = 0; i < moduleName.length; i++) {
    hash = (hash * 31 + moduleName.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const sat = 45 + (hash % 30);
  const light = 70;
  return hslToHex(hue, sat, light);
}

function buildElements(data: GraphData): cytoscape.ElementDefinition[] {
  const elems: cytoscape.ElementDefinition[] = [];
  for (const n of data.nodes) {
    const modColorHex = hashColorForModule(n.module || '');
    // Include full node metadata so the details pane can render rich info
    elems.push({ data: { ...n, id: n.id, label: n.label || n.id, kind: n.kind || 'function', modColorHex } });
  }
  const nodeIds = new Set(data.nodes.map(n => n.id));
  for (const e of data.edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue; // guard against missing endpoints
    elems.push({ data: { id: `${e.source}->${e.target}:${e.kind}:${e.order ?? ''}`.slice(0, 200), source: e.source, target: e.target, kind: e.kind, order: e.order ?? undefined } });
  }
  return elems;
}

function style(): cytoscape.StylesheetJson {
  return [
    { selector: 'node', style: { 'background-color': '#666', 'label': 'data(label)', 'font-size': 9, 'text-valign': 'center', 'text-halign': 'center', 'color': '#111' } },
    { selector: 'node[modColorHex]', style: { 'background-color': 'data(modColorHex)' } },
    { selector: 'edge', style: { 'width': 1.2, 'line-color': '#bbb', 'target-arrow-shape': 'none', 'curve-style': 'bezier' } },
    { selector: 'edge[kind = "build_step"]', style: { 'line-color': '#2c3e50', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#2c3e50' } },
    { selector: 'edge[kind = "bash_entry"]', style: { 'line-color': '#f39c12', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#f39c12' } },
  ];
}

async function main() {
  const container = document.getElementById('app');
  if (!container) throw new Error('#app not found');
  const data = await loadGraph();
  status(`${data.nodes.length} nodes, ${data.edges.length} edges`);

  const cy = cytoscape({
    container,
    elements: buildElements(data),
    style: style(),
    // default wheel sensitivity to avoid warnings and janky zoom
  });

  async function runElkLayered() {
    await cy.layout({
      name: 'elk',
      animate: true,
      elk: { algorithm: 'layered', 'elk.layered.spacing.nodeNodeBetweenLayers': 40 },
    } as any).run();
  }

  await runElkLayered();

  function parseArgsFromSignature(sig: string | null | undefined): string[] {
    if (!sig) return [];
    const m = sig.match(/\(([^)]*)\)/);
    if (!m) return [];
    const inner = m[1].trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  function renderDetails(n: cytoscape.NodeSingular) {
    const d = document.getElementById('details');
    if (!d) return;
    const nd = n.data() as any;
    const tags = nd.tags || {};
    const tagLines: string[] = [];
    for (const k of Object.keys(tags)) {
      const vals = Array.isArray(tags[k]) ? tags[k] : [];
      if (vals.length) tagLines.push(`${k}: ${vals.join(', ')}`);
    }
    const argsList: string[] = Array.isArray((nd as any).args)
      ? ((nd as any).args as string[])
      : parseArgsFromSignature(nd.signature);

    // Connected nodes
    const incomingEdges = n.connectedEdges().filter((e) => e.target().id() === n.id());
    const outgoingEdges = n.connectedEdges().filter((e) => e.source().id() === n.id());
    const uniqueById = (nodes: cytoscape.NodeSingular[]) => {
      const map = new Map<string, cytoscape.NodeSingular>();
      for (const nn of nodes) { if (!map.has(nn.id())) map.set(nn.id(), nn); }
      return [...map.values()];
    };
    const incomingNodes = uniqueById(incomingEdges.map(e => e.source()));
    const outgoingNodes = uniqueById(outgoingEdges.map(e => e.target()));

    const linkList = (nodes: cytoscape.NodeSingular[]) => nodes
      .map(nn => `<a href="#" data-node-id="${nn.id()}" style="text-decoration:none;color:#0366d6">${(nn.data('label') as string) || nn.id()}</a>`) 
      .join(', ');

    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:14px">${nd.label || nd.id}</strong>
        <code style="font-size:11px;color:#666">${nd.kind || ''}</code>
      </div>
      <div style="margin-bottom:6px;color:#555">${nd.module || ''}</div>
      <div style="margin-bottom:6px;color:#666">${nd.file || ''}${nd.line ? `:${nd.line}` : ''}</div>
      ${argsList.length ? `<div style=\"margin-bottom:6px;color:#444\"><strong>Arguments</strong>: ${argsList.join(', ')}</div>` : ''}
      ${nd.signature ? `<pre style="white-space:pre-wrap;background:#fafafa;border:1px solid #eee;padding:6px;border-radius:4px;font-size:11px;margin:8px 0;">${nd.signature}</pre>` : ''}
      ${nd.doc ? `<div style="white-space:pre-wrap;background:#fcfcfc;border:1px solid #f0f0f0;padding:6px;border-radius:4px;font-size:12px;margin:8px 0;">${nd.doc}</div>` : ''}
      ${(incomingNodes.length || outgoingNodes.length) ? `
        <div style=\"margin-top:8px\">
          <strong>Connected</strong>
          <div style=\"font-size:12px;margin-top:4px\">
            ${incomingNodes.length ? `<div><em>Incoming</em>: ${linkList(incomingNodes)}</div>` : ''}
            ${outgoingNodes.length ? `<div><em>Outgoing</em>: ${linkList(outgoingNodes)}</div>` : ''}
          </div>
        </div>
      ` : ''}
      ${tagLines.length ? `<div style="margin-top:8px"><strong>Tags</strong><div style="font-size:12px;margin-top:4px">${tagLines.map(t => `<div>${t}</div>`).join('')}</div></div>` : ''}
    `;
  }

  function focusNode(nodeId: string) {
    const n = cy.getElementById(nodeId) as cytoscape.NodeSingular;
    if (!n || n.empty()) return;
    const ids = new Set([n.id(), ...n.connectedEdges().connectedNodes().map(x => x.id())]);
    cy.nodes().forEach((x: cytoscape.NodeSingular) => { x.style('opacity', ids.has(x.id()) ? 1 : 0.2); });
    cy.edges().forEach((e: cytoscape.EdgeSingular) => {
      const show = ids.has(e.source().id()) && ids.has(e.target().id());
      e.style('opacity', show ? 0.9 : 0.15);
    });
    renderDetails(n);
  }

  // Basic click focus
  cy.on('tap', 'node', (evt) => {
    const n = evt.target as cytoscape.NodeSingular;
    focusNode(n.id());
  });

  // Clickable links in the details pane to navigate to connected nodes
  const detailsEl = document.getElementById('details');
  if (detailsEl) {
    detailsEl.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      const a = target.closest('a[data-node-id]') as HTMLAnchorElement | null;
      if (a && a.dataset.nodeId) {
        ev.preventDefault();
        focusNode(a.dataset.nodeId);
      }
    });
  }

  // Empty background click to reset
  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      cy.nodes().style('opacity', 1);
      cy.edges().style('opacity', 0.9);
    }
  });

  // Simple search UI
  const search = document.getElementById('search') as HTMLInputElement | null;
  const clear = document.getElementById('clear');
  const hideChk = document.getElementById('hide-nonmatching') as HTMLInputElement | null;
  function applySearch() {
    const q = (search?.value || '').toLowerCase().trim();
    const hide = !!(hideChk && hideChk.checked);
    if (!q) {
      cy.nodes().style('opacity', 1);
      cy.nodes().style('display', 'element');
      cy.edges().style('opacity', 0.9);
      cy.edges().style('display', 'element');
      return;
    }
    const match = (n: cytoscape.NodeSingular) => {
      const id = (n.data('id') as string || '').toLowerCase();
      const label = (n.data('label') as string || '').toLowerCase();
      const mod = (n.data('module') as string || '').toLowerCase();
      return id.includes(q) || label.includes(q) || mod.includes(q);
    };
    const keep = new Set<string>();
    cy.nodes().forEach((n: cytoscape.NodeSingular) => { if (match(n)) keep.add(n.id()); });
    if (hide) {
      cy.nodes().style('display', (n: cytoscape.NodeSingular) => keep.has(n.id()) ? 'element' : 'none');
      cy.edges().style('display', (e: cytoscape.EdgeSingular) => (keep.has(e.source().id()) && keep.has(e.target().id())) ? 'element' : 'none');
    } else {
      cy.nodes().style('opacity', (n: cytoscape.NodeSingular) => keep.has(n.id()) ? 1 : 0.15);
      cy.edges().style('opacity', (e: cytoscape.EdgeSingular) => (keep.has(e.source().id()) && keep.has(e.target().id())) ? 0.9 : 0.1);
    }
  }
  search?.addEventListener('input', applySearch);
  hideChk?.addEventListener('change', applySearch);
  clear?.addEventListener('click', () => {
    if (search) { search.value = ''; }
    if (hideChk) { hideChk.checked = false; }
    applySearch();
  });

  // ESC to reset filters and visibility
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (search) search.value = '';
      if (hideChk) hideChk.checked = false;
      cy.nodes().style('opacity', 1);
      cy.nodes().style('display', 'element');
      cy.edges().style('opacity', 0.9);
      cy.edges().style('display', 'element');
    }
  });

  // Mode switching
  const modeSel = document.getElementById('mode') as HTMLSelectElement | null;
  async function applyMode() {
    const mode = (modeSel?.value || 'default') as GraphData['defaultMode'];
    // Reset full visibility; then apply mode-specific dimming
    cy.nodes().style('display', 'element');
    cy.edges().style('display', 'element');
    if (mode === 'modules') {
      // In modules mode, deemphasize function-level edges; keep all nodes visible
      cy.edges().style('opacity', (e: cytoscape.EdgeSingular) => (e.data('kind') === 'build_step' || e.data('kind') === 'bash_entry') ? 0.9 : 0.15);
    } else if (mode === 'datastruct') {
      // Highlight nodes that have datastructure tags; dim others
      const hasDS = new Set<string>();
      (data.nodes || []).forEach(n => {
        const tags = (n as any).tags || {};
        const ds = (tags.datastructures || []) as string[];
        if (ds && ds.length) hasDS.add(n.id);
      });
      cy.nodes().style('opacity', (n: cytoscape.NodeSingular) => hasDS.has(n.id()) ? 1 : 0.2);
      cy.edges().style('opacity', (e: cytoscape.EdgeSingular) => (hasDS.has(e.source().id()) || hasDS.has(e.target().id())) ? 0.8 : 0.1);
    } else if (mode === 'exec') {
      // Emphasize exec edges
      cy.edges().style('opacity', (e: cytoscape.EdgeSingular) => (e.data('kind') === 'build_step' || e.data('kind') === 'bash_entry') ? 0.9 : 0.15);
    } else {
      // default
      cy.edges().style('opacity', 0.9);
    }
    await runElkLayered();
  }
  modeSel?.addEventListener('change', () => { applyMode(); });
  // Initialize mode from data
  if (modeSel) {
    const allowed = ['default','exec','modules','datastruct'];
    modeSel.value = allowed.includes(data.defaultMode) ? data.defaultMode : 'default';
    applyMode();
  }
}

main().catch((e) => {
  console.error(e);
});


