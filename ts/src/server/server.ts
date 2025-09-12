import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { generateText, tool, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { parse as parseToml } from "toml";
import { z } from "zod";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function escapeRegLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Heuristic TOML array mutator: adds items to an array under a section, preserving existing formatting
function mutateTomlArray(content: string, section: string, key: string, items: string[]): string {
  if (!items || items.length === 0) return content;
  const secHeaderRe = new RegExp(`^\\[${escapeRegLiteral(section)}\\]\\s*$`, 'm');
  const mSec = secHeaderRe.exec(content);
  const arraySnippetFor = (indent: string, arrIndent: string, arrItems: string[]) => {
    const lines = arrItems.map(s => `${arrIndent}${JSON.stringify(s)}`).join(',\n');
    return `${indent}${key} = [\n${lines}\n${indent}]`;
  };
  if (!mSec) {
    // Append new section at end
    const indent = '';
    const arrIndent = '  ';
    const block = `\n\n[${section}]\n${arraySnippetFor(indent, arrIndent, items)}\n`;
    return content + block;
  }
  // Find end of section (start of next section or EOF)
  const secStart = mSec.index + mSec[0].length;
  const nextSecRe = /^\s*\[[^\]]+\]\s*$/gm;
  nextSecRe.lastIndex = secStart;
  const mNext = nextSecRe.exec(content);
  const secEnd = mNext ? mNext.index : content.length;
  const before = content.slice(0, secStart);
  const block = content.slice(secStart, secEnd);
  const after = content.slice(secEnd);
  // Try to find existing key array in block
  const keyLineRe = new RegExp(`^(\t|\s*)${escapeRegLiteral(key)}\s*=`, 'm');
  const mKeyLine = keyLineRe.exec(block);
  const arrRe = new RegExp(`${escapeRegLiteral(key)}\s*=\s*\[([\s\S]*?)\]`);
  const mArr = arrRe.exec(block);
  if (mArr && mKeyLine) {
    const keyIndent = (mKeyLine[1] || '');
    const full = mArr[0];
    const arrInner = mArr[1];
    const closingIdx = mArr.index + full.lastIndexOf(']');
    const arrAbsStart = mArr.index;
    const arrAbsEnd = arrAbsStart + full.length;
    const arrBefore = block.slice(0, arrAbsStart);
    const arrBody = block.slice(arrAbsStart, arrAbsEnd);
    const arrAfter = block.slice(arrAbsEnd);
    // Determine indentation for items
    const lines = arrBody.split(/\r?\n/);
    const closingLine = lines[lines.length - 1] || '';
    const bracketIndent = (/^(\s*)\]/.exec(closingLine) || [,''])[1] || keyIndent;
    const itemIndent = bracketIndent + (bracketIndent.includes('\t') ? '\t' : '  ');
    let beforeInside = arrBody.slice(0, arrBody.lastIndexOf(']'));
    // Ensure trailing comma before inserting if there are existing items
    if (arrInner && arrInner.trim().length > 0) {
      if (!/,\s*$/.test(beforeInside)) {
        beforeInside = beforeInside.replace(/\s*$/, ',\n');
      }
    } else {
      // Empty array was like [] or [\n\t\n]; normalize to multiline
      // Build a fresh array block
      const newBlock = `${keyIndent}${key} = [\n${items.map(s => `${itemIndent}${JSON.stringify(s)}`).join(',\n')}\n${keyIndent}]`;
      const newBlockCombined = arrBefore + newBlock + arrAfter;
      return before + newBlockCombined + after;
    }
    const insertion = items.map(s => `${itemIndent}${JSON.stringify(s)}`).join(',\n') + `\n${bracketIndent}`;
    const newArrBody = beforeInside + insertion + ']';
    const combined = arrBefore + newArrBody + arrAfter;
    return before + combined + after;
  }
  // No existing key array: insert a new one at end of block
  // Determine indentation based on first non-empty line in block
  const blockLines = block.split(/\r?\n/);
  let indent = '';
  for (const ln of blockLines) {
    const m = /^(\s*)\S/.exec(ln);
    if (m) { indent = m[1]; break; }
  }
  const arrIndent = indent + (indent.includes('\t') ? '\t' : '  ');
  const addition = `\n${arraySnippetFor(indent, arrIndent, items)}\n`;
  return before + block + addition + after;
}

