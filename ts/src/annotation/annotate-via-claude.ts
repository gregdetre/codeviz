import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { loadAndResolveConfigFromFile, ResolvedConfig } from "../config/loadConfig.js";
import { resolveGlobalConfigPath } from "../config/loadGlobalConfig.js";
import { parse as parseToml } from "toml";
import { execFile, spawn } from "node:child_process";

export type VocabMode = "closed" | "open" | "suggest";

function getRepoRootFromThisFile(): string {
  // ../../../ from ts/src/annotation -> repo root
  return resolve(fileURLToPath(new URL("../../../", import.meta.url)));
}

function renderSystemPrompt(templateDir: string, context: { contextBudget: number; vocabMode: VocabMode; globalTags: string[]; projectTags: string[]; targetName: string }): string {
  const env = nunjucks.configure(templateDir, { autoescape: false, trimBlocks: true, lstripBlocks: true });
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
  return env.render("annotate_system_prompt.njk", { ...context, schemaSummary });
}

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

  // Prepare system prompt from template in source tree
  const templateDir = join(repoRoot, "ts", "src", "annotation", "templates");
  const targetName = basename(cfg.targetDir);
  const systemPrompt = renderSystemPrompt(templateDir, { contextBudget: opts.contextBudget, vocabMode: opts.vocab, globalTags, projectTags, targetName });
  // Ensure output directory exists and save prompt for inspection
  await mkdir(outDir, { recursive: true });
  const promptFile = join(outDir, "annotate_system_prompt.txt");
  await writeFile(promptFile, systemPrompt, "utf8");

  // Compose user prompt
  const vocab = opts.vocab;
  const userPrompt = `Produce llm_annotation.json for target '${targetName}'. Use vocabMode: ${vocab}. Read the file at ${graphPath}. Do not include \"generatedAt\"; it will be added by the tool. Output ONLY JSON, no preamble or code fences.`;

//   console.log(`[annotate] wrote:\n\n----\n\n${systemPrompt}\n\n----\n\n${userPrompt}`);

  // Invoke Claude CLI
  // Use Claude CLI model aliases where possible (e.g., 'opus', 'sonnet') to avoid 404s
  const model = opts.model || "sonnet";
  const args = [
    "-p", // print streaming output to stdout
    "--append-system-prompt", systemPrompt,
    "--model", model,
    "--verbose",
    // Limit project access to reduce overhead
    "--add-dir", outDir,
    "--add-dir", cfg.targetDir,
    // Restrict tools for speed and determinism
    "--allowed-tools", "Read",
    // Request newline-delimited streaming JSON (NDJSON)
    "--output-format", "stream-json",
    "--include-partial-messages",
    // user prompt will be piped via stdin
  ];
  // Optional CLI debug flags via env var (e.g., CODEVIZ_ANNOTATE_DEBUG=api,tools)
