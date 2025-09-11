import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
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
  // Allow explicit override if provided
  const override = process.env.CODEVIZ_GLOBAL_CONFIG || process.env.CODEVIZ_CONFIG;
  if (override) candidates.push(resolve(override));
  // Project root config file
  candidates.push(resolve(process.cwd(), "codeviz.config.toml"));
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


