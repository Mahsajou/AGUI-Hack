import type { DesignSystemStatus, FigmaSnapshot } from "./types";

type Store = {
  status: DesignSystemStatus;
  pending: FigmaSnapshot | null;
  confirmed: FigmaSnapshot | null;
  lastError: string | null;
};

function emptyStore(): Store {
  return {
    status: "not_connected",
    pending: null,
    confirmed: null,
    lastError: null,
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
  g.__idealensDesignStore = emptyStore();
}

export function getConfirmedSnapshot(): FigmaSnapshot | null {
  return getStore().confirmed;
}
