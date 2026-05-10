import fs from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

function hasGeminiCredentials(): boolean {
  const gem = process.env.GEMINI_API_KEY?.trim() ?? "";
  const goo = process.env.GOOGLE_API_KEY?.trim() ?? "";
  const usable = (v: string) =>
    v.length > 0 && !v.toLowerCase().startsWith("stub");
  return usable(gem) || usable(goo);
}

/** Directory we loaded last (`.env` present). */
let hydratedFromDir: string | null = null;

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

/**
 * Loads `.env` from the nearest ancestor of `cwd` that contains one (usually
 * the monorepo root). Safe to call on every IdeaLens LLM fetch.
 *
 * Older versions used `loaded`; if the first pass found no file and still set
 * that flag, workers never hydrated again — fixes that regression.
 */
export function loadRepoRootEnv(): void {
  if (hasGeminiCredentials()) return;

  if (hydratedFromDir && fs.existsSync(path.join(hydratedFromDir, ".env"))) {
    loadEnvConfig(hydratedFromDir);
    if (hasGeminiCredentials()) return;
    hydratedFromDir = null;
  }

  for (const dir of dirsToProbe()) {
    try {
      if (!fs.existsSync(path.join(dir, ".env"))) continue;
      loadEnvConfig(dir);
      hydratedFromDir = dir;
      if (hasGeminiCredentials()) return;
    } catch {
      /**/
    }
  }
}
