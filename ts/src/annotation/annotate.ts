import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadGlobalConfig } from "../config/loadGlobalConfig.js";
import { loadAndResolveConfigFromFile } from "../config/loadConfig.js";

export type VocabMode = "closed" | "open" | "suggest";
export type RankMode = "mixed" | "centrality" | "fanin" | "fanout" | "loc";

export async function runAnnotate(opts: { targetDir: string; outDir: string; vocab: VocabMode; limit: number; rank: RankMode; verbose: number }) {
  const targetDir = resolve(opts.targetDir);
  const outDir = resolve(opts.outDir);
  const graphPath = join(outDir, "codebase_graph.json");
  if (!existsSync(graphPath)) {
    throw new Error(`No codebase graph found at ${graphPath}. Run extraction first.`);
  }
  const raw = await readFile(graphPath, "utf8");
  const graph = JSON.parse(raw) as any;

  // Load vocabularies
  const globalCfg = await loadGlobalConfig();
  // best-effort load of per-target config to pull project tags (optional)
  let projectTags: string[] = [];
  try {
    // Attempt to resolve config file from conventional locations based on target dir name
    const base = targetDir.split(/[\\\/]/).pop() || "";
    const cand1 = resolve(process.cwd(), `${base}.codeviz.toml`);
    const cand2 = resolve(process.cwd(), "configs", `${base}.codeviz.toml`);
    for (const f of [cand1, cand2]) {
      try {
        const r = await loadAndResolveConfigFromFile(f);
        projectTags = (r as any)?.tags?.project ?? [];
        break;
      } catch {}
    }
  } catch {}
  const globalTags: string[] = (globalCfg as any)?.tags?.global ?? [];

  // Compute cheap metrics
  const nodeIndex: Record<string, any> = {};
  for (const n of graph.nodes) nodeIndex[n.id] = n;
  const fanin: Record<string, number> = {};
  const fanout: Record<string, number> = {};
  for (const e of graph.edges) {
    fanout[e.source] = (fanout[e.source] ?? 0) + 1;
    fanin[e.target] = (fanin[e.target] ?? 0) + 1;
  }
  type Row = { id: string; label: string; kind: string; module: string; file: string; loc: number; fanin: number; fanout: number; degree: number };
  const rows: Row[] = graph.nodes
    .filter((n: any) => n.kind === "function")
    .map((n: any) => {
      const loc = Number(n.loc || 0);
      const fi = Number(fanin[n.id] || 0);
      const fo = Number(fanout[n.id] || 0);
      return { id: n.id, label: n.label, kind: n.kind, module: n.module, file: n.file, loc, fanin: fi, fanout: fo, degree: fi + fo };
    });

  // Ranking
  function norm(v: number, min: number, max: number): number { return max > min ? (v - min) / (max - min) : 0; }
  function score(row: Row, mode: RankMode): number {
    if (mode === "centrality") return row.degree;
    if (mode === "fanin") return row.fanin;
    if (mode === "fanout") return row.fanout;
    if (mode === "loc") return row.loc;
    // mixed: weighted normalized fi, fo, loc
    const mins = {
      fi: Math.min(...rows.map(r => r.fanin), 0),
      fo: Math.min(...rows.map(r => r.fanout), 0),
      loc: Math.min(...rows.map(r => r.loc), 0)
    } as any;
    const maxs = {
      fi: Math.max(...rows.map(r => r.fanin), 1),
      fo: Math.max(...rows.map(r => r.fanout), 1),
      loc: Math.max(...rows.map(r => r.loc), 1)
    } as any;
    const s = 0.4 * norm(row.fanin, mins.fi, maxs.fi)
            + 0.3 * norm(row.fanout, mins.fo, maxs.fo)
            + 0.3 * norm(row.loc, mins.loc, maxs.loc);
    return s;
  }
  const ranked = rows.slice().sort((a, b) => score(b, opts.rank) - score(a, opts.rank));
  const chosen = opts.limit > 0 ? ranked.slice(0, opts.limit) : ranked;

  // v1: placeholder annotation logic (no API call yet). We'll map basic heuristics to tags.
  const vocab = new Set<string>([...globalTags, ...projectTags]);
  const nodesOut: Array<{ id: string; tags: string[] }> = [];
  const suggestCounts: Record<string, number> = {};

  for (const r of chosen) {
    const tags: string[] = [];
    // Simple heuristics to bootstrap before LLM integration
    if (r.label.toLowerCase().includes("log") || r.module.includes("log")) maybeAdd("logging");
    if (r.fanin >= 3) maybeAdd("api");
    if (r.fanout >= 5) maybeAdd("compute");
    if (r.label === "main" || /main|run|cli|entry/.test(r.label)) maybeAdd("entrypoint");
    if (r.label.toLowerCase().includes("parse") || r.label.toLowerCase().includes("load")) maybeAdd("parse");

    function maybeAdd(tag: string) {
      if (opts.vocab === "open" || vocab.has(tag)) tags.push(tag);
      else if (opts.vocab === "suggest" && !vocab.has(tag)) {
        suggestCounts[tag] = (suggestCounts[tag] ?? 0) + 1;
      }
    }
    if (tags.length > 0) {
      nodesOut.push({ id: r.id, tags });
    }
  }

  const out = {
    version: 1,
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    vocabMode: opts.vocab,
    globalTags,
    projectTags,
    suggestedTags: opts.vocab === "suggest" ? Object.entries(suggestCounts).map(([tag, count]) => ({ tag, count })) : undefined,
    nodes: nodesOut
  } as any;

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "llm_annotation.json"), JSON.stringify(out, null, 2), "utf8");

  if (opts.verbose > 0) {
    console.log(`[annotate] wrote ${join(outDir, "llm_annotation.json")} with ${nodesOut.length} entries`);
  }
}
