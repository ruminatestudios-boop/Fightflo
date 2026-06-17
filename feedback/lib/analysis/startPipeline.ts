import { runDemoAnalysisPipeline } from "@/lib/analysis/demo-pipeline";
import { isRealAnalysisPipelineEnabled } from "@/lib/config/env";
import { updateSessionStatus } from "@/lib/db/queries";
import { runWithScanCost } from "@/lib/telemetry/scanCost";

async function markPipelineFailed(sessionId: string, error: unknown): Promise<void> {
  const message =
    error instanceof Error ? error.message : "Analysis failed — please try uploading again.";
  try {
    await updateSessionStatus(sessionId, "failed", {
      step: "failed",
      message,
    });
  } catch (updateError) {
    console.error("[pipeline] could not mark session failed:", updateError);
  }
}

/** Run analysis to completion — always updates session status on failure */
export async function executeAnalysisPipeline(sessionId: string): Promise<void> {
  if (!isRealAnalysisPipelineEnabled()) {
    await runWithScanCost(sessionId, "demo", () =>
      runDemoAnalysisPipeline(sessionId)
    );
    return;
  }

  try {
    await runWithScanCost(sessionId, "real", async () => {
      const { runAnalysisPipeline } = await import("@/lib/analysis/pipeline");
      await runAnalysisPipeline(sessionId);
    });
  } catch (error) {
    console.error("[pipeline]", error);

    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[pipeline] Real analysis failed in dev — falling back to demo pipeline."
      );
      try {
        await updateSessionStatus(sessionId, "processing", {
          step: "writing_report",
          message: "Using demo analysis for local dev…",
        });
        await runWithScanCost(sessionId, "demo", () =>
          runDemoAnalysisPipeline(sessionId)
        );
        return;
      } catch (demoError) {
        await markPipelineFailed(sessionId, demoError);
        throw demoError;
      }
    }

    await markPipelineFailed(sessionId, error);
    throw error;
  }
}

/** Keep the pipeline alive after the HTTP response on Vercel serverless */
export function scheduleAnalysisPipeline(sessionId: string): void {
  const job = executeAnalysisPipeline(sessionId);

  void import("@vercel/functions")
    .then(({ waitUntil }) => {
      waitUntil(job);
    })
    .catch(() => {
      void job;
    });
}

/** @deprecated Use scheduleAnalysisPipeline */
export function startAnalysisPipeline(sessionId: string): void {
  scheduleAnalysisPipeline(sessionId);
}
