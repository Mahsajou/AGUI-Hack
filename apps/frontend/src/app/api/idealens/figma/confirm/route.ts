import { NextResponse } from "next/server";

import {
  confirmPending,
  getDesignSystemState,
} from "@/lib/idealens/snapshot-store";

export async function POST() {

  const state = getDesignSystemState();
  if (state.status !== "awaiting_confirm" || !state.pending) {
    return NextResponse.json(
      {
        error: "Nothing to confirm",
        hint: "Run a preview sync first, then confirm.",
      },
      { status: 400 },
    );
  }

  const snap = confirmPending();
  return NextResponse.json({
    ok: true,
    snapshot: snap,
    status: "ready" as const,
  });
}
