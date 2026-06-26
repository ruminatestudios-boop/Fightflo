import { NextRequest, NextResponse } from "next/server";
import { ensureDevDatabaseReady } from "@/lib/db/devFallback";
import {
  claimPipelineRekick,
  getReportById,
  getReportBySessionId,
  getSessionById,
  updateSessionStatus,
} from "@/lib/db/queries";
import { scheduleAnalysisPipeline } from "@/lib/analysis/startPipeline";

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

      const step = (session as { progress_step?: string }).progress_step ?? "";
      const message =
        (session as { progress_message?: string }).progress_message ?? "";
      const ageMs = Date.now() - new Date(session.created_at).getTime();
      const stuckEarly =
        !report &&
        session.status !== "complete" &&
        session.status !== "failed" &&
        (session.status === "uploading" ||
          step === "uploading" ||
          (step === "extracting_frames" && ageMs > 45_000));

      if (stuckEarly && (await claimPipelineRekick(sessionId))) {
        scheduleAnalysisPipeline(sessionId);
      }

      // Self-heal: the report is the part that matters and it already saved.
      // If clip generation/export died silently after that (serverless
      // timeout kills the function before the pipeline's own catch block
      // can run), the session is left stuck on "processing" forever and
      // the client polls indefinitely showing "Cutting your highlight
      // clips…" with no way out. Past a generous grace period, just mark
      // it complete — clips are a nice-to-have, not the report itself.
      if (
        report &&
        session.status === "processing" &&
        ageMs > 3 * 60_000 &&
        ["generating_clips", "writing_report", "preparing_download"].includes(step)
      ) {
        await updateSessionStatus(sessionId, "complete", {
          step: "complete",
          message: "Your report is ready.",
        });
        session.status = "complete";
        (session as { progress_step?: string }).progress_step = "complete";
        (session as { progress_message?: string }).progress_message =
          "Your report is ready.";
      }

      // Local dev resilience: if a session is stuck on late steps, re-kick once.
      if (
        process.env.NODE_ENV === "development" &&
        !report &&
        session.status === "processing"
      ) {
        if (
          ageMs > 20_000 &&
          (step === "generating_clips" || message.includes("final touches")) &&
          (await claimPipelineRekick(sessionId))
        ) {
          scheduleAnalysisPipeline(sessionId);
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
