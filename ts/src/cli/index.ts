import { Cli, Command, Option } from "clipanion";
import { resolve, dirname, join } from "node:path";
import { homedir } from "node:os";
import { runExtract } from "../analyzer/extract-python.js";
import { loadConfigForTarget } from "../config/loadConfig.js";
import { loadGlobalConfig } from "../config/loadGlobalConfig.js";
import { startServer } from "../server/server.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import chalk from "chalk";


class ExtractPython extends Command {
  static paths = [["extract", "python"]];
  dir = Option.String({ required: true });
  out = Option.String("--out", "out/codebase_graph.json");
  verbose = Option.Boolean("-v,--verbose", false);
  async execute() {
    const target = resolve(this.dir);
    const cfg = await loadConfigForTarget(target);
    const configuredOut = cfg.output?.path ?? this.out ?? "out/codebase_graph.json";
    const outPath = resolve(configuredOut);
    await runExtract({
      targetDir: target,
      outPath,
      verbose: this.verbose,
      analyzer: {
        exclude: cfg.analyzer?.exclude ?? [],
        includeOnly: cfg.analyzer?.includeOnly ?? [],
        excludeModules: cfg.analyzer?.excludeModules ?? []
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
  target = Option.String("--target", "");
  noBrowser = Option.Boolean("--no-browser", false);
  killExisting = Option.Boolean("--kill-existing", true);
  async execute() {
    // Generate timestamp in yyMMdd_HHmm format
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${yy}${MM}${dd}_${HH}${mm}`;
    
    let viewerLayout = "elk-then-fcose";
    let resolvedHost = this.host || "127.0.0.1";
    let resolvedPort: number | undefined = this.port ? Number(this.port) : undefined;
    let mode = this.mode || "default";

    // Per-target config (if provided)
    if (this.target) {
      try {
        const cfg = await loadConfigForTarget(resolve(this.target));
        viewerLayout = cfg.viewer?.layout ?? viewerLayout;
        if (!this.host && cfg.viewer?.host) resolvedHost = cfg.viewer.host;
        if (!this.port && typeof cfg.viewer?.port === "number") resolvedPort = cfg.viewer.port;
        mode = this.mode || cfg.viewer?.mode || mode;
      } catch {}
    }

    // Global config fallback (only when CLI flag not provided and nothing set yet)
    try {
      const globalCfg = await loadGlobalConfig();
      if (!this.host && globalCfg.viewer?.host) {
        resolvedHost = globalCfg.viewer.host;
      }
      if (!this.port && typeof resolvedPort !== "number" && typeof globalCfg.viewer?.port === "number") {
        resolvedPort = globalCfg.viewer.port;
      }
    } catch {}

    // Built-in defaults
    if (typeof resolvedPort !== "number" || Number.isNaN(resolvedPort)) {
      resolvedPort = 8000;
    }
    
    if (this.killExisting) {
      await this.killProcessOnPort(resolvedPort);
    }
    
    console.log(chalk.green(`[${timestamp}] Starting CodeViz viewer server`));
    console.log(chalk.blue(`Log file: out/viewer.log`));
    console.log(chalk.cyan(`Browser URL: http://${resolvedHost}:${resolvedPort}`));
    
    // Prefer the provided target as the workspace root if available. Expand '~'.
    const expandHome = (p: string) => p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
    const workspaceRoot = this.target ? resolve(expandHome(this.target)) : undefined;
    await startServer({ host: resolvedHost, port: resolvedPort, openBrowser: !this.noBrowser, viewerLayout, viewerMode: mode, hybridMode: this.hybridMode, workspaceRoot });
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
cli.runExit(process.argv.slice(2));
