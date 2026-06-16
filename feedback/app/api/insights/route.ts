import { NextRequest, NextResponse } from "next/server";
import { ensureDevDatabaseReady } from "@/lib/db/devFallback";
import { buildHomeInsights } from "@/lib/insights/homeInsights";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    await ensureDevDatabaseReady();
    const insights = await buildHomeInsights(userId);
    return NextResponse.json({ insights });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load insights",
      },
      { status: 500 }
    );
  }
}
