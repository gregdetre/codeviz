import { strict as assert } from 'node:assert';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import elk from 'cytoscape-elk';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLens, applyLens } from '../viewer/src/lens.ts';

(cytoscape as any).use(fcose);
(cytoscape as any).use(elk as any);

function loadGraphJson(): any {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const repoRoot = resolve(__dirname, '../..');
  const path = resolve(repoRoot, 'out/demo_codebase/codebase_graph.json');
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

function graphToElements(graph: any): any[] {
  const elements: any[] = [];
  const nodeIds = new Set(graph.nodes.map((n: any) => n.id));
  for (const g of graph.groups) {
    if (g.kind === 'module') {
      const fullPath = g.id;
      const name = fullPath.split(/[\\/]/).pop() || fullPath;
      elements.push({ data: { id: `module:${g.id}`, label: name, displayLabel: name, type: 'module', path: fullPath } });
    }
  }
  for (const n of graph.nodes) {
    elements.push({ data: { id: n.id, label: n.label, displayLabel: n.label, type: n.kind, parent: `module:${n.module}`, module: n.module, file: n.file, line: n.line } });
  }
  for (const e of graph.edges) {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
      elements.push({ data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target, type: e.kind } });
    }
  }
  return elements;
}

function createCyFromGraph(graph: any) {
  return cytoscape({ elements: graphToElements(graph), style: [
    { selector: 'node', style: { 'label': 'data(displayLabel)' } },
    { selector: '.cv-tag-hidden', style: { 'display': 'none' } }
  ] as any });
}

(async function main() {
  const graph = loadGraphJson();
  const cy = createCyFromGraph(graph);
  const annotations = null;
  const ctx = { graph, annotations, groupFolders: true, filterMode: 'fade' as const, layoutName: 'elk-then-fcose' };
  // Move a couple of nodes to distinct positions to check persistence
  const nodes = cy.nodes();
  if (nodes.length >= 2) {
    nodes[0].position({ x: 100, y: 200 } as any);
    nodes[1].position({ x: -50, y: 80 } as any);
  }
  const lens = buildLens(cy as any, ctx);
  assert.ok(lens.positions && lens.positions.length >= Math.min(nodes.length, 1));
  // Apply to a fresh instance and verify positions roughly match
  const cy2 = createCyFromGraph(graph);
  await applyLens(cy2 as any, lens, ctx);
  if (nodes.length >= 2) {
    const a = cy2.getElementById(nodes[0].id()).position();
    const b = cy2.getElementById(nodes[1].id()).position();
    assert.ok(Math.abs(a.x - 100) < 1e-6 && Math.abs(a.y - 200) < 1e-6);
    assert.ok(Math.abs(b.x - -50) < 1e-6 && Math.abs(b.y - 80) < 1e-6);
  }
  console.log('OK lens.node.test');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


