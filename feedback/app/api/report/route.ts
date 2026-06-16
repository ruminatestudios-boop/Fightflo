import { NextRequest, NextResponse } from "next/server";
import { ensureDevDatabaseReady } from "@/lib/db/devFallback";
import {
  getReportById,
  getReportBySessionId,
  getSessionById,
} from "@/lib/db/queries";
import { startAnalysisPipeline } from "@/lib/analysis/startPipeline";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const reportId = request.nextUrl.searchParams.get("reportId");

  try {
    await ensureDevDatabaseReady();
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

      let report = await getReportBySessionId(sessionId);

      // Local dev resilience: if a session is stuck "processing" with no report,
      // re-kick analysis once.
      if (
        process.env.NODE_ENV === "development" &&
        !report &&
        session.status === "processing"
      ) {
        const step = (session as { progress_step?: string }).progress_step ?? "";
        const message = (session as { progress_message?: string }).progress_message ?? "";
        const ageMs = Date.now() - new Date(session.created_at).getTime();

        if (ageMs > 20_000 && (step === "generating_clips" || message.includes("final touches"))) {
          startAnalysisPipeline(sessionId);
          // re-read once after triggering
          report = await getReportBySessionId(sessionId);
        }
      }
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
