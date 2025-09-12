import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import nunjucks from "nunjucks";

export function getRepoRootFromThisFile(): string {
  return resolve(fileURLToPath(new URL("../../../", import.meta.url)));
}

export function renderTemplate(templateDir: string, templateName: string, ctx: Record<string, any>): string {
  const env = nunjucks.configure(templateDir, { autoescape: false, trimBlocks: true, lstripBlocks: true });
  return env.render(templateName, ctx);
}

export function extractJson(text: string): string {
  const filtered = text
    .split(/\r?\n/)
    .filter(line => !line.startsWith("[DEBUG] "))
    .join("\n")
    .trim();
  try {
    const obj = JSON.parse(filtered);
    if (obj && typeof obj === "object") {
      const candidates = [(obj as any).text, (obj as any).content, (obj as any).message];
      const picked = candidates.find(v => typeof v === "string");
      if (picked) return String(picked).trim();
    }
  } catch {}
  if (filtered.startsWith("{") && filtered.endsWith("}")) return filtered;
  const first = filtered.indexOf("{");
  const last = filtered.lastIndexOf("}");
  if (first >= 0 && last > first) return filtered.slice(first, last + 1);
  return filtered;
}

export function extractLastJsonObjectOrCodeFence(text: string): string | null {
  try {
    const fenceRe = /```json\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    let last: string | null = null;
    while ((m = fenceRe.exec(text)) !== null) last = m[1]?.trim() ?? null;
    if (last && last.startsWith("{") && last.endsWith("}")) return last;
  } catch {}
  let depth = 0;
  let start = -1;
  let candidate: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}') { depth--; if (depth === 0 && start >= 0) { candidate = text.slice(start, i + 1); start = -1; } }
  }
  if (candidate && candidate.trim().startsWith('{') && candidate.trim().endsWith('}')) return candidate.trim();
  return null;
}

export async function runClaudeProject(opts: {
  systemPrompt?: string;
  userPrompt: string;
  addDirs: string[];
  model?: string;
  output?: 'text' | 'stream-json';
  allowedTools?: string;
  includePartial?: boolean;
  outDir?: string;
  logPrefix?: string;
}): Promise<{ text: string; raw: string }> {
  const repoRoot = getRepoRootFromThisFile();
  const outDir = resolve(opts.outDir || join(repoRoot, 'out'));
  await mkdir(outDir, { recursive: true });

  const model = opts.model || 'sonnet';
  const args: string[] = [
    '-p', '--model', model, '--verbose',
  ];
  if (opts.systemPrompt && opts.systemPrompt.trim().length > 0) {
    args.splice(1, 0, '--append-system-prompt', opts.systemPrompt);
  }
  for (const d of opts.addDirs) { args.push('--add-dir', resolve(d)); }
  if (opts.allowedTools) { args.push('--allowed-tools', opts.allowedTools); }
  if (opts.output === 'stream-json') { args.push('--output-format', 'stream-json', '--include-partial-messages'); }
  args.push(opts.userPrompt);

  const cmdPreview = `claude ${args.map(a => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`;
  const prefix = opts.logPrefix || 'claude';
  await writeFile(join(outDir, `${prefix}_command.txt`), cmdPreview + "\n", 'utf8');

  const raw = await new Promise<string>((resolvePromise, rejectPromise) => {
    const child = spawn('claude', args, { cwd: repoRoot, env: { ...process.env } });
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    child.stdout.on('data', (d) => chunks.push(Buffer.from(d)));
    child.stderr.on('data', (d) => errChunks.push(Buffer.from(d)));
    child.on('error', (e) => rejectPromise(e));
    child.on('close', async () => {
      const out = Buffer.concat(chunks).toString('utf8');
      const err = Buffer.concat(errChunks).toString('utf8');
      try { await writeFile(join(outDir, `${prefix}.raw`), out, 'utf8'); } catch {}
      try { if (err) await writeFile(join(outDir, `${prefix}.log`), err, { encoding: 'utf8', flag: 'a' }); } catch {}
      resolvePromise(out.trim());
    });
  });

  let text = raw;
  if (opts.output === 'stream-json') {
    const fromFence = extractLastJsonObjectOrCodeFence(raw) ?? extractJson(raw);
    text = fromFence;
  }
  return { text, raw };
}


