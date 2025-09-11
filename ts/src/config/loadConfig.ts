import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, dirname, isAbsolute, join } from "node:path";
import { parse } from "toml";
import { z } from "zod";

export type CodevizConfig = {
  target?: { dir?: string };
  analyzer?: {
    exclude?: string[];
    includeOnly?: string[];
    excludeModules?: string[];
  };
  output?: {
    dir?: string; // Directory where codebase_graph.json will be written
  };
  viewer?: {
    layout?: string;
    mode?: string;
    host?: string;
    port?: number;
  };
  tags?: { project?: string[] };
};

const ConfigSchema = z.object({
  target: z.object({ dir: z.string().min(1, "target.dir is required") }),
  analyzer: z
    .object({
      exclude: z.array(z.string()).optional(),
      includeOnly: z.array(z.string()).optional(),
      excludeModules: z.array(z.string()).optional()
    })
    .optional(),
  output: z.object({ dir: z.string().min(1, "output.dir is required") }),
  viewer: z
    .object({
      layout: z.string().optional(),
      mode: z.string().optional(),
      host: z.string().optional(),
      port: z.number().optional()
    })
    .optional(),
  tags: z.any().optional()
});

export type ResolvedConfig = {
  targetDir: string;
  outputDir: string;
  analyzer: {
    exclude: string[];
    includeOnly: string[];
    excludeModules: string[];
  };
  viewer: {
    layout?: string;
    mode?: string;
    host?: string;
    port?: number;
  };
};

function expandHomePath(p: string): string {
  if (p.startsWith("~")) {
    const os = require("node:os");
    return join(os.homedir(), p.slice(1));
  }
  return p;
}

async function ensureDirectory(dirPath: string): Promise<void> {
  const s = await stat(dirPath).catch(() => null as any);
  if (s) {
    if (!s.isDirectory()) {
      throw new Error(`Configured output.dir is not a directory: ${dirPath}`);
    }
    return;
  }
  await mkdir(dirPath, { recursive: true });
}

export async function loadAndResolveConfigFromFile(configPath: string): Promise<ResolvedConfig> {
  const file = resolve(configPath);
  const cfgDir = dirname(file);
  const toml = await readFile(file, "utf8");
  const parsed = parse(toml) as CodevizConfig;
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const msg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid config: ${msg}`);
  }
  const cfg = result.data;
  const rawTarget = expandHomePath(cfg.target.dir);
  let targetDir = isAbsolute(rawTarget) ? rawTarget : resolve(cfgDir, rawTarget);
  // Fallbacks for user-friendly relative paths (repo root / parent of configs)
  let s = await stat(targetDir).catch(() => null as any);
  if (!s || !s.isDirectory()) {
    const alt1 = resolve(process.cwd(), rawTarget);
    const alt2 = resolve(dirname(cfgDir), rawTarget);
    const altCandidates = [alt1, alt2];
    for (const cand of altCandidates) {
      const ss = await stat(cand).catch(() => null as any);
      if (ss && ss.isDirectory()) { targetDir = cand; s = ss; break; }
    }
  }
  const rawOut = expandHomePath(cfg.output.dir);
  let outputDir = isAbsolute(rawOut) ? rawOut : resolve(cfgDir, rawOut);
  // Ensure output dir exists; if parent relative path was intended, try same fallbacks
  let outStat = await stat(outputDir).catch(() => null as any);
  if (!outStat) {
    const alt1 = resolve(process.cwd(), rawOut);
    const alt2 = resolve(dirname(cfgDir), rawOut);
    for (const cand of [alt1, alt2]) {
      const ss = await stat(cand).catch(() => null as any);
      if (ss && ss.isDirectory()) { outputDir = cand; outStat = ss; break; }
    }
  }

  // Validate targetDir exists and is directory
  if (!s || !s.isDirectory()) {
    throw new Error(`target.dir not found or not a directory: ${targetDir}`);
  }
  await ensureDirectory(outputDir);

  return {
    targetDir,
    outputDir,
    analyzer: {
      exclude: cfg.analyzer?.exclude ?? [],
      includeOnly: cfg.analyzer?.includeOnly ?? [],
      excludeModules: cfg.analyzer?.excludeModules ?? []
    },
    viewer: {
      layout: cfg.viewer?.layout,
      mode: cfg.viewer?.mode,
      host: cfg.viewer?.host,
      port: cfg.viewer?.port
    }
  };
}
