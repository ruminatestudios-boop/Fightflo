import { NextRequest, NextResponse } from "next/server";
import { isCloudinaryConfigured } from "@/lib/config/env";
import { devFallbackUserMessage, ensureDevDatabaseReady } from "@/lib/db/devFallback";
import { getSignedUploadParams } from "@/lib/storage/cloudinary";
import {
  ensureUser,
  getAnalysisAllowance,
} from "@/lib/storage/sessions";
import type { SkillLevel, SportId } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureDevDatabaseReady();
    const body = (await request.json()) as {
      sport?: SportId;
      level?: SkillLevel;
      userId?: string | null;
    };

    const sport = body.sport ?? "boxing";
    const level = body.level ?? "intermediate";
    const userId = await ensureUser(sport, level, body.userId ?? null);

    const allowance = await getAnalysisAllowance(userId);
    if (!allowance.canAnalyse) {
      return NextResponse.json(
        { error: allowance.message, allowance },
        { status: 402 }
      );
    }

    if (!isCloudinaryConfigured()) {
      return NextResponse.json({ mode: "direct" as const, userId });
    }

    const sessionId = crypto.randomUUID();
    const cloudinary = getSignedUploadParams(sessionId);

    return NextResponse.json({
      mode: "cloudinary" as const,
      sessionId,
      userId,
      cloudinary,
    });
  } catch (error) {
    console.error("[upload/sign]", error);
    return NextResponse.json(
      { error: devFallbackUserMessage(error) },
      { status: 500 }
    );
  }
}
