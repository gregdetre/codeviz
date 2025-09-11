import { Cli, Command, Option } from "clipanion";
import { resolve } from "node:path";
import { runExtract } from "../analyzer/extract-python.js";
import { loadConfigForTarget } from "../config/loadConfig.js";
import { startServer } from "../server/server.js";

class ExtractPython extends Command {
  static paths = [["extract", "python"]];
  dir = Option.String({ required: true });
  out = Option.String("--out", "out/codebase_graph.json");
  verbose = Option.Boolean("-v,--verbose", false);
  async execute() {
    const target = resolve(this.dir);
    const cfg = await loadConfigForTarget(target);
    const outPath = this.out ?? cfg.output?.path ?? "out/codebase_graph.json";
    await runExtract({ targetDir: target, outPath, verbose: this.verbose });
  }
}

class ViewOpen extends Command {
  static paths = [["view", "open"]];
  host = Option.String("--host", "127.0.0.1");
  port = Option.String("--port", "8080");
  mode = Option.String("--mode", "default");
  noBrowser = Option.Boolean("--no-browser", false);
  async execute() {
    await startServer({ host: this.host, port: Number(this.port), openBrowser: !this.noBrowser });
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