//   const debugFilter = process.env.CODEVIZ_ANNOTATE_DEBUG;
//   if (debugFilter && debugFilter.length > 0) {
//     args.unshift(debugFilter);
//     args.unshift("--debug");
//   }
  // Persist a reproducible command preview
  const cmdPreview = `claude ${args.map(a => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}  << <userPrompt>`;
  await writeFile(join(outDir, "annotate_command.txt"), cmdPreview + "\n", "utf8");

  async function runClaudeOnce(extraEnv?: Record<string, string>): Promise<{ out: string; err: string; assembledText: string }> {
    return await new Promise((resolvePromise, rejectPromise) => {
      const runArgs = [...args, userPrompt];
      const child = spawn("claude", runArgs, {
        cwd: repoRoot,
        env: { ...process.env, ...(extraEnv || {}) },
        stdio: ["ignore", "pipe", "pipe"]
      });

      const chunksOut: Buffer[] = [];
      const chunksErr: Buffer[] = [];
      let lineBuffer = "";
      const assembledParts: string[] = [];

      function extractDeltaFromEvent(obj: any): string | undefined {
        try {
          if (obj == null) return undefined;
          const ev = obj.event ?? obj;
          const delta = ev?.delta ?? ev?.data?.delta ?? ev?.data;
          const deltaType = delta?.type ?? ev?.type ?? "";

          // Only accumulate assistant's output text/json deltas; ignore input/tool wiring
          if (typeof deltaType === "string") {
            const t = deltaType.toLowerCase();
            const isOutputText = t.includes("output_text_delta") || t === "text_delta" || t === "output_text";
            const isOutputJson = t.includes("output_json_delta") || t === "json_delta";
            const isInput = t.includes("input_");
            if (isInput) return undefined;

            if (isOutputText) {
              if (typeof delta?.text === "string") return delta.text;
              if (typeof ev?.text === "string") return ev.text;
            }
            if (isOutputJson) {
              if (typeof delta?.partial_json === "string") return delta.partial_json;
              if (typeof delta?.json === "string") return delta.json;
            }
          }

          // Generic fallbacks
          if (typeof delta === "string") return delta;
          if (delta && typeof delta.text === "string") return delta.text;
          if (typeof ev?.output_text === "string") return ev.output_text;
          if (typeof ev?.text_delta === "string") return ev.text_delta;
          if (typeof ev?.textDelta === "string") return ev.textDelta;

          for (const [k, v] of Object.entries(delta || ev || {})) {
            const key = k.toLowerCase();
            if ((key.includes("delta") || key.includes("text")) && typeof v === "string") {
              return v;
            }
            if ((key.includes("json")) && typeof (v as any)?.partial_json === "string") {
              return (v as any).partial_json as string;
            }
          }
        } catch {}
        return undefined;
      }

      function handleLine(rawLine: string): string | undefined {
        const line = rawLine.trim();
        if (!line) return;
        if (line.startsWith("[DEBUG] ")) return; // ignore debug noise
        if (!line.startsWith("{") || !line.endsWith("}")) return; // likely not a JSON event
        try {
          const evt = JSON.parse(line);
          const fragment = extractDeltaFromEvent(evt);
          if (typeof fragment === "string" && fragment.length > 0) {
            assembledParts.push(fragment);
            return fragment;
          }
        } catch {}
        return undefined;
      }

      child.stdout.on("data", (d) => {
        const text = Buffer.from(d).toString("utf8");
        chunksOut.push(Buffer.from(d));
        lineBuffer += text;
        for (;;) {
          const idx = lineBuffer.indexOf("\n");
          if (idx === -1) break;
          const one = lineBuffer.slice(0, idx);
          lineBuffer = lineBuffer.slice(idx + 1);
          const frag = handleLine(one);
          if (frag) {
            try { process.stdout.write(frag); } catch {}
          }
        }
      });
      child.stderr.on("data", (d) => chunksErr.push(Buffer.from(d)));

      // Prompt provided as argv; no stdin writes

      const timeoutMs = Number(process.env.CODEVIZ_ANNOTATE_TIMEOUT_MS || "600000"); // default 10 minutes
      const killTimer = setTimeout(() => {
        try { child.kill("SIGTERM"); } catch {}
      }, timeoutMs);

      child.on("error", (err) => {
        clearTimeout(killTimer);
        rejectPromise(err);
      });
      child.on("close", async (_code) => {
        clearTimeout(killTimer);
        if (lineBuffer) {
          const tailFrag = handleLine(lineBuffer);
          if (tailFrag) {
            try { process.stdout.write(tailFrag); } catch {}
          }
          lineBuffer = "";
        }
        const out = Buffer.concat(chunksOut).toString("utf8");
        const err = Buffer.concat(chunksErr).toString("utf8");
        try {
          const logPath = join(outDir, "annotate.log");
          const stamp = new Date().toISOString();
          const header = `\n[${stamp}] claude stderr:\n`;
          await writeFile(logPath, header + (err || "<empty>"), { encoding: "utf8", flag: "a" });
        } catch {}
        resolvePromise({ out, err, assembledText: assembledParts.join("") });
      });
    });
  }

  let stdout: string;
  let streamedAssembled: string = "";
  try {
    const r = await runClaudeOnce();
    stdout = r.out;
    streamedAssembled = r.assembledText || "";
  } catch (e: any) {
    throw e;
  }

  await writeFile(join(outDir, "annotate.raw"), stdout, "utf8");
  let jsonText: string;
  if (streamedAssembled && streamedAssembled.trim().length > 0) {
    const fromFence = extractLastJsonObjectOrCodeFence(streamedAssembled);
    jsonText = fromFence ?? extractJson(streamedAssembled);
  } else {
    jsonText = extractJson(stdout);
  }
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


