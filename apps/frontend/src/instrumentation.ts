import { loadRepoRootEnv } from "@/lib/load-repo-env";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "edge") return;
  loadRepoRootEnv();
}
