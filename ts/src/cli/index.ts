import { Cli, Command, Option } from "clipanion";
import { resolve, join } from "node:path";
import { runExtract } from "../analyzer/extract-python.js";
import { loadAndResolveConfigFromFile, ResolvedConfig } from "../config/loadConfig.js";
import { startServer } from "../server/server.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import chalk from "chalk";
import { runAnnotateViaClaude, VocabMode } from "../annotation/annotate-via-claude.js";


class ExtractPython extends Command {
  static paths = [["extract", "python"]];
  verbose = Option.Boolean("-v,--verbose", false);
  configFile = Option.String("--config");
  async execute() {
    if (!this.configFile) {
      throw new Error("--config is required and must point to a .toml file");
    }
    const cfg: ResolvedConfig = await loadAndResolveConfigFromFile(resolve(this.configFile));
    const outPath = join(cfg.outputDir, "codebase_graph.json");
    await runExtract({
      targetDir: cfg.targetDir,
      outPath,
      verbose: this.verbose,
      analyzer: {
        exclude: cfg.analyzer.exclude,
        includeOnly: cfg.analyzer.includeOnly,
        excludeModules: cfg.analyzer.excludeModules
      }
    });
  }
}

class ViewOpen extends Command {
  static paths = [["view", "open"]];
  host = Option.String("--host", "");
  port = Option.String("--port", "");
  mode = Option.String("--mode", "");
  hybridMode = Option.String("--hybrid-mode", "sequential");
  noBrowser = Option.Boolean("--no-browser", false);
  killExisting = Option.Boolean("--kill-existing", true);
  configFile = Option.String("--config");
  async execute() {
    if (!this.configFile) {
      throw new Error("--config is required and must point to a .toml file");
    }
    const cfg: ResolvedConfig = await loadAndResolveConfigFromFile(resolve(this.configFile));

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${yy}${MM}${dd}_${HH}${mm}`;

    const viewerLayout = cfg.viewer?.layout ?? "elk-then-fcose";
    const resolvedHost = this.host || cfg.viewer?.host || "127.0.0.1";
    const resolvedPort = Number(this.port || (cfg.viewer?.port ?? 8000));
    const mode = this.mode || cfg.viewer?.mode || "default";

    if (this.killExisting) {
      await this.killProcessOnPort(resolvedPort);
    }

    console.log(chalk.green(`[${timestamp}] Starting CodeViz viewer server`));
    console.log(chalk.blue(`Log file: out/viewer.log`));
    console.log(chalk.cyan(`Browser URL: http://${resolvedHost}:${resolvedPort}`));

    const dataFilePath = join(cfg.outputDir, "codebase_graph.json");
    await startServer({ host: resolvedHost, port: resolvedPort, openBrowser: !this.noBrowser, viewerLayout, viewerMode: mode, hybridMode: this.hybridMode, workspaceRoot: cfg.targetDir, dataFilePath });
  }

  private async killProcessOnPort(port: number) {
    const execAsync = promisify(exec);
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pids = stdout.trim().split('\n').filter(pid => pid);
      if (pids.length > 0) {
        console.log(`Killing existing processes on port ${port}: ${pids.join(', ')}`);
        await execAsync(`kill ${pids.join(' ')}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      // No processes found on port, or other error - continue
    }
  }
}

const cli = new Cli({
  binaryName: "codeviz",
  binaryLabel: "CodeViz (TS)",
  binaryVersion: "0.1.0"
});
cli.register(ExtractPython);
cli.register(ViewOpen);
class AnnotateClaude extends Command {
  static paths = [["annotate"]];
  configFile = Option.String("--config");
  vocab = Option.String("--vocab", "closed");
  contextBudget = Option.String("--context-budget", "100000");
  model = Option.String("--model", "sonnet");
  async execute() {
    if (!this.configFile) {
      throw new Error("--config is required and must point to a .toml file");
    }
    const vocab = (this.vocab as VocabMode);
    if (!["closed","open","suggest"].includes(vocab)) {
      throw new Error("--vocab must be one of closed|open|suggest");
    }
    const budget = Number(this.contextBudget);
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("--context-budget must be a positive integer of tokens");
    }
    await runAnnotateViaClaude({ configFile: resolve(this.configFile), vocab, contextBudget: budget, model: this.model });
  }
}
cli.register(AnnotateClaude);
cli.runExit(process.argv.slice(2));
