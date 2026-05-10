import { NextResponse } from "next/server";
import { z } from "zod";

import { runDesigner, runResearcher } from "@/lib/idealens/agents";
import { getConfirmedSnapshot } from "@/lib/idealens/snapshot-store";
import type { SetupRequiredPayload } from "@/lib/idealens/types";

const bodySchema = z.object({
  idea: z.string().min(1).max(20000),
});

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

  const idea = parsed.data.idea.trim();
  const snapshot = getConfirmedSnapshot();

  try {
    /* Sequential Gemini calls reduce burst concurrency vs parallel Promise.all (RPM-style limits). */
    const research = await runResearcher(idea);

    if (!snapshot) {
      const design: SetupRequiredPayload = {
        setup_required: true,
        headline: "Link your design system",
        body:
          "Link a **Figma file URL** or your **Figma MCP URL** on the design system page, then confirm. " +
          "No personal access token is required for that flow. Research below still runs without it.",
        cta_href: "/design-system/setup",
        cta_label: "Design system setup",
      };
      return NextResponse.json({ research, design });
    }

    const concept = await runDesigner(idea, snapshot);

    return NextResponse.json({
      research,
      design: { setup_required: false as const, concept },
      figma: {
        linkKind: snapshot.linkKind,
        fileName: snapshot.fileName,
        fileUrl: snapshot.fileUrl,
        mcpUrl: snapshot.mcpUrl,
        fileKey: snapshot.fileKey,
        componentCount: snapshot.componentNames.length,
        syncedAt: snapshot.syncedAt,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Analyze failed", message },
      { status: 502 },
    );
  }
}
