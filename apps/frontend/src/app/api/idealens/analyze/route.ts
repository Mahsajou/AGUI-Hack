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
    const researchPromise = runResearcher(idea);

    if (!snapshot || snapshot.componentNames.length === 0) {
      const research = await researchPromise;
      const design: SetupRequiredPayload = {
        setup_required: true,
        headline: "Connect Figma to unlock design concepts",
        body:
          "The design agent only proposes UI that uses components from your real Figma library. " +
          "Set up your design system (file + personal access token), preview what we pulled, then confirm. " +
          "Research below still runs without Figma.",
        cta_href: "/design-system/setup",
        cta_label: "Set up design system",
      };
      return NextResponse.json({ research, design });
    }

    const [research, concept] = await Promise.all([
      researchPromise,
      runDesigner(idea, snapshot.componentNames),
    ]);

    return NextResponse.json({
      research,
      design: { setup_required: false as const, concept },
      figma: {
        fileName: snapshot.fileName,
        fileKey: snapshot.fileKey,
        syncedAt: snapshot.syncedAt,
        componentCount: snapshot.componentNames.length,
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
