"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Binoculars, Loader2, Sparkles } from "lucide-react";
import { toast, Toaster } from "sonner";

import { AssumptionMap } from "@/components/idealens/AssumptionMap";
import { ConceptSketch } from "@/components/idealens/ConceptSketch";
import { Button } from "@/components/ui/button";
import type {
  ConceptSketchOutput,
  ResearchOutput,
  SetupRequiredPayload,
} from "@/lib/idealens/types";

type DsStatus =
  | "not_connected"
  | "fetching"
  | "awaiting_confirm"
  | "ready"
  | "error";

export default function WorkspacePage() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [dsStatus, setDsStatus] = useState<DsStatus>("not_connected");
  const [dsError, setDsError] = useState<string | null>(null);
  const [research, setResearch] = useState<ResearchOutput | null>(null);
  const [setupRequired, setSetupRequired] = useState<SetupRequiredPayload | null>(
    null,
  );
  const [concept, setConcept] = useState<ConceptSketchOutput | null>(null);
  const [figmaMeta, setFigmaMeta] = useState<{
    linkKind?: "figma_file_url" | "figma_mcp";
    fileName: string;
    syncedAt: string;
    componentCount: number;
    fileUrl?: string;
    mcpUrl?: string;
  } | null>(null);

  const refreshDs = useCallback(async () => {
    try {
      const r = await fetch("/api/idealens/design-system");
      const j = (await r.json()) as {
        status: DsStatus;
        lastError: string | null;
      };
      setDsStatus(j.status);
      setDsError(j.lastError);
    } catch {
      setDsStatus("error");
      setDsError("Could not read design system status");
    }
  }, []);

  useEffect(() => {
    void refreshDs();
  }, [refreshDs]);

  const runAnalyze = async () => {
    const text = idea.trim();
    if (!text) {
      toast.message("Paste a product idea first.");
      return;
    }
    setLoading(true);
    setSetupRequired(null);
    setConcept(null);
    setFigmaMeta(null);
    try {
      const r = await fetch("/api/idealens/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea: text }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.message ?? "Analyze failed");
        return;
      }
      setResearch(j.research as ResearchOutput);
      if (j.design?.setup_required) {
        setSetupRequired(j.design as SetupRequiredPayload);
      } else if (j.design?.concept) {
        setConcept(j.design.concept as ConceptSketchOutput);
        if (j.figma) setFigmaMeta(j.figma);
      }
      await refreshDs();
    } finally {
      setLoading(false);
    }
  };

  const badgeLabel =
    dsStatus === "ready"
      ? "Design system: Ready"
      : dsStatus === "awaiting_confirm"
        ? "Design system: Awaiting confirm"
        : dsStatus === "fetching"
          ? "Design system: Syncing…"
          : dsStatus === "error"
            ? "Design system: Error"
            : "Design system: Not connected";

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="bottom-right" />
      <header className="border-b border-border bg-card/40 px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
              <Binoculars className="size-5 text-violet-600 dark:text-violet-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                IdeaLens
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-[11px] text-muted-foreground"
              title={dsError ?? undefined}
            >
              {badgeLabel}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/design-system/setup">Figma setup</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <section className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Product idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={6}
            placeholder='e.g. "An async tool for product teams to align on new feature ideas before Figma…"'
            className="w-full resize-y rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void runAnalyze()} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Analyze
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Research runs always. Design stays gated until Figma is confirmed.
            </p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Research lens</h2>
            {research ? (
              <AssumptionMap data={research} />
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                Run <strong>Analyze</strong> to populate assumptions, open questions,
                and risk flags.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Design lens</h2>
            {concept ? (
              <>
                {figmaMeta ? (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {figmaMeta.fileName}
                    </span>
                    {figmaMeta.linkKind === "figma_mcp" && figmaMeta.mcpUrl ? (
                      <>
                        {" "}
                        · MCP{" "}
                        <span className="font-mono text-[10px] text-foreground/80">
                          {figmaMeta.mcpUrl}
                        </span>
                      </>
                    ) : null}
                    {figmaMeta.linkKind === "figma_file_url" && figmaMeta.fileUrl ? (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-mono text-[10px] text-foreground/80">
                          {figmaMeta.fileUrl.slice(0, 72)}
                          {figmaMeta.fileUrl.length > 72 ? "…" : ""}
                        </span>
                      </>
                    ) : null}
                    {figmaMeta.componentCount > 0
                      ? ` · ${figmaMeta.componentCount} components`
                      : ""}{" "}
                    · synced {new Date(figmaMeta.syncedAt).toLocaleString()}
                  </p>
                ) : null}
                <ConceptSketch data={concept} />
              </>
            ) : setupRequired ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                  {setupRequired.headline}
                </h3>
                <p className="mt-2 text-sm text-amber-950/90 dark:text-amber-50/90">
                  {setupRequired.body}
                </p>
                <Button className="mt-4" asChild>
                  <Link href={setupRequired.cta_href}>{setupRequired.cta_label}</Link>
                </Button>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                After design system is <strong>Ready</strong> on the setup page, run{" "}
                <strong>Analyze</strong> again for the design lens.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
