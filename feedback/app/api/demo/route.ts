import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_VIDEO_URL,
  getDemoClips,
  getDemoConfirmedEvents,
  getDemoFeedback,
  getDemoPoseQuality,
} from "@/lib/demo/sampleData";
import { createSession, ensureUser } from "@/lib/storage/sessions";
import { saveReport } from "@/lib/db/queries";
import type { SkillLevel, SportId } from "@/types";

export const runtime = "nodejs";

/** Create a completed session + report with dummy coaching data for UI testing */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sport?: SportId;
      level?: SkillLevel;
      userId?: string | null;
    };

    const sport = body.sport ?? "boxing";
    const level = body.level ?? "intermediate";
    const userId = await ensureUser(sport, level, body.userId ?? null);
    const sessionId = crypto.randomUUID();
    const feedback = getDemoFeedback(sport, level);

    await createSession({
      id: sessionId,
      userId,
      sport,
      level,
      videoUrl: DEMO_VIDEO_URL,
      videoDuration: 185,
      cloudinaryPublicId: "demo/sample",
    });

    await saveReport({
      sessionId,
      userId,
      sport,
      feedback,
      landmarkData: [],
      clips: getDemoClips(feedback),
      poseQuality: getDemoPoseQuality(),
      confirmedEvents: getDemoConfirmedEvents(),
      landmarkSummary: {
        avg_elbow_angle_cross: 142,
        guard_drop_events: 6,
      },
    });

    return NextResponse.json({ sessionId, userId });
  } catch (error) {
    console.error("[demo]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Demo failed" },
      { status: 500 }
    );
  }
}
