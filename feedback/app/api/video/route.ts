import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getSessionById } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { video_url: videoUrl } = session;

  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    return NextResponse.redirect(videoUrl);
  }

  try {
    const buffer = await readFile(videoUrl);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Video file not found" }, { status: 404 });
  }
}
