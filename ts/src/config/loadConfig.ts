import { readFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { parse } from "toml";

export type CodevizConfig = {
  analyzer?: { exclude?: string[] };
  output?: { path?: string };
  viewer?: { layout?: string };
};

export async function loadConfigForTarget(targetDir: string): Promise<CodevizConfig> {
  const name = basename(targetDir);
  const file = resolve(process.cwd(), `${name}.codeviz.toml`);
  try {
    const toml = await readFile(file, "utf8");
    return parse(toml) as CodevizConfig;
  } catch {
    return {};
  }
}
