import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { loadAndResolveConfigFromFile, ResolvedConfig } from "../config/loadConfig.js";
import { execFile } from "node:child_process";

export type VocabMode = "closed" | "open" | "suggest";

function getRepoRootFromThisFile(): string {
  // ../../../ from ts/src/annotation -> repo root
  return resolve(fileURLToPath(new URL("../../../", import.meta.url)));
}

function renderSystemPrompt(templateDir: string, context: { contextBudget: number }): string {
  const env = nunjucks.configure(templateDir, { autoescape: false, trimBlocks: true, lstripBlocks: true });
  const schemaSummary = `{
  "version": 1,
  "schemaVersion": "1.0.0",
  "generatedAt": "<ISO-8601>",
  "vocabMode": "<closed|open|suggest>",
  "globalTags": [ ... ],
  "projectTags": [ ... ],
  "suggestedTags": [{ "tag": "string", "count": number }],
  "nodes": [
    { "id": "<node-id from codebase_graph.json>", "tags": ["tag1", "tag2"] }
  ]
}`;
  return env.render("annotate_system_prompt.njk", { ...context, schemaSummary });
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  // Fallback: grab largest {...} block
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed; // give back raw; caller will attempt JSON.parse
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

  // Prepare system prompt from template in source tree
  const templateDir = join(repoRoot, "ts", "src", "annotation", "templates");
  const systemPrompt = renderSystemPrompt(templateDir, { contextBudget: opts.contextBudget });

  // Compose user prompt
  const targetName = basename(cfg.targetDir);
  const vocab = opts.vocab;
  const userPrompt = `Produce llm_annotation.json for target '${targetName}'. Use vocabMode: ${vocab}. Output ONLY JSON.`;

  // Invoke Claude CLI
  const model = opts.model || "opus-4.1";
  const args = [
    "--print",
    "--append-system-prompt", systemPrompt,
    "--model", model,
    "--add-dir", repoRoot,
    "--add-dir", cfg.targetDir,
    "--dangerously-skip-permissions",
    "--output-format", "text",
    userPrompt
  ];

  async function runClaudeOnce(extraEnv?: Record<string, string>): Promise<string> {
    return await new Promise((resolvePromise, rejectPromise) => {
      const child = execFile(
        "claude",
        args,
        { cwd: repoRoot, maxBuffer: 1024 * 1024 * 100, env: { ...process.env, ...(extraEnv || {}) } },
        (err, out, _errOut) => {
          if (err) return rejectPromise(err);
          resolvePromise(out);
        }
      );
    });
  }

  let stdout: string;
  try {
    stdout = await runClaudeOnce();
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes("No version is set for command claude")) {
      // Retry with Node 22 for Claude shim via asdf
      stdout = await runClaudeOnce({ ASDF_NODEJS_VERSION: "22.9.0" });
    } else {
      throw e;
    }
  }

  const jsonText = extractJson(stdout);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Claude output was not valid JSON. First 500 chars:\n${jsonText.slice(0, 500)}`);
  }

  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, "llm_annotation.json");
  await writeFile(outFile, JSON.stringify(parsed, null, 2), "utf8");
}


