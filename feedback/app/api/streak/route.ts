import { NextRequest, NextResponse } from "next/server";
import { getUserActiveDateKeys } from "@/lib/db/queries";
import { computeStreak } from "@/lib/insights/streak";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const activeDateKeys = await getUserActiveDateKeys(userId);
    const streak = computeStreak(activeDateKeys);
    return NextResponse.json(streak);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load streak" },
      { status: 500 }
    );
  }
}
