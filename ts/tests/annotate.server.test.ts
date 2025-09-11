import { strict as assert } from 'node:assert';
import { join, resolve } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { runAnnotate } from '../src/annotation/annotate.js';
import { startServer } from '../src/server/server.js';

(async function main() {
  // Create a synthetic minimal graph in a temp dir under out/test-fixture
  const tmpDir = resolve(process.cwd(), 'out', 'test-fixture');
  await mkdir(tmpDir, { recursive: true });
  const graphPath = join(tmpDir, 'codebase_graph.json');
  const graph = {
    version: 1,
    schemaVersion: '1.0.0',
    id_prefix: '',
    defaultMode: 'exec',
    rootDir: process.cwd(),
    nodes: [
      { id: 'm.main', label: 'main', file: 'm.py', line: 1, module: 'm', kind: 'function', tags: {}, signature: 'main()\n', doc: null },
      { id: 'm.util', label: 'util', file: 'm.py', line: 5, module: 'm', kind: 'function', tags: {}, signature: 'util()\n', doc: null }
    ],
    edges: [{ source: 'm.main', target: 'm.util', kind: 'calls', conditions: [], order: null }],
    groups: [{ id: 'm', kind: 'module', children: ['m.main', 'm.util'] }],
    moduleImports: []
  };
  await writeFile(graphPath, JSON.stringify(graph, null, 2), 'utf8');

  // 1) Annotate synthetic graph
  await runAnnotate({ targetDir: process.cwd(), outDir: tmpDir, vocab: 'closed', limit: 0, rank: 'mixed', verbose: 0 });
  const annPath = join(tmpDir, 'llm_annotation.json');
  const annRaw = await readFile(annPath, 'utf8');
  const anns = JSON.parse(annRaw);
  assert.equal(anns.version, 1, 'ann version');
  assert.ok(Array.isArray(anns.nodes) && anns.nodes.length > 0, 'ann nodes written');

  // 2) Server endpoints (no mocks)
  const app = await startServer({ host: '127.0.0.1', port: 0, openBrowser: false, viewerLayout: 'elk-then-fcose', viewerMode: 'default', hybridMode: 'sequential', dataFilePath: graphPath, workspaceRoot: process.cwd() });
  const addr = app.server.address();
  const port = typeof addr === 'object' && addr ? (addr as any).port : 0;
  assert.ok(port > 0, 'server should bind to a port');

  const base = `http://127.0.0.1:${port}`;
  const resGraph = await fetch(`${base}/out/codebase_graph.json`);
  assert.equal(resGraph.status, 200, 'graph endpoint 200');
  const resAnn = await fetch(`${base}/out/llm_annotation.json`);
  assert.equal(resAnn.status, 200, 'annotation endpoint 200');

  const g = await resGraph.json();
  const a = await resAnn.json();
  assert.ok(Array.isArray(g.nodes) && g.nodes.length >= graph.nodes.length, 'graph content via HTTP');
  assert.ok(Array.isArray(a.nodes) && a.nodes.length >= anns.nodes.length, 'annotations content via HTTP');

  await app.close();
  console.log('OK annotate.server.test');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


