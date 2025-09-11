import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
(cytoscape as any).use(fcose);

async function main() {
  // Forward console logs and errors to server for tailing
  const forward = async (level: string, message: string, data?: any) => {
    try {
      await fetch('/client-log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ level, message, data })
      }).catch(() => {});
    } catch {}
  };
  const origLog = console.log, origWarn = console.warn, origError = console.error;
  console.log = (...args: any[]) => { origLog.apply(console, args); forward('log', args.map(String).join(' '), args).catch(() => {}); };
  console.warn = (...args: any[]) => { origWarn.apply(console, args); forward('warn', args.map(String).join(' '), args).catch(() => {}); };
  console.error = (...args: any[]) => { origError.apply(console, args); forward('error', args.map(String).join(' '), args).catch(() => {}); };

  const res = await fetch("/out/codebase_graph.json");
  const graph = await res.json();

  const elements: any[] = [];
  for (const g of graph.groups) {
    elements.push({ data: { id: g.id, label: g.id } });
  }
  for (const n of graph.nodes) {
    elements.push({ data: { id: n.id, label: n.label, type: n.kind, parent: n.module } });
  }
  // Filter edges where source/target nodes don't exist to avoid Cytoscape errors
  const nodeIds = new Set(graph.nodes.map((n: any) => n.id));
  let skipped = 0;
  for (const e of graph.edges) {
    const hasSource = nodeIds.has(e.source);
    const hasTarget = nodeIds.has(e.target);
    if (hasSource && hasTarget) {
      elements.push({ data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target, type: e.kind } });
    } else {
      skipped++;
      console.warn('Skipping invalid edge', e);
    }
  }
  if (skipped > 0) {
    console.warn(`Skipped ${skipped} invalid edges (missing nodes)`);
  }

  const cy = cytoscape({
    container: document.getElementById("cy") as HTMLElement,
    elements,
    style: [
      { selector: 'node', style: { 'label': 'data(label)', 'text-valign': 'center', 'text-halign': 'center', 'font-size': 10 } },
      { selector: '$node > node', style: { 'background-opacity': 0.2, 'padding': 10, 'shape': 'round-rectangle' } },
      { selector: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'width': 2 } },
      { selector: 'edge[type = "calls"]', style: { 'line-color': '#666', 'target-arrow-color': '#666' } }
    ],
    layout: { name: 'fcose', animate: true }
  });

  const callsToggle = document.getElementById('toggleCalls') as HTMLInputElement;
  callsToggle.addEventListener('change', () => {
    cy.edges('[type = "calls"]').style('display', callsToggle.checked ? 'element' : 'none');
  });

  cy.on('tap', 'node', (evt) => {
    const node = evt.target;
    const neighborhood = node.closedNeighborhood();
    cy.elements().difference(neighborhood).addClass('faded');
    neighborhood.removeClass('faded');
  });

  cy.style().selector('.faded').style({ 'opacity': 0.1 }).update();
}

main();
