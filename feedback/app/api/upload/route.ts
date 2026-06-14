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

export async function POST(request: NextRequest) {
  try {
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

    const runPipeline = isLocalDevMode()
      ? runDemoAnalysisPipeline
      : (await import("@/lib/analysis/pipeline")).runAnalysisPipeline;

    runPipeline(session.id).catch(console.error);

    return NextResponse.json({
      sessionId: session.id,
      userId,
      videoUrl: upload.url,
      status: "processing",
    });
  } catch (error) {
    console.error("[upload]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
