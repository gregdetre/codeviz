import { Cli, Command, Option } from "clipanion";
import { resolve, dirname, join } from "node:path";
import { runExtract } from "../analyzer/extract-python.js";
import { loadConfigForTarget } from "../config/loadConfig.js";
import { startServer } from "../server/server.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";


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
    let viewerLayout = "elk";
    let host = this.host || "127.0.0.1";
    let port = this.port ? Number(this.port) : 8080;
    let mode = this.mode || "default";
    if (this.target) {
      try {
        const cfg = await loadConfigForTarget(resolve(this.target));
        viewerLayout = cfg.viewer?.layout ?? viewerLayout;
        host = this.host || cfg.viewer?.host || host;
        port = this.port ? Number(this.port) : (cfg.viewer?.port ?? port);
        mode = this.mode || cfg.viewer?.mode || mode;
      } catch {}
    }
    
    if (this.killExisting) {
      await this.killProcessOnPort(port);
    }
    
    await startServer({ host, port, openBrowser: !this.noBrowser, viewerLayout, viewerMode: mode, hybridMode: this.hybridMode });
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
