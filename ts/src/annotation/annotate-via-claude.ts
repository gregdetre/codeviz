import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTemplate, runClaudeProject, getRepoRootFromThisFile as getRootCommon, extractJson as runnerExtractJson, extractLastJsonObjectOrCodeFence as runnerExtractLast } from "./claudeRunner.js";
import { loadAndResolveConfigFromFile, ResolvedConfig } from "../config/loadConfig.js";
import { resolveGlobalConfigPath } from "../config/loadGlobalConfig.js";
import { parse as parseToml } from "toml";
import { execFile, spawn } from "node:child_process";

export type VocabMode = "closed" | "open" | "suggest";

function getRepoRootFromThisFile(): string { return getRootCommon(); }

// system prompt removed; we render a single user prompt instead

function extractJson(text: string): string {
  // Remove DEBUG lines that may leak on stdout
  const filtered = text
    .split(/\r?\n/)
    .filter(line => !line.startsWith("[DEBUG] "))
    .join("\n")
    .trim();
  // Try to parse a JSON wrapper from --output-format json and extract the text field
  try {
    const obj = JSON.parse(filtered);
    if (obj && typeof obj === "object") {
      const candidates = [obj.text, obj.content, obj.message];
      const picked = candidates.find(v => typeof v === "string");
      if (picked) return String(picked).trim();
    }
  } catch {}
  if (filtered.startsWith("{") && filtered.endsWith("}")) return filtered;
  const first = filtered.indexOf("{");
  const last = filtered.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return filtered.slice(first, last + 1);
  }
  return filtered;
}

function extractLastJsonObjectOrCodeFence(text: string): string | null {
  try {
    // Prefer last ```json ... ``` fenced block
    const fenceRe = /```json\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    let last: string | null = null;
    while ((m = fenceRe.exec(text)) !== null) {
      last = m[1]?.trim() ?? null;
    }
    if (last && last.startsWith("{") && last.endsWith("}")) {
      return last;
    }
  } catch {}

  // Fallback: find the last balanced top-level JSON object by brace counting
  let depth = 0;
  let start = -1;
  let candidate: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        candidate = text.slice(start, i + 1);
        start = -1;
      }
    }
  }
  if (candidate && candidate.trim().startsWith('{') && candidate.trim().endsWith('}')) {
    return candidate.trim();
  }
  return null;
}

export async function runAnnotateViaClaude(opts: { configFile: string; vocab: VocabMode; contextBudget: number; model?: string }): Promise<void> {
  const repoRoot = getRepoRootFromThisFile();
  const cfgPath = resolve(opts.configFile);
  const cfg: ResolvedConfig = await loadAndResolveConfigFromFile(cfgPath);
  const outDir = resolve(cfg.outputDir);
  const graphPath = join(outDir, "codebase_graph.json");
  if (!existsSync(graphPath)) {
    throw new Error(`No codebase graph found at ${graphPath}. Run extraction first.`);
  }

  // Load tags from global config and target config
  const globalConfigPath = resolveGlobalConfigPath();
  let globalTags: string[] = [];
  try {
    if (globalConfigPath && existsSync(globalConfigPath)) {
      const raw = await readFile(globalConfigPath, "utf8");
      const cfg: any = parseToml(raw);
      globalTags = Array.isArray(cfg?.tags?.global) ? cfg.tags.global.map((t: any) => String(t)) : [];
    }
  } catch {}
  let projectTags: string[] = [];
  try {
    const raw = await readFile(cfgPath, "utf8");
    const proj: any = parseToml(raw);
    projectTags = Array.isArray(proj?.tags?.project) ? proj.tags.project.map((t: any) => String(t)) : [];
  } catch {}

  // Prepare user prompt from template in source tree (user-prompt-only)
  const templateDir = join(repoRoot, "ts", "src", "annotation", "templates");
  const targetName = basename(cfg.targetDir);
  const schemaSummary = `{
  "version": 1,
  "schemaVersion": "1.0.0",
  "vocabMode": "<closed|open|suggest>",
  "globalTags": [ ... ],
  "projectTags": [ ... ],
  "suggestedTags": [{ "tag": "string", "count": number }],
  "nodes": [
    { "id": "<node-id from codebase_graph.json>", "tags": ["tag1", "tag2"] }
  ]
}`;
  const userPrompt = renderTemplate(templateDir, "annotate_system_prompt.njk", {
    contextBudget: opts.contextBudget,
    vocabMode: opts.vocab,
    globalTags,
    projectTags,
    targetName,
    graphPath,
    schemaSummary,
  });
  // Ensure output directory exists and save prompt for inspection
  await mkdir(outDir, { recursive: true });
  const promptFile = join(outDir, "annotate_user_prompt.txt");
  await writeFile(promptFile, userPrompt, "utf8");

//   console.log(`[annotate] wrote user prompt to ${promptFile}`);

  // Invoke Claude CLI
  // Use Claude CLI model aliases where possible (e.g., 'opus', 'sonnet') to avoid 404s
  const model = opts.model || "sonnet";
  // Use shared runner
  const { text: raw } = await runClaudeProject({
    userPrompt,
    addDirs: [outDir, cfg.targetDir],
    model,
    output: 'stream-json',
    allowedTools: 'Read',
    includePartial: true,
    outDir,
    logPrefix: 'annotate'
  });
  const streamedAssembled = raw;
  await writeFile(join(outDir, "annotate.raw"), streamedAssembled, "utf8");
  const jsonText = runnerExtractLast(streamedAssembled) ?? runnerExtractJson(streamedAssembled);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Claude output was not valid JSON. First 5000 chars:\n${jsonText.slice(0, 5000)}`);
  }

  // Ensure generatedAt is supplied programmatically
  try {
    if (parsed && typeof parsed === "object" && ("generatedAt" in parsed)) {
      delete (parsed as any).generatedAt;
    }
  } catch {}
  const finalized = { ...parsed, generatedAt: new Date().toISOString() };

  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, "llm_annotation.json");
  await writeFile(outFile, JSON.stringify(finalized, null, 2), "utf8");
}


