"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";

export type Confidence = "known" | "guessing" | "unknown";

export interface Assumption {
  text: string;
  confidence: Confidence;
}

export interface AssumptionMapData {
  assumptions?: Assumption[];
  open_questions?: string[];
  risk_flags?: string[];
}

const confidenceStyle: Record<
  Confidence,
  { label: string; ring: string; bg: string }
> = {
  known: {
    label: "Known",
    ring: "ring-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
  guessing: {
    label: "Guessing",
    ring: "ring-amber-500/35",
    bg: "bg-amber-500/10",
  },
  unknown: {
    label: "Unknown",
    ring: "ring-violet-500/35",
    bg: "bg-violet-500/10",
  },
};

function normalizeConfidence(c: string | undefined): Confidence {
  if (c === "known" || c === "guessing" || c === "unknown") return c;
  return "guessing";
}

export function AssumptionMap({ data }: { data: AssumptionMapData }) {
  const assumptions = data.assumptions ?? [];
  const [dismissed, setDismissed] = useState<Set<number>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const grouped = useMemo(() => {
    const buckets: Record<Confidence, { a: Assumption; i: number }[]> = {
      known: [],
      guessing: [],
      unknown: [],
    };
    assumptions.forEach((a, i) => {
      if (dismissed.has(i)) return;
      const c = normalizeConfidence(a.confidence);
      buckets[c].push({ a, i });
    });
    return buckets;
  }, [assumptions, dismissed]);

  const order: Confidence[] = ["known", "guessing", "unknown"];

  return (
    <div className="my-2 max-w-full rounded-xl border border-border bg-card/90 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            UX Research lens
          </div>
          <h3 className="text-sm font-semibold text-foreground">Assumption map</h3>
        </div>
      </div>

      <div className="space-y-4">
        {order.map((conf) => {
          const items = grouped[conf];
          if (!items.length) return null;
          const st = confidenceStyle[conf];
          return (
            <div key={conf}>
              <div
                className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${st.ring} ${st.bg}`}
              >
                {st.label}
              </div>
              <ul className="space-y-2">
                {items.map(({ a, i }) => {
                  const isOpen = expanded.has(i);
                  return (
                    <li
                      key={`${conf}-${i}`}
                      className="rounded-lg border border-border/80 bg-background/60"
                    >
                      <div className="flex items-start gap-1 p-2.5">
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setExpanded((prev) => {
                              const n = new Set(prev);
                              if (n.has(i)) n.delete(i);
                              else n.add(i);
                              return n;
                            })
                          }
                        >
                          {isOpen ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                        <p className="min-w-0 flex-1 text-sm leading-snug text-foreground">
                          {isOpen ? a.text : `${a.text.slice(0, 140)}${a.text.length > 140 ? "…" : ""}`}
                        </p>
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Dismiss assumption"
                          onClick={() =>
                            setDismissed((prev) => {
                              const n = new Set(prev);
                              n.add(i);
                              return n;
                            })
                          }
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {(data.open_questions?.length ?? 0) > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Open questions
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground/90">
            {(data.open_questions ?? []).map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {(data.risk_flags?.length ?? 0) > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            <AlertTriangle className="size-3.5" />
            Risk flags
          </div>
          <ul className="space-y-1 text-sm text-amber-950/90 dark:text-amber-50/90">
            {(data.risk_flags ?? []).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
