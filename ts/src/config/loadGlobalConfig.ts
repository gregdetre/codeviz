import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { parse } from "toml";

export type GlobalConfig = {
  llm?: {
    provider?: string;
    model?: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  };
};

function getGlobalConfigCandidatePaths(): string[] {
  const candidates: string[] = [];
  // Highest priority: explicit env var override
  const override = process.env.CODEVIZ_GLOBAL_CONFIG || process.env.CODEVIZ_CONFIG;
  if (override) candidates.push(resolve(override));

  // macOS: ~/Library/Application Support/codeviz/config.toml
  const macPath = join(homedir(), "Library", "Application Support", "codeviz", "config.toml");
  candidates.push(macPath);

  // Linux (XDG): $XDG_CONFIG_HOME/codeviz/config.toml or ~/.config/codeviz/config.toml
  const xdgBase = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  candidates.push(join(xdgBase, "codeviz", "config.toml"));

  // Windows: %APPDATA%\codeviz\config.toml
  if (process.platform === "win32") {
    const appdata = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
    candidates.push(join(appdata, "codeviz", "config.toml"));
  }

  // De-duplicate while preserving order
  return [...new Set(candidates)];
}

export async function loadGlobalConfig(): Promise<GlobalConfig> {
  const candidates = getGlobalConfigCandidatePaths();
  for (const file of candidates) {
    try {
      if (!existsSync(file)) continue;
      const toml = await readFile(file, "utf8");
      return parse(toml) as GlobalConfig;
    } catch {
      // try next candidate
    }
  }
  return {};
}

export function resolveGlobalConfigPath(): string | undefined {
  const candidates = getGlobalConfigCandidatePaths();
  return candidates.find(p => existsSync(p));
}


