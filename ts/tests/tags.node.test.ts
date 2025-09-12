import { strict as assert } from 'node:assert';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import elk from 'cytoscape-elk';
import type { Core } from 'cytoscape';
import { buildTagIndex, applyTagFilter, computeTagCounts } from '../viewer/src/tags.ts';

// Register layouts for parity (not strictly needed for tag filtering logic)
(cytoscape as any).use(fcose);
(cytoscape as any).use(elk as any);

type Graph = {
  version: number;
  schemaVersion: string;
  nodes: Array<{ id: string; label: string; file: string; line: number; module: string; kind: string }>;
  edges: Array<{ source: string; target: string; kind: string }>;
  groups: Array<{ id: string; kind: string; children: string[] }>;
};

function graphToElements(graph: Graph): any[] {
  const elements: any[] = [];
  const nodeIds = new Set(graph.nodes.map(n => n.id));
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

function createCy(graph: Graph): Core {
  return cytoscape({ elements: graphToElements(graph), style: [
    { selector: 'node', style: { 'label': 'data(displayLabel)' } },
    { selector: '.cv-tag-hidden', style: { 'display': 'none' } },
    { selector: 'edge.cv-tag-hidden', style: { 'display': 'none' } },
  ] as any });
}

(async function main() {
  // Synthetic graph: four functions in one module with simple chain edges
  const graph: Graph = {
    version: 1,
    schemaVersion: '1.0.0',
    nodes: [
      { id: 'm.A', label: 'A', file: 'm.py', line: 1, module: 'm', kind: 'function' },
      { id: 'm.B', label: 'B', file: 'm.py', line: 5, module: 'm', kind: 'function' },
      { id: 'm.C', label: 'C', file: 'm.py', line: 9, module: 'm', kind: 'function' },
      { id: 'm.D', label: 'D', file: 'm.py', line: 13, module: 'm', kind: 'function' }
    ],
    edges: [
      { source: 'm.A', target: 'm.B', kind: 'calls' },
      { source: 'm.B', target: 'm.C', kind: 'calls' },
      { source: 'm.C', target: 'm.D', kind: 'calls' }
    ],
    groups: [ { id: 'm', kind: 'module', children: ['m.A','m.B','m.C','m.D'] } ]
  };

  const annotations = {
    version: 1,
    schemaVersion: '1.0.0',
    vocabMode: 'closed',
    globalTags: ['Important','Entrypoint','util','parse'],
    projectTags: [],
    nodes: [
      { id: 'm.A', tags: ['Important'] },
      { id: 'm.B', tags: ['Entrypoint','util'] },
      { id: 'm.C', tags: ['parse'] }
      // m.D intentionally untagged
    ]
  };

  const cy = createCy(graph);

  // Build index
  const idx = buildTagIndex(graph as any, annotations);
  const keys = new Set(idx.allTagKeys);
  // Pinned should be present even if counts 0 later
  assert.ok(keys.has('important'), 'includes Important');
  assert.ok(keys.has('entrypoint'), 'includes Entrypoint');
  assert.ok(keys.has('untagged'), 'includes Untagged');
  assert.ok(keys.has('util') && keys.has('parse'), 'includes observed tags');

  // All selected => show all functions; no edges hidden
  let selected = new Set(idx.allTagKeys);
  applyTagFilter(cy as any, idx, selected);
  let hiddenFns = cy.$("node[type = 'function'].cv-tag-hidden");
  assert.equal(hiddenFns.length, 0, 'all functions visible when all tags selected');
  let hiddenEdges = cy.$('edge.cv-tag-hidden');
  assert.equal(hiddenEdges.length, 0, 'no edges hidden when all nodes visible');
  let counts = computeTagCounts(cy as any, idx);
  const untaggedCounts = counts.find(c => c.key === 'untagged');
  assert.ok(untaggedCounts && untaggedCounts.total === 1 && untaggedCounts.visible === 1, 'untagged total/visible correct with all selected');

  // Only Important => only A visible; edges incident to hidden nodes should hide
  selected = new Set<string>(['important']);
  applyTagFilter(cy as any, idx, selected);
  hiddenFns = cy.$("node[type = 'function'].cv-tag-hidden");
  assert.equal(hiddenFns.length, 3, 'three functions hidden when only Important selected');
  const visibleFns = cy.$("node[type = 'function']").filter(n => !n.hasClass('cv-tag-hidden'));
  assert.equal(visibleFns.length, 1, 'one function visible when only Important selected');
  assert.equal(visibleFns[0]?.id(), 'm.A', 'A is visible');
  hiddenEdges = cy.$('edge.cv-tag-hidden');
  assert.equal(hiddenEdges.length, cy.$('edge').length, 'all edges hidden because at least one endpoint hidden');
  counts = computeTagCounts(cy as any, idx);
  const imp = counts.find(c => c.key === 'important');
  assert.ok(imp && imp.total === 1 && imp.visible === 1, 'Important visible count reflects current visibility');

  // Only Untagged => only D visible
  selected = new Set<string>(['untagged']);
  applyTagFilter(cy as any, idx, selected);
  const visibleUntagged = cy.$("node[type = 'function']").filter(n => !n.hasClass('cv-tag-hidden'));
  assert.equal(visibleUntagged.length, 1, 'one function visible when only Untagged selected');
  assert.equal(visibleUntagged[0]?.id(), 'm.D', 'D is visible');

  // Pinned keys appear even if missing from data; total should be 0
  const noPinnedAnn = { version: 1, schemaVersion: '1.0.0', vocabMode: 'closed', globalTags: [], projectTags: [], nodes: [ { id: 'm.C', tags: ['parse'] } ] };
  const idx2 = buildTagIndex(graph as any, noPinnedAnn);
  const keys2 = new Set(idx2.allTagKeys);
  assert.ok(keys2.has('important') && keys2.has('entrypoint'), 'pinned keys present with count 0');
  const counts2 = computeTagCounts(null as any, idx2);
  const imp2 = counts2.find(c => c.key === 'important');
  const ent2 = counts2.find(c => c.key === 'entrypoint');
  assert.ok(imp2 && imp2.total === 0, 'Important total 0 when unused');
  assert.ok(ent2 && ent2.total === 0, 'Entrypoint total 0 when unused');

  console.log('OK tags.node.test');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


