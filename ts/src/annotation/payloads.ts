import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type FunctionNodeLite = { id: string; label: string; module?: string; file: string; line: number; endLine?: number | null; signature?: string; doc?: string };

export async function buildFunctionXml(node: FunctionNodeLite, opts: { targetDir: string; graphPath?: string }): Promise<string> {
  const n = node;
  // Load code
  let codeText = '';
  try {
    const abs = resolve(opts.targetDir, n.file);
    const full = await readFile(abs, 'utf8');
    const lines = full.split(/\r?\n/);
    const endLine = (n.endLine && n.endLine > 0) ? n.endLine : lines.length;
    codeText = lines.slice(Math.max(0, n.line - 1), endLine).join('\n');
  } catch {}

  // Load graph callers/callees
  let callers: Array<{ id: string; label: string; module?: string; file?: string }> = [];
  let callees: Array<{ id: string; label: string; module?: string; file?: string }> = [];
  try {
    if (opts.graphPath) {
      const raw = await readFile(resolve(opts.graphPath), 'utf8');
      const graph = JSON.parse(raw);
      const nodesById: Record<string, any> = {};
      for (const node of (graph.nodes || [])) nodesById[node.id] = node;
      for (const e of (graph.edges || [])) {
        if (e.target === n.id) {
          const src = nodesById[e.source];
          if (src) callers.push({ id: src.id, label: src.label, module: src.module, file: src.file });
        }
        if (e.source === n.id) {
          const tgt = nodesById[e.target];
          if (tgt) callees.push({ id: tgt.id, label: tgt.label, module: tgt.module, file: tgt.file });
        }
      }
      const uniq = <T extends { id: string }>(arr: T[]): T[] => Object.values(arr.reduce<Record<string, T>>((m, it) => { m[it.id] = it; return m; }, {}));
      callers = uniq(callers);
      callees = uniq(callees);
    }
  } catch {}

  function escAttr(s: string | undefined): string {
    return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
  function escText(s: string | undefined): string { return (s || ''); }

  const xml = [
    '<codeviz-input>',
    `  <target id="${escAttr(n.id)}" name="${escAttr(n.label)}" module="${escAttr(n.module || '')}" file="${escAttr(n.file)}" lineStart="${String(n.line)}" lineEnd="${String(n.endLine || '')}"/>`,
    n.signature ? `  <signature>${escText(n.signature)}</signature>` : '',
    n.doc ? `  <docstring><![CDATA[${escText(n.doc)}]]></docstring>` : '',
    codeText ? `  <code><![CDATA[${codeText}]]></code>` : '',
    '  <graph>',
    '    <callers>',
    ...callers.map(c => `      <node id="${escAttr(c.id)}" label="${escAttr(c.label)}" module="${escAttr(c.module || '')}" file="${escAttr(c.file || '')}"/>`),
    '    </callers>',
    '    <callees>',
    ...callees.map(c => `      <node id="${escAttr(c.id)}" label="${escAttr(c.label)}" module="${escAttr(c.module || '')}" file="${escAttr(c.file || '')}"/>`),
    '    </callees>',
    '  </graph>',
    '</codeviz-input>'
  ].filter(Boolean).join('\n');

  return xml;
}


