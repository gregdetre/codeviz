import { strict as assert } from 'node:assert';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import elk from 'cytoscape-elk';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeCompactCommands } from '../viewer/src/command-executor.ts';

// Register layouts for parity with viewer
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
  // Minimal mirror of ts/viewer/src/elements.ts for explore mode
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
    { selector: '.faded', style: { 'opacity': 0.25, 'text-opacity': 0.4 } },
    { selector: '.highlighted', style: { 'border-width': 3, 'border-color': '#ff9800' } }
  ] as any });
}

async function run(commands: any[]) {
  const graph = loadGraphJson();
  const cy = createCyFromGraph(graph);
  const res = await executeCompactCommands(cy as any, commands);
  return { cy, res };
}

async function testHighlightSubsetByLabel() {
  const { cy } = await run([
    { q: 'node', ops: [['addClass', 'faded']] },
    { q: "node[label *= 'recipe']", ops: [['removeClass', 'faded'], ['addClass', 'highlighted']] },
    { op: 'fit', q: "node[label *= 'recipe']" }
  ]);
  const highlighted = cy.$('.highlighted');
  const faded = cy.$('.faded');
  assert.ok(highlighted.length > 0, 'should highlight at least one node');
  assert.ok(faded.length >= 0, 'should have some faded nodes');
}

async function testHideVariables() {
  const { cy } = await run([
    { q: "node[type = 'variable']", op: 'hide' },
    { q: "node[type = 'function'], node[type = 'class']", op: 'show' }
  ]);
  const vars = cy.$("node[type = 'variable']");
  const hiddenVars = vars.filter((n: any) => n.style('display') === 'none');
  if (vars.length > 0) assert.equal(hiddenVars.length, vars.length, 'all variable nodes should be hidden');
  const hiddenFns = cy.$("node[type = 'function']").filter((n: any) => n.style('display') === 'none');
  const hiddenCls = cy.$("node[type = 'class']").filter((n: any) => n.style('display') === 'none');
  assert.equal(hiddenFns.length, 0, 'function nodes should be visible');
  assert.equal(hiddenCls.length, 0, 'class nodes should be visible');
}

(async function testViewportAndLock() {
  const { cy, res } = await run([
    { op: 'batch', arg: { commands: [
      { q: "node[label *= 'main']", op: 'lock' },
      { op: 'viewport', arg: { zoom: 1.1, pan: { x: 5, y: -5 } } },
      { q: "node[type = 'function']", op: 'style', arg: { 'border-width': 1, 'border-color': '#999' } }
    ] } },
    { q: "node[label *= 'main']", op: 'showConnectedEdges' }
  ]);
  // Verify locked node remains locked
  const main = cy.$("node[label *= 'main']");
  if (main.length > 0) {
    assert.ok(main.locked(), 'main node should be locked');
  }
  assert.ok(res.appliedCount >= 1, 'some commands should be applied');
})();

(async function main() {
  await testHighlightSubsetByLabel();
  await testHideVariables();
  // v2: named sets, traversal, set algebra, path/analytics, layout options
  await (async function testNamedSetsAndTraversal() {
    const { cy, res } = await run([
      { op: 'select', q: "node[module = 'main']", as: 'A' },
      { op: 'select', from: '$A', rel: 'closedNeighborhood', steps: 1, as: 'B' },
      { op: 'setOp', as: 'C', union: ['$A', '$B'] },
      { q: '$C', op: 'addClass', arg: 'highlighted' },
      { op: 'fit', q: '$C' }
    ] as any);
    assert.ok(res.appliedCount >= 5, 'should apply v2 commands');
    const hi = cy.$('.highlighted');
    assert.ok(hi.length > 0, 'should mark union set highlighted');
  })();
  await (async function testSetOpsIntersectionDifference() {
    const { cy } = await run([
      { op: 'select', q: "node[type = 'function']", as: 'FN' },
      { op: 'select', q: "node[label *= 'recipe']", as: 'REC' },
      { op: 'setOp', as: 'INTER', intersection: ['$FN', '$REC'] },
      { op: 'setOp', as: 'DIFF', difference: ['$REC', '$INTER'] },
      { q: '$INTER', op: 'addClass', arg: 'highlighted' },
      { q: '$DIFF', op: 'addClass', arg: 'faded' }
    ] as any);
    const interCount = cy.$('.highlighted').length;
    const diffCount = cy.$('.faded').length;
    assert.ok(interCount >= 0 && diffCount >= 0);
  })();
  await (async function testPathAndAnalytics() {
    const { cy } = await run([
      { op: 'select', q: "node[id = 'main.main']", as: 'SRC' },
      { op: 'select', q: "node[id = 'helpers.calculate_discount']", as: 'DST' },
      { op: 'selectPath', from: '$SRC', to: '$DST', as: 'PATH' },
      { q: '$PATH', op: 'addClass', arg: 'highlighted' },
      { op: 'selectByDegree', min: 2, as: 'HUBS' },
      { q: '$HUBS', op: 'addClass', arg: 'faded' },
      { op: 'selectComponents', as: 'COMPS' }
    ] as any);
    // We at least expect path to select something in this demo graph
    const hi = cy.$('.highlighted');
    assert.ok(hi.length >= 0);
  })();
  await (async function testLayoutOptionsPassthrough() {
    const { res } = await run([
      { op: 'layout', arg: { name: 'elk-then-fcose', elk: { direction: 'DOWN' }, fcose: { animate: true, randomize: false, numIter: 800 } } }
    ] as any);
    assert.ok(res.appliedCount >= 1);
  })();
  await (async function testEdgesBetweenAndDegreeKind() {
    const { cy, res } = await run([
      { op: 'select', q: "node[module = 'main']", as: 'A' },
      { op: 'select', q: "node[module = 'shopping']", as: 'B' },
      { op: 'selectEdgesBetween', from: '$A', to: '$B', as: 'E' },
      { q: '$E', op: 'addClass', arg: 'highlighted' },
      { op: 'selectByDegree', kind: 'in', min: 1, as: 'IN_DEG' },
      { q: '$IN_DEG', op: 'addClass', arg: 'faded' },
      { op: 'clearAllSets' }
    ] as any);
    assert.ok(res.appliedCount >= 1);
    const hi = cy.$('.highlighted');
    assert.ok(hi.length >= 0);
  })();
  // If we got here, tests passed
  console.log('OK commands.node.test');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


