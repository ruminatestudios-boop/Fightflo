import { NextRequest, NextResponse } from "next/server";
import {
  getReportById,
  getReportBySessionId,
  getSessionById,
} from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const reportId = request.nextUrl.searchParams.get("reportId");

  try {
    if (reportId) {
      const report = await getReportById(reportId);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      const session = await getSessionById(report.session_id);
      return NextResponse.json({ report, session });
    }

    if (sessionId) {
      const session = await getSessionById(sessionId);
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const report = await getReportBySessionId(sessionId);
      return NextResponse.json({ report, session });
    }

    return NextResponse.json(
      { error: "sessionId or reportId required" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch report" },
      { status: 500 }
    );
  }
}
