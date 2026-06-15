import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_CLOUDINARY_PUBLIC_ID,
  DEMO_DISPLAY_NAME,
  DEMO_SUMMARY,
  DEMO_THUMBNAIL_URL,
  DEMO_VIDEO_DURATION,
  DEMO_VIDEO_URL,
  getDemoClips,
  getDemoConfirmedEvents,
  getDemoFeedback,
  getDemoLandmarkSummary,
  getDemoLandmarkTimeline,
  getDemoPoseQuality,
} from "@/lib/demo/sampleData";
import { formatDbError } from "@/lib/db/formatError";
import { saveReport, updateSessionMetadata } from "@/lib/db/queries";
import { createSession, ensureUser } from "@/lib/storage/sessions";
import type { SkillLevel, SportId } from "@/types";

export const runtime = "nodejs";

/** Create a completed session + report from a real baked analysis (Session 21njj). */
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
      videoDuration: DEMO_VIDEO_DURATION,
      cloudinaryPublicId: DEMO_CLOUDINARY_PUBLIC_ID,
    });

    await saveReport({
      sessionId,
      userId,
      sport,
      feedback,
      landmarkData: getDemoLandmarkTimeline(),
      clips: getDemoClips(feedback),
      poseQuality: getDemoPoseQuality(),
      confirmedEvents: getDemoConfirmedEvents(),
      landmarkSummary: getDemoLandmarkSummary(),
    });

    await updateSessionMetadata(sessionId, {
      display_name: DEMO_DISPLAY_NAME,
      summary: DEMO_SUMMARY,
      thumbnail_url: DEMO_THUMBNAIL_URL,
    });

    return NextResponse.json({ sessionId, userId });
  } catch (error) {
    console.error("[demo]", error);
    return NextResponse.json(
      { error: formatDbError(error) },
      { status: 500 }
    );
  }
}
