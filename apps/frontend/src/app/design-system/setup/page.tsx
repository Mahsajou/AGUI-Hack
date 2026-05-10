"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Palette } from "lucide-react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import type { DesignSystemLinkKind } from "@/lib/idealens/types";

/** Default design system file (Figma Community). Override via NEXT_PUBLIC_IDEALENS_FIGMA_DESIGN_SYSTEM_URL. */
const DEFAULT_FILE_URL =
  process.env.NEXT_PUBLIC_IDEALENS_FIGMA_DESIGN_SYSTEM_URL ||
  "https://www.figma.com/community/file/1543337041090580818";

const DEFAULT_MCP_URL = "https://mcp.figma.com/mcp";

export default function DesignSystemSetupPage() {
  const [linkKind, setLinkKind] = useState<DesignSystemLinkKind>("figma_file_url");
  const [fileUrl, setFileUrl] = useState(DEFAULT_FILE_URL);
  const [mcpUrl, setMcpUrl] = useState(DEFAULT_MCP_URL);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const runPreview = async () => {
    const trimmedFile = fileUrl.trim();
    const trimmedMcp = mcpUrl.trim();

    if (linkKind === "figma_file_url") {
      if (!/figma\.com\//i.test(trimmedFile)) {
        toast.message("Paste a full figma.com file or community URL.");
        return;
      }
    } else {
      if (!/^https?:\/\//i.test(trimmedMcp)) {
        toast.message("MCP URL should start with http:// or https://");
        return;
      }
    }

    const body =
      linkKind === "figma_file_url"
        ? { linkKind: "figma_file_url" as const, fileUrl: trimmedFile }
        : { linkKind: "figma_mcp" as const, mcpUrl: trimmedMcp };

    setPreviewLoading(true);
    setLastError(null);
    setSummary(null);
    setSample([]);
    try {
      const r = await fetch("/api/idealens/figma/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setLastError(j.error ?? "Preview failed");
        toast.error(j.error ?? "Preview failed");
        return;
      }
      setSummary(j.summary ?? null);
      setSample((j.pending?.componentNames ?? []).slice(0, 12));
      toast.success("Review the summary, then confirm.");
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
      const snap = j.snapshot as { linkKind?: string; componentNames?: string[] };
      toast.success("Design system ready.");
      setSummary(
        `Confirmed: ${snap?.linkKind === "figma_mcp" ? "Figma MCP" : "Figma file"} · ${
          snap?.componentNames?.length ?? 0
        } imported components (optional)`,
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
              Design system link
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose <strong>Figma file URL</strong> (your library or a Community file
              you use) or <strong>Figma MCP URL</strong> (e.g. official MCP endpoint for
              agents / IDE). No personal access token is required here—the app stores
              the link for designer guardrails and prompts. Default file:{" "}
              <Link
                href={DEFAULT_FILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                Community design system
              </Link>
              .
            </p>
          </div>
        </div>

        <fieldset className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Link type
          </legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="linkKind"
              checked={linkKind === "figma_file_url"}
              onChange={() => setLinkKind("figma_file_url")}
              className="accent-primary"
            />
            Figma file URL (design system file)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="linkKind"
              checked={linkKind === "figma_mcp"}
              onChange={() => setLinkKind("figma_mcp")}
              className="accent-primary"
            />
            Figma MCP server URL
          </label>
        </fieldset>

        {linkKind === "figma_file_url" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Figma file URL</label>
            <p className="text-xs text-muted-foreground">
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                figma.com/design/…
              </code>{" "}
              or{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                figma.com/community/file/…
              </code>
            </p>
            <input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Figma MCP URL</label>
            <p className="text-xs text-muted-foreground">
              Endpoint your agents or Cursor use to talk to Figma (often the official
              hosted MCP).
            </p>
            <input
              value={mcpUrl}
              onChange={(e) => setMcpUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void runPreview()} disabled={previewLoading}>
            {previewLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Preview link…
              </>
            ) : (
              "Preview link"
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
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No component list is stored in this flow—designer prompts use your link
                only.
              </p>
            )}
          </div>
        ) : null}

        <Button variant="outline" asChild className="w-full">
          <Link href="/workspace">← Back to workspace</Link>
        </Button>
      </div>
    </div>
  );
}
