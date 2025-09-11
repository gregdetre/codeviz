import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { generateText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { parse as parseToml } from "toml";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

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

export async function startServer(opts: { host: string; port: number; openBrowser: boolean; viewerLayout?: string; viewerMode?: string; hybridMode?: string; dataFilePath?: string }) {
  const app = Fastify();
  // Resolve viewer dist robustly across run contexts (tsx, node, different CWDs)
  const candidates = [
    resolve(process.cwd(), "ts/viewer/dist"),
    resolve(process.cwd(), "viewer/dist"),
    resolve(fileURLToPath(new URL("../../viewer/dist", import.meta.url)))
  ];
  const root = candidates.find(p => existsSync(join(p, "index.html"))) || candidates[0];
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
  const defaultOut = join(process.cwd(), "out/codebase_graph.json");
  const repoOut = join(repoRoot, "out/codebase_graph.json");
  const resolvedDataFile = opts.dataFilePath
    ? opts.dataFilePath
    : (existsSync(defaultOut) ? defaultOut : repoOut);

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

  app.get("/viewer-config.json", async (_req, reply) => {
    function normalizeLayoutName(name?: string) {
      const raw = (name ?? "").toString().trim().toLowerCase();
      if (raw === "elk" || raw === "fcose") return raw;
      if (raw === "hybrid" || raw === "elk-then-fcose" || raw === "elk_then_fcose" || raw === "elkthenfcose") return "elk-then-fcose";
      return "elk-then-fcose";
    }
    const inferredLayout = normalizeLayoutName(opts.viewerLayout);
    const cfg = { layout: inferredLayout, mode: (opts.viewerMode ?? "default"), hybridMode: (opts.hybridMode ?? "sequential") };
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

  // Minimal chat endpoint (v1): forwards conversation history to LLM via AI SDK
  app.post("/api/chat", async (req, reply) => {
    try {
      const body: any = (req as any).body || {};
      const rawMessages = Array.isArray(body.messages) ? body.messages : [];
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

      const systemMsg: CoreMessage = {
        role: "system",
        content: promptContent
      };
      const history: CoreMessage[] = [systemMsg, ...messages
        .filter(m => m.content.trim().length > 0)
        .map<CoreMessage>(m => ({ role: m.role, content: m.content }))];

      // Construct Anthropic model identifier
      const anthropicModelId = thinking === "thinking" 
        ? `${modelName}-${version}` 
        : `${modelName}-${version}`;

      const { text } = await generateText({
        model: anthropic(anthropicModelId as any),
        messages: history,
        temperature: config.llm?.temperature || 0.2,
        maxTokens: config.llm?.maxTokens || 2000
      });

      reply.type("application/json").send({ reply: text });
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
    await import("open").then(m => (m as any).default(url)).catch(() => {});
  }
}
