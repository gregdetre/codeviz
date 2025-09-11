import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { readFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export async function startServer(opts: { host: string; port: number; openBrowser: boolean; viewerLayout?: string; viewerMode?: string; hybridMode?: string }) {
  const app = Fastify();
  // Resolve viewer dist robustly across run contexts (tsx, node, different CWDs)
  const candidates = [
    resolve(process.cwd(), "ts/viewer/dist"),
    resolve(process.cwd(), "viewer/dist"),
    resolve(fileURLToPath(new URL("../../viewer/dist", import.meta.url)))
  ];
  const root = candidates.find(p => existsSync(join(p, "index.html"))) || candidates[0];
  const repoRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
  const outFile = existsSync(join(process.cwd(), "out/codebase_graph.json"))
    ? join(process.cwd(), "out/codebase_graph.json")
    : join(repoRoot, "out/codebase_graph.json");

  // Resolve log file location under out/
  const outDirCandidates = [
    join(process.cwd(), "out"),
    join(repoRoot, "out")
  ];
  const outDir = outDirCandidates.find(p => existsSync(p)) || outDirCandidates[0];
  const logFile = join(outDir, "viewer.log");

  app.get("/", async (_req, reply) => {
    const index = await readFile(join(root, "index.html"), "utf8");
    reply.type("text/html").send(index);
  });

  app.get("/out/codebase_graph.json", async (_req, reply) => {
    try {
      const json = await readFile(outFile, "utf8");
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

  // Minimal favicon to reduce noise in console
  app.get("/favicon.ico", async (_req, reply) => {
    reply.code(204).send();
  });

  // Client log forwarder: POST JSON lines to out/viewer.log
  app.post("/client-log", async (req, reply) => {
    try {
      const body: any = (req as any).body ?? {};
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        level: body?.level ?? "log",
        message: body?.message ?? "",
        data: body?.data ?? null,
        ua: (req.headers as any)["user-agent"] ?? "",
        ip: (req as any).ip ?? ""
      }) + "\n";
      await mkdir(dirname(logFile), { recursive: true });
      await appendFile(logFile, line, "utf8");
      reply.send({ ok: true });
    } catch (err: any) {
      reply.code(500).send({ ok: false, error: String(err?.message || err) });
    }
  });

  // Expose the log file for quick tailing/inspection
  app.get("/out/viewer.log", async (_req, reply) => {
    try {
      const content = existsSync(logFile) ? await readFile(logFile, "utf8") : "";
      reply.type("text/plain").send(content);
    } catch (err: any) {
      reply.code(500).send(String(err?.message || err));
    }
  });

  app.register(fastifyStatic, { root, prefix: "/" });

  await app.listen({ host: opts.host, port: opts.port });
  if (opts.openBrowser) {
    const url = `http://${opts.host}:${opts.port}`;
    await import("open").then(m => (m as any).default(url)).catch(() => {});
  }
}
