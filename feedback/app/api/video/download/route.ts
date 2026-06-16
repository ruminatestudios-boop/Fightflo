import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { getReportBySessionId, getSessionById, getUserById } from "@/lib/db/queries";
import { hasProAccess } from "@/lib/config/env";
import { cacheExportVideo } from "@/lib/video/cacheExportVideo";
import { resolveExportVideoUrl } from "@/lib/video/exportVideoUrl";
import type { LandmarkTimeline } from "@/types";

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

async function buildDownloadResponse(
  sessionId: string,
  userId: string,
  options?: {
    forceRebuild?: boolean;
    landmarkTimeline?: LandmarkTimeline;
    videoWidth?: number;
    videoHeight?: number;
  }
): Promise<NextResponse> {
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
  const forceRebuild = options?.forceRebuild ?? false;
  const report = await getReportBySessionId(sessionId);

  let videoUrl = forceRebuild
    ? null
    : await resolveExportVideoUrl(sessionId, report);

  if (!videoUrl) {
    videoUrl = await cacheExportVideo(sessionId, {
      forceRebuild,
      timeline: options?.landmarkTimeline,
      videoWidth: options?.videoWidth,
      videoHeight: options?.videoHeight,
    });
  }

  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    let remote = await fetch(videoUrl);
    if (!remote.ok) {
      videoUrl = await cacheExportVideo(sessionId, {
        forceRebuild: true,
        timeline: options?.landmarkTimeline,
        videoWidth: options?.videoWidth,
        videoHeight: options?.videoHeight,
      });
      if (!videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
        throw new Error("Could not fetch export video");
      }
      remote = await fetch(videoUrl);
    }
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

  try {
    const forceRebuild = request.nextUrl.searchParams.get("rebuild") === "1";
    return await buildDownloadResponse(sessionId, userId, { forceRebuild });
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

/** Download with browser-collected pose landmarks (server MediaPipe is unreliable). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      userId?: string;
      rebuild?: boolean;
      landmarkTimeline?: LandmarkTimeline;
      videoWidth?: number;
      videoHeight?: number;
    };

    if (!body.sessionId || !body.userId) {
      return NextResponse.json(
        { error: "sessionId and userId required" },
        { status: 400 }
      );
    }

    return await buildDownloadResponse(body.sessionId, body.userId, {
      forceRebuild: body.rebuild ?? true,
      landmarkTimeline: body.landmarkTimeline,
      videoWidth: body.videoWidth,
      videoHeight: body.videoHeight,
    });
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
