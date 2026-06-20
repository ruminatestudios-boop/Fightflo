import { NextRequest, NextResponse } from "next/server";
import { listRecentSessions } from "@/lib/db/queries";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const provided = request.headers.get("x-admin-secret")?.trim();
  return provided === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const sessions = await listRecentSessions(150, status);

  const failedCount = sessions.filter((s) => s.status === "failed").length;
  const completeCount = sessions.filter((s) => s.status === "complete").length;

  return NextResponse.json({
    sessions,
    failedCount,
    completeCount,
    totalCount: sessions.length,
  });
}
