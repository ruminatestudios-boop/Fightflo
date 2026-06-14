import { NextRequest, NextResponse } from "next/server";
import { getUserSessions } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const sessions = await getUserSessions(userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
