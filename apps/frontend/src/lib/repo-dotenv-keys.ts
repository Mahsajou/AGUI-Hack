import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

type GeminiKeys = {
  geminiApiKey?: string;
  googleApiKey?: string;
  geminiModel?: string;
};

let memo:
  | { envPath: string; mtimeMs: number; keys: GeminiKeys }
  | null = null;

function dirsToProbe(): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (d: string) => {
    const norm = path.resolve(d);
    if (seen.has(norm)) return;
    seen.add(norm);
    ordered.push(norm);
  };

  let dir = process.cwd();
  pushUnique(dir);
  for (let i = 0; i < 24; i += 1) {
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
    pushUnique(dir);
  }

  pushUnique(path.resolve(process.cwd(), ".."));
  pushUnique(path.resolve(process.cwd(), "../.."));

  return ordered;
}

function findAncestorEnvDir(): string | null {
  for (const dir of dirsToProbe()) {
    const fp = path.join(dir, ".env");
    if (fs.existsSync(fp)) return dir;
  }
  return null;
}

/** Reads Gemini keys from nearest ancestor `.env` (monorepo root). Survives Turbopack stripping `process.env`. */
export function readGeminiKeysFromRepoEnv(): GeminiKeys {
  const dir = findAncestorEnvDir();
  if (!dir) return {};

  const envPath = path.join(dir, ".env");
  try {
    const stat = fs.statSync(envPath);
    if (
      memo &&
      memo.envPath === envPath &&
      memo.mtimeMs === stat.mtimeMs &&
      memo.keys
    ) {
      return memo.keys;
    }
    const parsed = dotenv.parse(fs.readFileSync(envPath, "utf8"));
    const keys: GeminiKeys = {
      geminiApiKey: parsed.GEMINI_API_KEY,
      googleApiKey: parsed.GOOGLE_API_KEY,
      geminiModel: parsed.GEMINI_MODEL,
    };
    memo = { envPath, mtimeMs: stat.mtimeMs, keys };
    return keys;
  } catch {
    return {};
  }
}
