import { runDemoAnalysisPipeline } from "@/lib/analysis/demo-pipeline";
import { isRealAnalysisPipelineEnabled } from "@/lib/config/env";
import { updateSessionStatus } from "@/lib/db/queries";

/** Run analysis — in dev, fall back to demo pipeline if the real one fails. */
export function startAnalysisPipeline(sessionId: string): void {
  if (!isRealAnalysisPipelineEnabled()) {
    runDemoAnalysisPipeline(sessionId).catch(console.error);
    return;
  }

  void (async () => {
    try {
      const { runAnalysisPipeline } = await import("@/lib/analysis/pipeline");
      await runAnalysisPipeline(sessionId);
    } catch (error) {
      console.error("[pipeline]", error);

      if (process.env.NODE_ENV !== "development") return;

      console.warn(
        "[pipeline] Real analysis failed in dev — falling back to demo pipeline."
      );
      await updateSessionStatus(sessionId, "processing", {
        step: "writing_report",
        message: "Using demo analysis for local dev…",
      });
      await runDemoAnalysisPipeline(sessionId);
    }
  })();
}