async function waitForFileExists(filePath: string, timeoutMs = 60000, pollIntervalMs = 500): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(filePath)) return true;
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  return existsSync(filePath);
}

async function loadGlobalConfig() {
  const repoRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
  // Prefer new filename, then fall back to legacy names for compatibility
  const candidateNames = [
    "codeviz.codeviz.toml", // new preferred
    "global.config.toml",   // transitional (if present)
    "codeviz.config.toml"   // legacy
  ];
  let configPath: string | undefined;
  for (const name of candidateNames) {
    const p = join(repoRoot, name);
    if (existsSync(p)) { configPath = p; break; }
  }
  if (!configPath) {
    return { llm: { model: "anthropic:claude-sonnet-4:20250514", temperature: 0.2, maxTokens: 2000 } };
  }
  try {
    const configContent = await readFile(configPath, "utf8");
    return parseToml(configContent);
  } catch {
    return { llm: { model: "anthropic:claude-sonnet-4:20250514", temperature: 0.2, maxTokens: 2000 } };
  }
}

async function loadAssistantPrompt() {
  const promptPath = resolve(fileURLToPath(new URL("assistant_prompt.txt", import.meta.url)));
  
  try {
    return await readFile(promptPath, "utf8");
  } catch {
    return "You are the CodeViz assistant inside a code visualization tool. Keep replies concise.";
  }
}

