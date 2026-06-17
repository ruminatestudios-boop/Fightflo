import { NextRequest, NextResponse } from "next/server";
import { createAnonymousUser, getUserById } from "@/lib/db/queries";
import type { SportId, SkillLevel } from "@/types";

export const runtime = "nodejs";

/** Ensure an anonymous user exists in the DB. Creates one if userId is missing or not found. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, sport = "boxing", level = "beginner" } = body as {
      userId?: string;
      sport?: SportId;
      level?: SkillLevel;
    };

    if (userId) {
      const existing = await getUserById(userId);
      if (existing) {
        return NextResponse.json({ userId: existing.id });
      }
    }

    const user = await createAnonymousUser(sport as SportId, level as SkillLevel);
    return NextResponse.json({ userId: user.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to ensure user" },
      { status: 500 }
    );
  }
}
