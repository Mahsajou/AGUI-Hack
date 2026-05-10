import { parseFigmaFileKey } from "./figma-sync";
import type { DesignSystemStatus, FigmaSnapshot } from "./types";

type Store = {
  status: DesignSystemStatus;
  pending: FigmaSnapshot | null;
  confirmed: FigmaSnapshot | null;
  lastError: string | null;
  /** After explicit reset (DELETE), do not auto-link the default URL until next server restart. */
  suppressAutoDefault: boolean;
};

const DEFAULT_COMMUNITY_FILE =
  "https://www.figma.com/community/file/1543337041090580818";

function defaultFigmaFileUrl(): string {
  return (
    process.env.IDEALENS_FIGMA_DEFAULT_FILE_URL?.trim() ||
    process.env.NEXT_PUBLIC_IDEALENS_FIGMA_DESIGN_SYSTEM_URL?.trim() ||
    DEFAULT_COMMUNITY_FILE
  );
}

function fileLabelFromUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[0-9]+$/.test(last)) return "Figma design system";
    return decodeURIComponent(last ?? "Figma design system")
      .replace(/-/g, " ")
      .slice(0, 80);
  } catch {
    return "Figma design system";
  }
}

/** If nothing is linked yet, confirm the kit default Community file URL (override via env). */
export function ensureDefaultFigmaLinked(): void {
  if (process.env.IDEALENS_DISABLE_AUTO_FIGMA === "1") return;

  const s = getStore();
  if (s.confirmed || s.pending || s.suppressAutoDefault) return;
  if (s.status !== "not_connected") return;

  const fileUrl = defaultFigmaFileUrl();
  if (!/figma\.com\//i.test(fileUrl)) return;

  const syncedAt = new Date().toISOString();
  const fileKey = parseFigmaFileKey(fileUrl) ?? undefined;
  s.confirmed = {
    linkKind: "figma_file_url",
    fileUrl,
    fileKey,
    fileName: fileLabelFromUrl(fileUrl),
    componentNames: [],
    syncedAt,
    summary:
      "Default Figma file URL (auto-linked). Change or reset on the design system page.",
  };
  s.status = "ready";
  s.lastError = null;
}

function emptyStore(): Store {
  return {
    status: "not_connected",
    pending: null,
    confirmed: null,
    lastError: null,
    suppressAutoDefault: false,
  };
}

function getStore(): Store {
  const g = globalThis as unknown as { __idealensDesignStore?: Store };
  if (!g.__idealensDesignStore) {
    g.__idealensDesignStore = emptyStore();
  }
  return g.__idealensDesignStore;
}

export function getDesignSystemState(): {
  status: DesignSystemStatus;
  pending: FigmaSnapshot | null;
  confirmed: FigmaSnapshot | null;
  lastError: string | null;
} {
  ensureDefaultFigmaLinked();
  const s = getStore();
  return {
    status: s.status,
    pending: s.pending,
    confirmed: s.confirmed,
    lastError: s.lastError,
  };
}

export function setFetching(): void {
  const s = getStore();
  s.status = "fetching";
  s.lastError = null;
}

export function setPreview(snapshot: FigmaSnapshot): void {
  const s = getStore();
  s.pending = snapshot;
  s.status = "awaiting_confirm";
  s.lastError = null;
}

export function setError(message: string): void {
  const s = getStore();
  s.status = "error";
  s.lastError = message;
}

export function confirmPending(): FigmaSnapshot | null {
  const s = getStore();
  if (!s.pending) return null;
  s.confirmed = { ...s.pending, syncedAt: new Date().toISOString() };
  s.pending = null;
  s.status = "ready";
  s.lastError = null;
  return s.confirmed;
}

export function clearDesignSystem(): void {
  const g = globalThis as unknown as { __idealensDesignStore?: Store };
  const cleared = emptyStore();
  cleared.suppressAutoDefault = true;
  g.__idealensDesignStore = cleared;
}

export function getConfirmedSnapshot(): FigmaSnapshot | null {
  ensureDefaultFigmaLinked();
  return getStore().confirmed;
}
