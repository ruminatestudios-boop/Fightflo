import { NextRequest, NextResponse } from "next/server";
import { getReportBySessionId, getSessionById, getUserById } from "@/lib/db/queries";
import { hasProAccess } from "@/lib/config/env";
import { resolveExportVideoUrl } from "@/lib/video/exportVideoUrl";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const userId = request.nextUrl.searchParams.get("userId");

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "sessionId and userId required" }, { status: 400 });
    }

    const session = await getSessionById(sessionId);
    if (!session || session.user_id !== userId) {
      return NextResponse.json({ ready: false }, { status: 404 });
    }

    const user = await getUserById(userId);
    if (!hasProAccess(user)) {
      return NextResponse.json({ ready: false, code: "PRO_REQUIRED" }, { status: 402 });
    }

    const report = await getReportBySessionId(sessionId);
    const url = await resolveExportVideoUrl(sessionId, report);

    return NextResponse.json({ ready: Boolean(url) });
  } catch (error) {
    console.error("[video/download/status]", error);
    return NextResponse.json(
      {
        ready: false,
        error: error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 }
    );
  }
}
