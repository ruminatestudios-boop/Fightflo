import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { getReportBySessionId, getSessionById, getUserById } from "@/lib/db/queries";
import { hasProAccess } from "@/lib/config/env";
import { cacheExportVideo } from "@/lib/video/cacheExportVideo";
import { resolveExportVideoUrl } from "@/lib/video/exportVideoUrl";

export const runtime = "nodejs";
export const maxDuration = 300;

function attachmentResponse(
  body: ReadableStream | null,
  filename: string,
  contentLength?: number
): NextResponse {
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, max-age=3600",
  };
  if (contentLength !== undefined) {
    headers["Content-Length"] = String(contentLength);
  }
  return new NextResponse(body, { headers });
}

/** Pro-only: download video with skeleton overlay burned in */
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
      { error: "Pro plan required to download video", code: "PRO_REQUIRED" },
      { status: 402 }
    );
  }

  const filename = `fightflo-${session.id.slice(0, 8)}.mp4`;

  try {
    const report = await getReportBySessionId(sessionId);
    const forceRebuild = request.nextUrl.searchParams.get("rebuild") === "1";
    let videoUrl = forceRebuild
      ? null
      : await resolveExportVideoUrl(sessionId, report);

    if (!videoUrl) {
      videoUrl = await cacheExportVideo(sessionId, { forceRebuild });
    }

    if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
      const remote = await fetch(videoUrl);
      if (!remote.ok) {
        throw new Error("Could not fetch export video");
      }
      const length = remote.headers.get("content-length");
      return attachmentResponse(
        remote.body,
        filename,
        length ? Number(length) : undefined
      );
    }

    const info = await stat(videoUrl);
    const stream = createReadStream(videoUrl);
    const webStream = Readable.toWeb(stream) as ReadableStream;
    return attachmentResponse(webStream, filename, info.size);
  } catch (error) {
    console.error("[video/download]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Export failed — try again shortly",
      },
      { status: 500 }
    );
  }
}
