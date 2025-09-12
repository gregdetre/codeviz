import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
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
  const configPath = join(repoRoot, "codeviz.config.toml");
  
  if (!existsSync(configPath)) {
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

export async function startServer(opts: { host: string; port: number; openBrowser: boolean; viewerLayout?: string; viewerMode?: string; hybridMode?: string; dataFilePath?: string; workspaceRoot?: string }): Promise<FastifyInstance> {
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

  // Minimal favicon to reduce noise in console
  app.get("/favicon.ico", async (_req, reply) => {
    reply.code(204).send();
  });

  app.register(fastifyStatic, { root, prefix: "/" });

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
