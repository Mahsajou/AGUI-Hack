import { NextResponse } from "next/server";
import { z } from "zod";

import { parseFigmaFileKey } from "@/lib/idealens/figma-sync";
import {
  getDesignSystemState,
  setPreview,
} from "@/lib/idealens/snapshot-store";
import type { FigmaSnapshot } from "@/lib/idealens/types";

function displayNameFromFileUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[0-9]+$/.test(last)) return "Figma file";
    return decodeURIComponent(last ?? "Figma file").replace(/-/g, " ").slice(0, 80);
  } catch {
    return "Figma file";
  }
}

function displayNameFromMcpUrl(url: string): string {
  try {
    return new URL(url.trim()).host;
  } catch {
    return "Figma MCP";
  }
}

const bodySchema = z.discriminatedUnion("linkKind", [
  z.object({
    linkKind: z.literal("figma_file_url"),
    fileUrl: z.string().min(12, "Paste a full Figma file URL"),
  }),
  z.object({
    linkKind: z.literal("figma_mcp"),
    mcpUrl: z.string().min(8, "Paste your Figma MCP server URL"),
  }),
]);

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const syncedAt = new Date().toISOString();
  let snap: FigmaSnapshot;

  if (parsed.data.linkKind === "figma_file_url") {
    const fileUrl = parsed.data.fileUrl.trim();
    const fileKey = parseFigmaFileKey(fileUrl) ?? "";
    snap = {
      linkKind: "figma_file_url",
      fileUrl,
      fileKey: fileKey || undefined,
      fileName: displayNameFromFileUrl(fileUrl),
      componentNames: [],
      syncedAt,
      summary:
        "Linked by file URL (no server-side Figma token). The designer will use this URL as the design-system reference. Component names are not auto-imported.",
    };
  } else {
    const mcpUrl = parsed.data.mcpUrl.trim();
    snap = {
      linkKind: "figma_mcp",
      mcpUrl,
      fileName: displayNameFromMcpUrl(mcpUrl),
      componentNames: [],
      syncedAt,
      summary:
        "Linked Figma MCP endpoint. Agents or your IDE should use this MCP for live guardrails; the app stores the URL for prompts and metadata.",
    };
  }

  setPreview(snap);
  const state = getDesignSystemState();
  return NextResponse.json({
    status: state.status,
    pending: state.pending,
    summary: snap.summary,
  });
}
