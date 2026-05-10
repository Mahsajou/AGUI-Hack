import { NextResponse } from "next/server";

import {
  clearDesignSystem,
  getDesignSystemState,
} from "@/lib/idealens/snapshot-store";

export async function GET() {
  const s = getDesignSystemState();
  return NextResponse.json({
    status: s.status,
    pending: s.pending,
    confirmed: s.confirmed,
    lastError: s.lastError,
  });
}

export async function DELETE() {
  clearDesignSystem();
  return NextResponse.json({ ok: true, status: "not_connected" as const });
}
