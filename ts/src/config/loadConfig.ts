import { readFile } from "node:fs/promises";
import { resolve, basename, join } from "node:path";
import { parse } from "toml";

export type CodevizConfig = {
  analyzer?: {
    exclude?: string[];
    includeOnly?: string[];
    excludeModules?: string[];
  };
  output?: {
    path?: string;
    dir?: string;
  };
  viewer?: {
    layout?: string;
    mode?: string;
    host?: string;
    port?: number;
  };
};

export async function loadConfigForTarget(targetDir: string): Promise<CodevizConfig> {
  const name = basename(targetDir);
  const rootFile = resolve(process.cwd(), `${name}.codeviz.toml`);
  const altFile = resolve(process.cwd(), join("configs", `${name}.codeviz.toml`));
  const candidates = [rootFile, altFile];
  for (const file of candidates) {
    try {
      const toml = await readFile(file, "utf8");
      return parse(toml) as CodevizConfig;
    } catch {
      // try next candidate
    }
  }
  return {};
}

export async function loadConfigFromFile(configPath: string): Promise<CodevizConfig> {
  const file = resolve(configPath);
  const toml = await readFile(file, "utf8");
  return parse(toml) as CodevizConfig;
}
