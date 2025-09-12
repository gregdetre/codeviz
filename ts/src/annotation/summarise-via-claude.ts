import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { getRepoRootFromThisFile, renderTemplate, runClaudeProject } from "./claudeRunner.js";
import { buildFunctionXml } from "./payloads.js";

export async function runSummariseViaClaude(opts: {
  outDir: string;
  targetDir: string;
  graphPath?: string; // path to codebase_graph.json for adjacency
  node: { id: string; label: string; module?: string; file: string; line: number; endLine?: number | null; signature?: string; doc?: string };
  model?: string; // e.g. "sonnet"
  contextBudget?: number;
}): Promise<string> {
  const repoRoot = getRepoRootFromThisFile();
  const outDir = resolve(opts.outDir);
  const targetDir = resolve(opts.targetDir);
  const model = opts.model || process.env.CODEVIZ_SUMMARISE_MODEL || "sonnet";
  const templateDir = join(repoRoot, "ts", "src", "annotation", "templates");
  const n = opts.node;
  const xml = await buildFunctionXml(n, { targetDir, graphPath: opts.graphPath });
  const userPrompt = renderTemplate(templateDir, "summarise_function.njk", {
    contextBudget: Number(opts.contextBudget || 50000),
    targetName: targetDir.split(/[\\/]/).pop() || "project",
    nodeId: n.id,
    nodeLabel: n.label,
    nodeModule: n.module || "",
    nodeFile: n.file,
    lineStart: n.line,
    lineEnd: n.endLine || "",
    signature: n.signature || "",
    doc: n.doc || "",
    xmlPayload: xml,
  });

  await writeFile(join(outDir, "summarise_user_prompt.txt"), userPrompt, "utf8");

  const { text } = await runClaudeProject({
    userPrompt,
    addDirs: [outDir, targetDir],
    model,
    output: 'text',
    logPrefix: 'summarise'
  });

  return text;
}


