import { NextRequest, NextResponse } from "next/server";
import { getReportBySessionId, getSessionById, getUserById } from "@/lib/db/queries";
import { parseGuardCalibration } from "@/lib/analysis/guardCalibration";
import { hasProAccess } from "@/lib/config/env";
import { exportWatermarkedVideo } from "@/lib/video/exportWatermarkedVideo";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Pro-only: download video with pose overlay + FIGHTFLO. watermark burned in */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const userId = request.nextUrl.searchParams.get("userId");

  if (!sessionId || !userId) {
    return NextResponse.json(
      { error: "sessionId and userId required" },
      { status: 400 }
    );
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.user_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = await getUserById(userId);
  if (!hasProAccess(user)) {
    return NextResponse.json(
      { error: "Pro plan required to download watermarked video", code: "PRO_REQUIRED" },
      { status: 402 }
    );
  }

  try {
    const report = await getReportBySessionId(sessionId);
    const { buffer, filename } = await exportWatermarkedVideo(
      session.video_url,
      sessionId,
      report?.raw_landmark_data?.length
        ? {
            landmarkTimeline: report.raw_landmark_data,
            guardCalibration: parseGuardCalibration(report.landmark_summary),
            confirmedEvents: report.confirmed_events ?? [],
          }
        : undefined
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[video/download]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Export failed — is ffmpeg installed?",
      },
      { status: 500 }
    );
  }
}
