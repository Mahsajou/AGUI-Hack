"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Palette } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

/** Default design system (Figma Community). Override via NEXT_PUBLIC_IDEALENS_FIGMA_DESIGN_SYSTEM_URL. */
const DEFAULT_DESIGN_SYSTEM_URL =
  process.env.NEXT_PUBLIC_IDEALENS_FIGMA_DESIGN_SYSTEM_URL ||
  "https://www.figma.com/community/file/1543337041090580818";

export default function DesignSystemSetupPage() {
  const [figmaToken, setFigmaToken] = useState("");
  const [fileKeyOrUrl, setFileKeyOrUrl] = useState(DEFAULT_DESIGN_SYSTEM_URL);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const runPreview = async () => {
    if (!figmaToken.trim() || !fileKeyOrUrl.trim()) {
      toast.message("Add your Figma personal access token and a file URL or key.");
      return;
    }
    setPreviewLoading(true);
    setLastError(null);
    setSummary(null);
    setSample([]);
    try {
      const r = await fetch("/api/idealens/figma/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          figmaToken: figmaToken.trim(),
          fileKeyOrUrl: fileKeyOrUrl.trim(),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setLastError(j.error ?? "Preview failed");
        toast.error(j.error ?? "Preview failed");
        return;
      }
      setSummary(j.summary ?? null);
      setSample((j.pending?.componentNames ?? []).slice(0, 12));
      toast.success("Preview ready — confirm below.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const runConfirm = async () => {
    setConfirmLoading(true);
    setLastError(null);
    try {
      const r = await fetch("/api/idealens/figma/confirm", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        setLastError(j.error ?? "Confirm failed");
        toast.error(j.error ?? "Confirm failed");
        return;
      }
      toast.success("Design system ready.");
      setSummary(
        `Confirmed: ${j.snapshot?.fileName ?? "file"} — ${j.snapshot?.componentNames?.length ?? 0} components`,
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const reset = async () => {
    await fetch("/api/idealens/design-system", { method: "DELETE" });
    setSummary(null);
    setSample([]);
    setLastError(null);
    toast.message("Design system reset.");
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-lg space-y-8">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
            <Palette className="size-5 text-violet-600 dark:text-violet-300" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Design system from Figma
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The design agent asks you to connect Figma first. The file field defaults
              to this team&apos;s{" "}
              <Link
                href={DEFAULT_DESIGN_SYSTEM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                design system (Community)
              </Link>
              . Tokens stay on this server only for the preview request — we do not
              store your PAT after the request completes (in-memory snapshot stores
              component names only).
            </p>
          </div>
        </div>

        <ol className="list-decimal space-y-6 pl-5 text-sm text-foreground/90">
          <li>
            <span className="font-medium text-foreground">Personal access token</span>
            <p className="mt-1 text-muted-foreground">
              Figma → Settings → Security → Generate a token with read access to files.
            </p>
            <input
              type="password"
              autoComplete="off"
              value={figmaToken}
              onChange={(e) => setFigmaToken(e.target.value)}
              placeholder="figd_…"
              className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground"
            />
          </li>
          <li>
            <span className="font-medium text-foreground">File URL or file key</span>
            <p className="mt-1 text-muted-foreground">
              Paste{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                figma.com/design/…
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                figma.com/community/file/…
              </code>
              , or the raw file key. If preview returns 403, open the Community file in
              Figma and <strong>Duplicate to your drafts</strong>, then paste the new
              file URL here.
            </p>
            <input
              value={fileKeyOrUrl}
              onChange={(e) => setFileKeyOrUrl(e.target.value)}
              placeholder="https://www.figma.com/community/file/…"
              className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </li>
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void runPreview()} disabled={previewLoading}>
            {previewLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Pulling from Figma…
              </>
            ) : (
              "Preview sync"
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void runConfirm()}
            disabled={confirmLoading || !summary}
          >
            {confirmLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Confirm design system"
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void reset()}>
            Reset
          </Button>
        </div>

        {lastError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {lastError}
          </p>
        ) : null}

        {summary ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-medium text-foreground">{summary}</p>
            {sample.length > 0 ? (
              <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto font-mono text-[11px] text-muted-foreground">
                {sample.map((n) => (
                  <li key={n}>{n}</li>
                ))}
                <li className="list-none font-sans text-xs italic">
                  …plus more in the full snapshot
                </li>
              </ul>
            ) : null}
          </div>
        ) : null}

        <Button variant="outline" asChild className="w-full">
          <Link href="/workspace">← Back to workspace</Link>
        </Button>
      </div>
    </div>
  );
}
