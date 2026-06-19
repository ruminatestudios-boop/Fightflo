import { NextRequest, NextResponse } from "next/server";
import { validateBearerApiKey } from "@/lib/api/auth";
import { getSessionById, getReportBySessionId } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKey = await validateBearerApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const session = await getSessionById(params.id);
  if (!session || session.user_id !== apiKey.user_id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "complete") {
    return NextResponse.json(
      { error: "Report not ready", status: session.status },
      { status: 202 }
    );
  }

  const report = await getReportBySessionId(params.id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({
    session_id: session.id,
    sport: session.sport,
    level: session.level,
    analysed_at: report.created_at,
    coach_summary: report.coach_summary,
    main_weakness: report.main_weakness,
    positives: report.positives,
    drills: report.drill,
    timestamps: report.confirmed_events ?? [],
    pose_quality: report.pose_quality ?? null,
  });
}