export async function startServer(opts: { host: string; port: number; openBrowser: boolean; viewerLayout?: string; viewerMode?: string; hybridMode?: string; dataFilePath?: string; workspaceRoot?: string; configFilePath?: string }): Promise<FastifyInstance> {
  const app = Fastify();
  // Resolve viewer dist robustly across run contexts (tsx, node, different CWDs)
  const candidates = [
    resolve(process.cwd(), "ts/viewer/dist"),
    resolve(process.cwd(), "viewer/dist"),
    resolve(fileURLToPath(new URL("../../viewer/dist", import.meta.url)))
  ];
  const root = candidates.find(p => existsSync(join(p, "index.html"))) || candidates[0];
  const indexPath = join(root, "index.html");
  const repoRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
  // Load environment variables from .env.local (prefer CWD, then repo root)
  try {
    const envCandidates = [
      join(process.cwd(), ".env.local"),
      join(repoRoot, ".env.local")
    ];
    const envPath = envCandidates.find(p => existsSync(p));
    if (envPath) dotenv.config({ path: envPath });
    else dotenv.config();
  } catch {}
  // Resolve data file path with support for per-target output: out/<target>/codebase_graph.json
  async function resolveDataFile(): Promise<string> {
    if (opts.dataFilePath) return opts.dataFilePath;
    // No magic resolution when not provided
    throw new Error("dataFilePath must be provided by the CLI. Please pass --config to the CLI so it can supply an explicit output path.");
  }
  const resolvedDataFile = await resolveDataFile();
  // Helper: resolve absolute path inside the workspace
  const resolveInWorkspace = (p: string) => {
    const root = (opts.workspaceRoot || repoRoot).replace(/\\/g, "/");
    const abs = p.startsWith("/") ? p : join(root, p);
    return abs;
  };

  // Resolve log file location under out/
  const outDirCandidates = [
    join(process.cwd(), "out"),
    join(repoRoot, "out")
  ];
  const outDir = outDirCandidates.find(p => existsSync(p)) || outDirCandidates[0];
  const logFile = join(outDir, "viewer.log");
  // Reset log file on server start (local-only logging)
  await mkdir(outDir, { recursive: true });
  await writeFile(logFile, "", "utf8");

  app.get("/", async (_req, reply) => {
    const index = await readFile(join(root, "index.html"), "utf8");
    reply.type("text/html").send(index);
  });

  app.get("/out/codebase_graph.json", async (_req, reply) => {
    try {
      const json = await readFile(resolvedDataFile, "utf8");
      reply.type("application/json").send(json);
    } catch (err: any) {
      reply.code(500).send({ error: "ENOENT", message: String(err?.message || err) });
    }
  });

  // Serve LLM annotations from the same output directory as the graph
  app.get("/out/llm_annotation.json", async (_req, reply) => {
    try {
      const dir = dirname(resolvedDataFile);
      const annPath = join(dir, "llm_annotation.json");
      const json = await readFile(annPath, "utf8");
      reply.type("application/json").send(json);
    } catch (err: any) {
      // Optional: if annotations are missing, respond with 204 No Content
      // so the client can treat it as "no annotations" without logging an error.
      reply.code(204).send();
    }
  });

  // Serve persisted node summaries (optional)
  app.get("/out/node_summaries.json", async (_req, reply) => {
    try {
      const dir = dirname(resolvedDataFile);
      const sumPath = join(dir, "node_summaries.json");
      const json = await readFile(sumPath, "utf8");
      reply.type("application/json").send(json);
    } catch {
      reply.code(204).send();
    }
  });

  app.get("/viewer-config.json", async (_req, reply) => {
    function normalizeLayoutName(name?: string) {
      const raw = (name ?? "").toString().trim().toLowerCase();
      if (raw === "elk" || raw === "fcose") return raw;
      if (raw === "hybrid" || raw === "elk-then-fcose" || raw === "elk_then_fcose" || raw === "elkthenfcose") return "elk-then-fcose";
      return "elk-then-fcose";
    }
    const inferredLayout = normalizeLayoutName(opts.viewerLayout);
    // Choose workspaceRoot: CLI-provided > graph.rootDir > repoRoot
    const expandHome = (p: string) => p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
    let chosenRoot: string | undefined = opts.workspaceRoot;
    if (!chosenRoot) {
      try {
        const json = await readFile(resolvedDataFile, "utf8");
        const data = JSON.parse(json);
        if (data && typeof data.rootDir === "string" && data.rootDir.length > 0) {
          chosenRoot = data.rootDir;
        }
      } catch {}
    }
    const rawRoot = expandHome(chosenRoot || repoRoot).replace(/\\/g, "/");

    // Derive project name (prefer stem of target/config directory)
    let projectName: string | undefined;
    try {
      const fromRoot = chosenRoot ? basename(chosenRoot) : undefined;
      const fromDataPath = basename(dirname(resolvedDataFile));
      projectName = (fromRoot && fromRoot.length > 0 ? fromRoot : fromDataPath) || undefined;
    } catch {}

    // Load global config for viewer highlight settings and colors if present
    let highlight: any = undefined;
    let colors: any = undefined;
    try {
      const gcfg: any = await loadGlobalConfig();
      const hv = (gcfg && gcfg.viewer && gcfg.viewer.highlight) ? gcfg.viewer.highlight : undefined;
      highlight = hv ? hv : undefined;
      const cv = (gcfg && gcfg.viewer && (gcfg.viewer as any).colors) ? (gcfg.viewer as any).colors : undefined;
      const toHsl = (v: any) => {
        if (!v || typeof v !== 'object') return undefined;
        const h = Number((v as any).h);
        const s = Number((v as any).s);
        const l = Number((v as any).l);
        if (Number.isFinite(h) && Number.isFinite(s) && Number.isFinite(l)) return { h, s, l };
        return undefined;
      };
      if (cv) {
        const moduleBg = toHsl((cv as any).moduleBg);
        const folderBg = toHsl((cv as any).folderBg);
        colors = (moduleBg || folderBg) ? { moduleBg, folderBg } : undefined;
      }
    } catch {}

    const cfg = { 
      layout: inferredLayout, 
      mode: (opts.viewerMode ?? "default"), 
      hybridMode: (opts.hybridMode ?? "sequential"),
      workspaceRoot: rawRoot,
      projectName,
      highlight,
      colors
    };
    reply.type("application/json").send(cfg);
  });

  app.get("/schema/codebase_graph.schema.json", async (_req, reply) => {
    try {
      const schemaPath = join(repoRoot, "schema", "codebase_graph.schema.json");
      const schema = await readFile(schemaPath, "utf8");
      reply.type("application/json").send(schema);
    } catch (err: any) {
      reply.code(500).send({ error: "ENOENT", message: String(err?.message || err) });
    }
  });

  // Serve lens schema for client-side validation or tooling
  app.get("/schema/lens.schema.json", async (_req, reply) => {
    try {
      const schemaPath = join(repoRoot, "schema", "lens.schema.json");
      const schema = await readFile(schemaPath, "utf8");
      reply.type("application/json").send(schema);
    } catch (err: any) {
      reply.code(500).send({ error: "ENOENT", message: String(err?.message || err) });
    }
  });

  // Expose viewer log over HTTP for quick tailing in dev
  app.get("/out/viewer.log", async (_req, reply) => {
    try {
      const content = await readFile(logFile, "utf8");
      reply.type("text/plain").send(content);
    } catch (err: any) {
      reply.code(500).send({ error: "ENOENT", message: String(err?.message || err) });
    }
  });

  // Lightweight log ingestion endpoint to capture client timings/errors in dev
  app.post("/api/log", async (req, reply) => {
    try {
      const body: any = (req as any).body || {};
      const msg = String(body?.message ?? "");
      if (msg && msg.length < 2000) {
        try { await writeFile(logFile, (await readFile(logFile, "utf8")) + msg + "\n", "utf8"); } catch {}
      }
      reply.code(204).send();
    } catch {
      reply.code(204).send();
    }
  });

  // Minimal chat endpoint (v2): tool-calling via AI SDK; returns prose + compact commands
  app.post("/api/chat", async (req, reply) => {
    try {
      const body: any = (req as any).body || {};
      const rawMessages = Array.isArray(body.messages) ? body.messages : [];
      const viewerSnapshot = body?.viewer?.snapshot;
      const messages: ChatMessage[] = rawMessages
        .map((m: any) => ({ role: m?.role, content: String(m?.content ?? "") }))
        .filter((m: any) => (m.role === "user" || m.role === "assistant" || m.role === "system"));

      const config = await loadGlobalConfig();
      const promptContent = await loadAssistantPrompt();
      const modelString = config.llm?.model || "anthropic:claude-sonnet-4:20250514";
      // Parse model string: provider:model:version[:thinking]
      const [provider, modelName, version, thinking] = modelString.split(":");

      if (provider !== "anthropic") {
        reply.code(400).send({ error: "UNSUPPORTED_PROVIDER", message: `Provider '${provider}' not yet supported` });
        return;
      }
      if (!process.env.ANTHROPIC_API_KEY) {
        reply.code(400).send({ error: "NO_API_KEY", message: "Missing ANTHROPIC_API_KEY in .env.local" });
        return;
      }

      const systemPreamble = `${promptContent}\n\nWhen you need to modify the visualization, call the tool 'viewerCommands' with a compact command array per VIEWER_COMMANDS.md. Do not include the JSON array in your text; use only the tool for commands. Keep prose concise. Use the provided viewer snapshot for context.\n`;
      const snapshotBlock = viewerSnapshot ? `\nViewer snapshot:\n${JSON.stringify(viewerSnapshot)}` : '';

      const systemMsg: CoreMessage = {
        role: "system",
        content: systemPreamble + snapshotBlock
      };
      const history: CoreMessage[] = [systemMsg, ...messages
        .filter(m => m.content.trim().length > 0)
        .map<CoreMessage>(m => ({ role: m.role, content: m.content }))];

      const anthropicModelId = thinking === "thinking"
        ? `${modelName}-${version}`
        : `${modelName}-${version}`;

      // Define tool for compact viewer commands and capture invocations
      const CompactCommandSchema = z.object({
        q: z.string().optional(),
        op: z.string().optional(),
        arg: z.any().optional(),
        ops: z.array(z.tuple([z.string(), z.any()])).optional()
      });
      const capturedCommands: any[] = [];
      const viewerCommandsTool = tool({
        description: "Execute Cytoscape viewer commands (auto-applied on client)",
        inputSchema: z.object({ commands: z.array(CompactCommandSchema) }),
        execute: async ({ commands }) => {
          try {
            if (Array.isArray(commands)) capturedCommands.push(...commands);
          } catch {}
          return { accepted: Array.isArray(commands) ? commands.length : 0 } as any;
        }
      });

      const result = await generateText({
        model: anthropic(anthropicModelId as any),
        messages: history,
        tools: { viewerCommands: viewerCommandsTool },
        maxToolRoundtrips: 1,
        temperature: config.llm?.temperature || 0.2,
        maxTokens: config.llm?.maxTokens || 2000
      } as any);

      // Capture any tool call results (if the model returns textual tool output)
      const toolOutput = (result as any)?.toolResults
        ? JSON.stringify((result as any).toolResults, null, 2)
        : undefined;

      reply.type("application/json").send({ reply: (result as any).text, commands: capturedCommands.length ? capturedCommands : undefined, toolOutput });
    } catch (err: any) {
      reply.code(500).send({ error: "CHAT_ERROR", message: String(err?.message || err) });
    }
  });

  // Summarise a node by id via Claude CLI; persist Markdown alongside tags in llm_annotation.json
  app.post("/api/summarise-node", async (req, reply) => {
    try {
      const body: any = (req as any).body || {};
      const node: any = body?.node;
      if (!node || typeof node !== 'object') { reply.code(400).send({ error: 'BAD_REQUEST', message: 'Missing node' }); return; }

      const config = await loadGlobalConfig();
      if (!process.env.ANTHROPIC_API_KEY) {
        reply.code(400).send({ error: 'NO_API_KEY', message: 'Missing ANTHROPIC_API_KEY in .env.local' });
        return;
      }

      // Use Claude CLI via summarise-via-claude (agentic exploration across repo/docs)
      const { runSummariseViaClaude } = await import("../annotation/summarise-via-claude.js");
      const file: string = String(node.file || '');
      const start: number = Number(node.line || 1);
      const end: number = Number(node.endLine || 0);
      const outDir = dirname(resolvedDataFile);
      const targetDir = (opts.workspaceRoot || repoRoot);
      const graphPath = resolvedDataFile;
      let markdown: string;
      try {
        markdown = await runSummariseViaClaude({ outDir, targetDir, graphPath, node: { id: String(node.id), label: String(node.label), module: String(node.module || ''), file, line: start, endLine: end || undefined, signature: String(node.signature || ''), doc: String(node.doc || '') } });
      } catch (e: any) {
        const debug = {
          outDir,
          command: join(outDir, 'summarise_command.txt'),
          userPrompt: join(outDir, 'summarise_user_prompt.txt'),
          raw: join(outDir, 'summarise.raw'),
        };
        reply.code(500).send({ error: 'CLAUDE_RUN_FAILED', message: String(e?.message || e), debug });
        return;
      }

      // Persist into llm_annotation.json next to the graph
      try {
        const dir = dirname(resolvedDataFile);
        const annPath = join(dir, 'llm_annotation.json');
        let ann: any = {
          version: 1,
          schemaVersion: '1.0.0',
          generatedAt: new Date().toISOString(),
          vocabMode: 'open',
          globalTags: [],
          projectTags: [],
          nodes: []
        };
        try {
          const raw = await readFile(annPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') ann = parsed;
        } catch {}
        if (!Array.isArray(ann.nodes)) ann.nodes = [];
        let entry = ann.nodes.find((n: any) => n && n.id === node.id);
        if (!entry) {
          entry = { id: node.id, tags: [], summary: markdown };
          ann.nodes.push(entry);
        } else {
          entry.summary = markdown;
        }
        ann.modifiedAt = new Date().toISOString();
        await writeFile(annPath, JSON.stringify(ann, null, 2), 'utf8');
      } catch (e: any) {
        const dir = dirname(resolvedDataFile);
        reply.code(500).send({ error: 'ANNOTATION_WRITE_FAILED', message: String(e?.message || e), debug: { annPath: join(dir, 'llm_annotation.json') } });
        return;
      }

      reply.type('application/json').send({ summary: markdown });
    } catch (err: any) {
      reply.code(500).send({ error: 'SUMMARISE_ERROR', message: String(err?.message || err) });
    }
  });

  // Return source code for a file with optional line range
  app.get("/api/source", async (req, reply) => {
    try {
      const q: any = (req as any).query || {};
      const file = String(q.file || "");
      const start = Number(q.start || 1);
      const end = Number(q.end || 0);
      if (!file) { reply.code(400).send({ error: "BAD_REQUEST", message: "Missing file" }); return; }
      const abs = resolveInWorkspace(file);
      const text = await readFile(abs, "utf8");
      if (!Number.isFinite(start) || start < 1 || !Number.isFinite(end) || end < 0) {
        reply.type("application/json").send({ file: abs, content: text });
        return;
      }
      const lines = text.split(/\r?\n/);
      const slice = lines.slice(start - 1, end > 0 ? end : undefined).join("\n");
      reply.type("application/json").send({ file: abs, start, end: end || lines.length, content: slice });
    } catch (err: any) {
      reply.code(500).send({ error: "SOURCE_ERROR", message: String(err?.message || err) });
    }
  });

  // Minimal favicon to reduce noise in console
  app.get("/favicon.ico", async (_req, reply) => {
    reply.code(204).send();
  });

  app.register(fastifyStatic, { root, prefix: "/" });

  // --- Analyzer config mutation and manual extract endpoints ---
  app.post("/api/config/exclude", async (req, reply) => {
    try {
      const body: any = (req as any).body || {};
      const addPaths: string[] = Array.isArray(body?.paths) ? body.paths.map((s: any) => String(s)).filter(Boolean) : [];
      const addModules: string[] = Array.isArray(body?.modules) ? body.modules.map((s: any) => String(s)).filter(Boolean) : [];
      const configFile = String(opts.configFilePath || "");
      if (!configFile) { reply.code(400).send({ error: "NO_CONFIG", message: "Server not started with --config; cannot persist excludes" }); return; }
      let content = await readFile(configFile, "utf8");
      // Parse to determine current state and avoid duplicates
      let parsed: any = {};
      try { parsed = parseToml(content) as any; } catch {}
      if (!parsed.analyzer) parsed.analyzer = {};
      const currentExclude: string[] = Array.isArray(parsed.analyzer.exclude) ? parsed.analyzer.exclude.slice() : [];
      const currentExcludeModules: string[] = Array.isArray(parsed.analyzer.excludeModules) ? parsed.analyzer.excludeModules.slice() : [];
      const toAddPaths = addPaths.filter(p => !currentExclude.includes(p));
      const toAddModules = addModules.filter(m => !currentExcludeModules.includes(m));
      if (toAddPaths.length === 0 && toAddModules.length === 0) {
        reply.type("application/json").send({ ok: true, added: { paths: [], modules: [] } });
        return;
      }
      // Mutate TOML text in-place, preserving formatting
      content = mutateTomlArray(content, "analyzer", "exclude", toAddPaths);
      content = mutateTomlArray(content, "analyzer", "excludeModules", toAddModules);
      await writeFile(configFile, content, "utf8");
      reply.type("application/json").send({ ok: true, added: { paths: toAddPaths, modules: toAddModules } });
    } catch (err: any) {
      reply.code(500).send({ error: "EXCLUDE_PERSIST_FAILED", message: String(err?.message || err) });
    }
  });

  app.post("/api/extract", async (_req, reply) => {
    try {
      const configFile = String(opts.configFilePath || "");
      if (!configFile) { reply.code(400).send({ error: "NO_CONFIG", message: "Server not started with --config; cannot extract" }); return; }
      const { loadAndResolveConfigFromFile } = await import("../config/loadConfig.js");
      const cfg = await loadAndResolveConfigFromFile(resolve(configFile));
      const outPath = join(cfg.outputDir, "codebase_graph.json");
      const { runExtract: runExtractPython } = await import("../analyzer/extract-python.js");
      const { runExtract: runExtractTypeScript } = await import("../analyzer/extract-typescript.js");
      await runExtractPython({ targetDir: cfg.targetDir, outPath, analyzer: { exclude: cfg.analyzer.exclude, includeOnly: cfg.analyzer.includeOnly, excludeModules: cfg.analyzer.excludeModules } });
      await runExtractTypeScript({ targetDir: cfg.targetDir, outPath, analyzer: { exclude: cfg.analyzer.exclude, includeOnly: cfg.analyzer.includeOnly, excludeModules: cfg.analyzer.excludeModules } });
      reply.type("application/json").send({ ok: true });
    } catch (err: any) {
      reply.code(500).send({ error: "EXTRACT_FAILED", message: String(err?.message || err) });
    }
  });

  // Lens CRUD: list, fetch, save, delete
  app.get("/out/lenses/index.json", async (_req, reply) => {
    try {
      const dir = dirname(resolvedDataFile);
      const lensesDir = join(dir, "lenses");
      await mkdir(lensesDir, { recursive: true });
      const files = (await readdir(lensesDir)).filter(f => f.endsWith('.json'));
      const names = files.map(f => f.replace(/\.json$/i, ''));
      reply.type("application/json").send({ names });
    } catch (err: any) {
      reply.code(500).send({ error: "LENS_LIST_ERROR", message: String(err?.message || err) });
    }
  });

  app.get("/out/lenses/:name.json", async (req, reply) => {
    try {
      const name = String((req.params as any).name || "").replace(/[^A-Za-z0-9_\-]/g, "");
      if (!name) { reply.code(400).send({ error: "BAD_REQUEST", message: "Missing name" }); return; }
      const dir = dirname(resolvedDataFile);
      const file = join(dir, "lenses", `${name}.json`);
      const json = await readFile(file, "utf8");
      reply.type("application/json").send(json);
    } catch (err: any) {
      reply.code(404).send({ error: "LENS_NOT_FOUND", message: String(err?.message || err) });
    }
  });

  app.post("/api/lens/save", async (req, reply) => {
    try {
      const body: any = (req as any).body || {};
      const nameRaw = String(body?.name || "");
      const name = nameRaw.replace(/[^A-Za-z0-9_\-]/g, "").slice(0, 64);
      const lens = body?.lens;
      if (!name || !lens) { reply.code(400).send({ error: "BAD_REQUEST", message: "Missing name or lens" }); return; }
      const dir = dirname(resolvedDataFile);
      const lensesDir = join(dir, "lenses");
      await mkdir(lensesDir, { recursive: true });
      const file = join(lensesDir, `${name}.json`);
      const data = typeof lens === 'string' ? lens : JSON.stringify(lens, null, 2);
      await writeFile(file, data, "utf8");
      reply.type("application/json").send({ ok: true, name });
    } catch (err: any) {
      reply.code(500).send({ error: "LENS_SAVE_ERROR", message: String(err?.message || err) });
    }
  });

  app.delete("/api/lens/:name", async (req, reply) => {
    try {
      const name = String((req.params as any).name || "").replace(/[^A-Za-z0-9_\-]/g, "");
      if (!name) { reply.code(400).send({ error: "BAD_REQUEST", message: "Missing name" }); return; }
      const dir = dirname(resolvedDataFile);
      const file = join(dir, "lenses", `${name}.json`);
      if (!existsSync(file)) { reply.code(404).send({ error: "LENS_NOT_FOUND", message: "No such lens" }); return; }
      await unlink(file);
      reply.type("application/json").send({ ok: true, name });
    } catch (err: any) {
      reply.code(500).send({ error: "LENS_DELETE_ERROR", message: String(err?.message || err) });
    }
  });

  await app.listen({ host: opts.host, port: opts.port });
  if (opts.openBrowser) {
    const url = `http://${opts.host}:${opts.port}`;
    if (!existsSync(indexPath)) {
      console.log("Waiting for initial viewer build to complete before opening the browser...");
      await waitForFileExists(indexPath).catch(() => {});
    }
    await import("open").then(m => (m as any).default(url)).catch(() => {});
  }
  return app;
}
