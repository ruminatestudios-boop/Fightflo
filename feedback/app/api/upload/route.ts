import { NextRequest, NextResponse } from "next/server";
import { isLocalDevMode } from "@/lib/config/env";
import { runDemoAnalysisPipeline } from "@/lib/analysis/demo-pipeline";
import { storeVideo } from "@/lib/storage/video-upload";
import {
  getAnalysisAllowance,
  createSession,
  ensureUser,
  recordAnalysisUsed,
} from "@/lib/storage/sessions";
import type { SkillLevel, SportId } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

async function startPipeline(sessionId: string) {
  const runPipeline = isLocalDevMode()
    ? runDemoAnalysisPipeline
    : (await import("@/lib/analysis/pipeline")).runAnalysisPipeline;

  runPipeline(sessionId).catch(console.error);
}

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
  };

  const {
    sessionId,
    userId,
    sport,
    level,
    videoUrl,
    cloudinaryPublicId,
    videoDuration,
  } = body;

  if (!sessionId || !userId || !videoUrl || !cloudinaryPublicId) {
    return NextResponse.json({ error: "Missing upload metadata" }, { status: 400 });
  }

  const allowance = await getAnalysisAllowance(userId);
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
  });

  await recordAnalysisUsed(userId);
  startPipeline(session.id);

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

  if (!file) {
    return NextResponse.json({ error: "No video file provided" }, { status: 400 });
  }

  const userId = await ensureUser(sport, level, userIdParam);

  const allowance = await getAnalysisAllowance(userId);
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
  });

  await recordAnalysisUsed(userId);
  startPipeline(session.id);

  return NextResponse.json({
    sessionId: session.id,
    userId,
    videoUrl: upload.url,
    status: "processing",
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return handleCloudinaryComplete(request);
    }

    return handleDirectUpload(request);
  } catch (error) {
    console.error("[upload]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
