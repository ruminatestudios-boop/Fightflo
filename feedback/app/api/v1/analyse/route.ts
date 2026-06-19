import { NextRequest, NextResponse } from "next/server";
import { validateBearerApiKey } from "@/lib/api/auth";
import { createSession, getUserById, deductApiCredit, getApiCredits } from "@/lib/db/queries";
import { scheduleAnalysisPipeline } from "@/lib/analysis/startPipeline";
import { randomUUID } from "crypto";
import type { SkillLevel, SportId } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_SPORTS: SportId[] = ["boxing", "muaythai", "mma", "golf", "tennis", "cricket", "football", "weightlifting"];
const VALID_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "pro"];

export async function POST(request: NextRequest) {
  const apiKey = await validateBearerApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Invalid or missing API key. Pass Authorization: Bearer ff_..." },
      { status: 401 }
    );
  }

  let body: {
    video_url?: string;
    sport?: string;
    level?: string;
    webhook_url?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { video_url, sport = "boxing", level = "intermediate", webhook_url } = body;

  if (!video_url) {
    return NextResponse.json({ error: "video_url is required" }, { status: 400 });
  }

  if (!VALID_SPORTS.includes(sport as SportId)) {
    return NextResponse.json(
      { error: `sport must be one of: ${VALID_SPORTS.join(", ")}` },
      { status: 400 }
    );
  }

  if (!VALID_LEVELS.includes(level as SkillLevel)) {
    return NextResponse.json(
      { error: `level must be one of: ${VALID_LEVELS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const userId = apiKey.user_id;
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const credits = await getApiCredits(userId);
    if (credits <= 0) {
      return NextResponse.json(
        {
          error: "No API credits remaining. Purchase more at https://fightflo.app/developer",
          credits_remaining: 0,
          buy_url: "https://fightflo.app/developer",
        },
        { status: 402 }
      );
    }

    const deducted = await deductApiCredit(userId);
    if (!deducted) {
      return NextResponse.json(
        { error: "Failed to deduct credit", credits_remaining: 0 },
        { status: 402 }
      );
    }

    const sessionId = randomUUID();
    await createSession({
      id: sessionId,
      userId,
      sport: sport as SportId,
      level: level as SkillLevel,
      videoUrl: video_url,
      videoDuration: 0,
    });

    scheduleAnalysisPipeline(sessionId);

    // Fire webhook when done (if provided)
    if (webhook_url) {
      void (async () => {
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 10_000));
          const { getSessionById } = await import("@/lib/db/queries");
          const s = await getSessionById(sessionId);
          if (s?.status === "complete" || s?.status === "failed") {
            await fetch(webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: sessionId, status: s.status }),
            }).catch(() => null);
            break;
          }
        }
      })();
    }

    return NextResponse.json(
      {
        session_id: sessionId,
        status: "processing",
        credits_remaining: credits - 1,
        poll_url: `https://fightflo.app/api/v1/status/${sessionId}`,
        report_url: `https://fightflo.app/api/v1/report/${sessionId}`,
      },
      { status: 202 }
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
