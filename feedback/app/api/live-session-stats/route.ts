import { NextRequest, NextResponse } from "next/server";
import { createLiveSessionStat } from "@/lib/db/queries";

const ALLOWED_SOURCE_MODES = new Set(["shadowbox"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      sourceMode?: string;
      guardDrops?: number;
      totalFaults?: number;
      positiveCount?: number;
      faultVariety?: number;
    };

    if (!body.userId?.trim()) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (!body.sourceMode || !ALLOWED_SOURCE_MODES.has(body.sourceMode)) {
      return NextResponse.json({ error: "Invalid sourceMode" }, { status: 400 });
    }

    await createLiveSessionStat({
      userId: body.userId,
      sourceMode: body.sourceMode,
      guardDrops: Math.max(0, Math.round(body.guardDrops ?? 0)),
      totalFaults: Math.max(0, Math.round(body.totalFaults ?? 0)),
      positiveCount: Math.max(0, Math.round(body.positiveCount ?? 0)),
      faultVariety: Math.max(0, Math.round(body.faultVariety ?? 0)),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save" },
      { status: 500 }
    );
  }
}
