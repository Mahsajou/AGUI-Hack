"use client";

import { useState } from "react";
import { Layers, ListOrdered, Sparkles } from "lucide-react";

export interface ConceptSketchData {
  concept_name?: string;
  primary_surface?: string;
  components_used?: string[];
  user_flow?: string[];
  key_interactions?: string[];
  open_design_questions?: string[];
}

export function ConceptSketch({ data }: { data: ConceptSketchData }) {
  const [alt, setAlt] = useState<"A" | "B">("A");

  return (
    <div className="my-2 max-w-full rounded-xl border border-border bg-card/90 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            UX Design lens
          </div>
          <h3 className="text-sm font-semibold text-foreground">Concept sketch</h3>
        </div>
        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-[11px]">
          <button
            type="button"
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              alt === "A"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setAlt("A")}
          >
            Direction A
          </button>
          <button
            type="button"
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              alt === "B"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setAlt("B")}
          >
            Direction B
          </button>
        </div>
      </div>

      {alt === "B" ? (
        <p className="mb-3 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          Alternate framing: tighten scope to one hero workflow, defer edge cases
          to v2, and validate with one pilot team before expanding surfaces.
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-500" />
          <div>
            <div className="text-lg font-semibold leading-tight text-foreground">
              {data.concept_name?.trim() || "Untitled concept"}
            </div>
            {data.primary_surface ? (
              <p className="mt-1 text-sm text-muted-foreground">{data.primary_surface}</p>
            ) : null}
          </div>
        </div>

        {(data.components_used?.length ?? 0) > 0 ? (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="size-3.5" />
              Components (from design system)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(data.components_used ?? []).map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground/90 ring-1 ring-border"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {(data.user_flow?.length ?? 0) > 0 ? (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <ListOrdered className="size-3.5" />
              User flow
            </div>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground/90">
              {(data.user_flow ?? []).map((step, i) => (
                <li key={`${i}-${step.slice(0, 32)}`}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {(data.key_interactions?.length ?? 0) > 0 ? (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Key interactions
            </div>
            <ul className="space-y-1 text-sm text-foreground/90">
              {(data.key_interactions ?? []).map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="text-muted-foreground">→</span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(data.open_design_questions?.length ?? 0) > 0 ? (
          <div className="border-t border-border pt-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Open design questions
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-foreground/85">
              {(data.open_design_questions ?? []).map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
