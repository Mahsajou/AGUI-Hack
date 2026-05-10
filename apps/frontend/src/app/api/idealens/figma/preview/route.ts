import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchFigmaFileSummary, parseFigmaFileKey } from "@/lib/idealens/figma-sync";
import {
  getDesignSystemState,
  setError,
  setFetching,
  setPreview,
} from "@/lib/idealens/snapshot-store";

const bodySchema = z.object({
  figmaToken: z.string().min(1),
  fileKeyOrUrl: z.string().min(1),
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

  const { figmaToken, fileKeyOrUrl } = parsed.data;
  const fileKey = parseFigmaFileKey(fileKeyOrUrl);
  if (!fileKey) {
    return NextResponse.json(
      {
        error: "Could not parse Figma file key",
        hint: "Paste a figma.com/file/… or figma.com/design/… URL, or the raw file key.",
      },
      { status: 400 },
    );
  }

  setFetching();
  try {
    const { fileName, componentNames } = await fetchFigmaFileSummary(
      fileKey,
      figmaToken.trim(),
    );
    const summary = `Found ${componentNames.length} components in “${fileName}”.`;
    const syncedAt = new Date().toISOString();
    setPreview({
      fileKey,
      fileName,
      componentNames,
      syncedAt,
      summary,
    });
    const state = getDesignSystemState();
    return NextResponse.json({
      status: state.status,
      pending: state.pending,
      summary,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    setError(message);
    const state = getDesignSystemState();
    return NextResponse.json(
      { status: state.status, error: message },
      { status: 502 },
    );
  }
}
