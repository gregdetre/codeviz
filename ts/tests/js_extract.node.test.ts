import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec as _exec } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(_exec);

function repoRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return resolve(__dirname, '../..');
}

async function runExtractDemo(): Promise<string> {
  const root = repoRoot();
  const configPath = resolve(root, 'configs/demo_codebase.codeviz.toml');
  const outDir = resolve(root, 'out/demo_codebase');
  const outFile = resolve(outDir, 'codebase_graph.json');
  const cli = resolve(root, 'ts/dist/cli/index.js');
  // Build is run by pretest. Execute extract all (which runs python then ts/js)
  await exec(`node ${cli} extract --config ${configPath}`);
  assert.ok(existsSync(outFile), 'codebase_graph.json should exist after extract');
  return outFile;
}

(async function main() {
  const graphPath = await runExtractDemo();
  const raw = await readFile(graphPath, 'utf8');
  const graph = JSON.parse(raw);

  // Verify at least one JS module is present
  const hasUtilModule = graph.groups.some((g: any) => g.id === 'util');
  const hasMainModule = graph.groups.some((g: any) => g.id === 'main');
  assert.ok(hasUtilModule || hasMainModule, 'should include JS/JSX modules (util or main)');

  // Verify function nodes discovered from JS files
  const nodeIds = new Set(graph.nodes.map((n: any) => n.id));
  const foundUpper = nodeIds.has('util.upper');
  const foundGreet = nodeIds.has('util.greet');
  assert.ok(foundUpper && foundGreet, 'should contain util.upper and util.greet nodes');

  // Verify a call edge from greet -> upper (member or identifier resolution)
  const edgeIds = new Set(graph.edges.map((e: any) => `${e.source}->${e.kind}->${e.target}`));
  const callsEdge = edgeIds.has('util.greet->calls->util.upper');
  assert.ok(callsEdge, 'should contain call edge util.greet -> util.upper');

  console.log('OK js_extract.node.test');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


