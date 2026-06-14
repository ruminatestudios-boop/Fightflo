import { NextRequest, NextResponse } from "next/server";
import { getSessionById, getUserById } from "@/lib/db/queries";
import { exportWatermarkedVideo } from "@/lib/video/exportWatermarkedVideo";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Pro-only: download video with FIGHTFLO. watermark burned in */
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
  if (!user?.is_pro) {
    return NextResponse.json(
      { error: "Pro plan required to download watermarked video", code: "PRO_REQUIRED" },
      { status: 402 }
    );
  }

  try {
    const { buffer, filename } = await exportWatermarkedVideo(
      session.video_url,
      sessionId
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
