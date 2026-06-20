import { NextRequest, NextResponse } from "next/server";
import { scheduleAnalysisPipeline } from "@/lib/analysis/startPipeline";
import { ensureDevDatabaseReady } from "@/lib/db/devFallback";
import { storeVideo } from "@/lib/storage/video-upload";
import {
  getAnalysisAllowance,
  createSession,
  ensureUser,
  recordAnalysisUsed,
} from "@/lib/storage/sessions";
import { updateSessionStatus } from "@/lib/db/queries";
import { validateParentSession } from "@/lib/upload/validateParentSession";
import type { SkillLevel, SportId } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Cloudinary direct upload finished — create session from metadata only */
async function handleCloudinaryComplete(request: NextRequest) {
  const body = (await request.json()) as {
    sessionId: string;
    userId: string;
    sport: SportId;
    level: SkillLevel;
    videoUrl: string;
    cloudinaryPublicId: string;
    videoDuration: number;
    parentSessionId?: string | null;
  };

  const {
    sessionId,
    userId,
    sport,
    level,
    videoUrl,
    cloudinaryPublicId,
    videoDuration,
    parentSessionId,
  } = body;

  if (!sessionId || !userId || !videoUrl || !cloudinaryPublicId) {
    return NextResponse.json({ error: "Missing upload metadata" }, { status: 400 });
  }

  if (parentSessionId) {
    const parentCheck = await validateParentSession(parentSessionId, userId);
    if (!parentCheck.ok) {
      return NextResponse.json({ error: parentCheck.error }, { status: 400 });
    }
  }

  const crewToken = request.headers.get("x-crew-token");
  const allowance = await getAnalysisAllowance(userId, crewToken);
  if (!allowance.canAnalyse) {
    return NextResponse.json(
      { error: allowance.message, allowance },
      { status: 402 }
    );
  }

  const session = await createSession({
    userId,
    sport,
    level,
    videoUrl,
    videoDuration: Math.round(videoDuration || 60),
    cloudinaryPublicId,
    id: sessionId,
    parentSessionId: parentSessionId ?? null,
  });

  await updateSessionStatus(session.id, "processing", {
    step: "extracting_frames",
    message: "Pulling frames from your video at 12 fps…",
  });

  await recordAnalysisUsed(userId, crewToken);
  scheduleAnalysisPipeline(session.id);

  return NextResponse.json({
    sessionId: session.id,
    userId,
    videoUrl,
    status: "processing",
  });
}

/** Local dev — upload file through API */
async function handleDirectUpload(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("video") as File | null;
  const sport = (formData.get("sport") as SportId) ?? "boxing";
  const level = (formData.get("level") as SkillLevel) ?? "intermediate";
  const userIdParam = formData.get("userId") as string | null;
  const parentSessionId = formData.get("parentSessionId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No video file provided" }, { status: 400 });
  }

  const userId = await ensureUser(sport, level, userIdParam);

  if (parentSessionId) {
    const parentCheck = await validateParentSession(parentSessionId, userId);
    if (!parentCheck.ok) {
      return NextResponse.json({ error: parentCheck.error }, { status: 400 });
    }
  }

  const crewToken = request.headers.get("x-crew-token");
  const allowance = await getAnalysisAllowance(userId, crewToken);
  if (!allowance.canAnalyse) {
    return NextResponse.json(
      { error: allowance.message, allowance },
      { status: 402 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const tempSessionId = crypto.randomUUID();
  const upload = await storeVideo(buffer, tempSessionId);

  const session = await createSession({
    userId,
    sport,
    level,
    videoUrl: upload.url,
    videoDuration: Math.round(upload.duration),
    cloudinaryPublicId: upload.publicId,
    parentSessionId: parentSessionId ?? null,
  });

  await updateSessionStatus(session.id, "processing", {
    step: "extracting_frames",
    message: "Pulling frames from your video at 12 fps…",
  });

  await recordAnalysisUsed(userId, crewToken);
  scheduleAnalysisPipeline(session.id);

  return NextResponse.json({
    sessionId: session.id,
    userId,
    videoUrl: upload.url,
    status: "processing",
  });
}

export async function POST(request: NextRequest) {
  try {
    await ensureDevDatabaseReady();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return handleCloudinaryComplete(request);
    }

    return handleDirectUpload(request);
  } catch (error) {
    console.error("[upload]", error);
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
