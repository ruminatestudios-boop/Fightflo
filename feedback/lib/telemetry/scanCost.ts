import { AsyncLocalStorage } from "async_hooks";
import { stat } from "fs/promises";
import { isAbsolute } from "path";
import {
  cloudinaryCostUsd,
  computeCostUsd,
  geminiCostUsd,
} from "@/lib/telemetry/costRates";
import { appendScanCostRow } from "@/lib/telemetry/googleSheets";
import { getVideoResourceBytes } from "@/lib/storage/cloudinary";
import { getSessionById } from "@/lib/db/queries";
import type { Session, SportId } from "@/types";

export interface GeminiUsageRecord {
  label: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export class ScanCostCollector {
  readonly sessionId: string;
  readonly startedAt = performance.now();

  pipeline: "real" | "demo" = "real";
  sport: SportId | "" = "";
  userId: string | null = null;
  inviteCode: string | null = null;
  videoDurationSec = 0;
  frameCount = 0;
  clipCount = 0;
  sourceVideoBytes = 0;
  clipBytes = 0;
  exportBytes = 0;
  geminiUsages: GeminiUsageRecord[] = [];
  status: "complete" | "failed" = "complete";
  errorMessage = "";
  durationMs = 0;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  recordGeminiUsage(
    label: string,
    usage: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    }
  ): void {
    this.geminiUsages.push({
      label,
      promptTokens: usage.promptTokenCount ?? 0,
      outputTokens: usage.candidatesTokenCount ?? 0,
      totalTokens: usage.totalTokenCount ?? 0,
    });
  }

  addClipBytes(bytes: number): void {
    this.clipBytes += bytes;
    this.clipCount += 1;
  }

  setExportBytes(bytes: number): void {
    this.exportBytes = bytes;
  }

  setSourceVideoBytes(bytes: number): void {
    this.sourceVideoBytes = bytes;
  }

  private tokensForLabel(label: string): { input: number; output: number } {
    return this.geminiUsages
      .filter((u) => u.label === label)
      .reduce(
        (acc, u) => ({
          input: acc.input + u.promptTokens,
          output: acc.output + u.outputTokens,
        }),
        { input: 0, output: 0 }
      );
  }

  costBreakdown(): {
    geminiUsd: number;
    cloudinaryUsd: number;
    computeUsd: number;
    totalUsd: number;
  } {
    const sportTokens = this.tokensForLabel("sport_detection");
    const coachTokens = this.tokensForLabel("coaching");

    const geminiInput =
      sportTokens.input +
      coachTokens.input +
      this.geminiUsages
        .filter((u) => u.label !== "sport_detection" && u.label !== "coaching")
        .reduce((n, u) => n + u.promptTokens, 0);
    const geminiOutput =
      sportTokens.output +
      coachTokens.output +
      this.geminiUsages
        .filter((u) => u.label !== "sport_detection" && u.label !== "coaching")
        .reduce((n, u) => n + u.outputTokens, 0);

    const geminiUsd = geminiCostUsd(geminiInput, geminiOutput);
    const totalBytes =
      this.sourceVideoBytes + this.clipBytes + this.exportBytes;
    const cloudinaryUsd = cloudinaryCostUsd(totalBytes);
    const computeUsd = computeCostUsd(this.durationMs);
    const totalUsd = geminiUsd + cloudinaryUsd + computeUsd;

    return {
      geminiUsd: roundUsd(geminiUsd),
      cloudinaryUsd: roundUsd(cloudinaryUsd),
      computeUsd: roundUsd(computeUsd),
      totalUsd: roundUsd(totalUsd),
    };
  }

  toRow(runningTotalUsd: number): (string | number)[] {
    const sportTokens = this.tokensForLabel("sport_detection");
    const coachTokens = this.tokensForLabel("coaching");

    const geminiInput =
      sportTokens.input +
      coachTokens.input +
      this.geminiUsages
        .filter((u) => u.label !== "sport_detection" && u.label !== "coaching")
        .reduce((n, u) => n + u.promptTokens, 0);
    const geminiOutput =
      sportTokens.output +
      coachTokens.output +
      this.geminiUsages
        .filter((u) => u.label !== "sport_detection" && u.label !== "coaching")
        .reduce((n, u) => n + u.outputTokens, 0);

    const geminiUsd = geminiCostUsd(geminiInput, geminiOutput);
    const totalBytes =
      this.sourceVideoBytes + this.clipBytes + this.exportBytes;
    const cloudinaryUsd = cloudinaryCostUsd(totalBytes);
    const computeUsd = computeCostUsd(this.durationMs);
    const scanTotalUsd = geminiUsd + cloudinaryUsd + computeUsd;
    const runningTotal = runningTotalUsd + scanTotalUsd;

    return [
      new Date().toISOString(),
      this.sessionId,
      this.userId ?? "",
      this.sport,
      this.videoDurationSec,
      this.sourceVideoBytes,
      this.clipBytes,
      this.exportBytes,
      totalBytes,
      sportTokens.input,
      sportTokens.output,
      coachTokens.input,
      coachTokens.output,
      Math.round(this.durationMs / 1000),
      roundUsd(geminiUsd),
      roundUsd(cloudinaryUsd),
      roundUsd(computeUsd),
      roundUsd(scanTotalUsd),
      roundUsd(runningTotal),
      this.status,
      this.pipeline,
      this.frameCount,
      this.clipCount,
      this.errorMessage,
    ];
  }
}

function roundUsd(value: number): number {
  return Math.round(value * 10000) / 10000;
}

const scanCostStorage = new AsyncLocalStorage<ScanCostCollector>();

export function getScanCostCollector(): ScanCostCollector | undefined {
  return scanCostStorage.getStore();
}

export async function initScanCostFromSession(session: Session): Promise<void> {
  const collector = getScanCostCollector();
  if (!collector) return;

  collector.sport = session.sport;
  collector.userId = session.user_id;
  collector.videoDurationSec = session.video_duration;
  collector.inviteCode = session.invite_code ?? null;

  if (session.cloudinary_public_id) {
    try {
      const bytes = await getVideoResourceBytes(session.cloudinary_public_id);
      collector.setSourceVideoBytes(bytes);
    } catch {
      /* optional lookup */
    }
  } else if (isAbsolute(session.video_url)) {
    try {
      const info = await stat(session.video_url);
      collector.setSourceVideoBytes(info.size);
    } catch {
      /* local dev path missing */
    }
  }
}

export async function runWithScanCost(
  sessionId: string,
  pipeline: "real" | "demo",
  fn: () => Promise<void>
): Promise<void> {
  const collector = new ScanCostCollector(sessionId);
  collector.pipeline = pipeline;

  try {
    await scanCostStorage.run(collector, fn);
    collector.status = "complete";
  } catch (error) {
    collector.status = "failed";
    collector.errorMessage =
      error instanceof Error ? error.message : "Analysis failed";
    throw error;
  } finally {
    collector.durationMs = performance.now() - collector.startedAt;

    if (!collector.sport) {
      const session = await getSessionById(sessionId).catch(() => null);
      if (session) await initScanCostFromSession(session);
    }

    // Only count costs for scans that fully completed (session marked complete).
    // Partially uploaded / cancelled sessions should not be costed.
    if (collector.status !== "complete") return;
    const finalSession = await getSessionById(sessionId).catch(() => null);
    if (!finalSession || finalSession.status !== "complete") return;

    void flushScanCostToGoogleSheet(collector).catch((error) => {
      console.error("[scan-cost] Google Sheets flush failed:", error);
    });
    void persistScanCostToDb(collector).catch((error) => {
      console.error("[scan-cost] DB persist failed:", error);
    });
  }
}

async function persistScanCostToDb(collector: ScanCostCollector): Promise<void> {
  const { recordScanCost } = await import("@/lib/db/queries");
  const breakdown = collector.costBreakdown();
  await recordScanCost({
    sessionId: collector.sessionId,
    userId: collector.userId,
    sport: collector.sport || null,
    status: collector.status,
    pipeline: collector.pipeline,
    videoDurationSec: collector.videoDurationSec,
    durationSec: Math.round(collector.durationMs / 1000),
    geminiUsd: breakdown.geminiUsd,
    cloudinaryUsd: breakdown.cloudinaryUsd,
    computeUsd: breakdown.computeUsd,
    totalUsd: breakdown.totalUsd,
    inviteCode: collector.inviteCode,
  });
}

async function flushScanCostToGoogleSheet(
  collector: ScanCostCollector
): Promise<void> {
  const { scanTotalUsd, runningTotalUsd } =
    await appendScanCostRow(collector);
  console.log(
    JSON.stringify({
      event: "scan_cost_logged",
      sessionId: collector.sessionId,
      status: collector.status,
      scanTotalUsd,
      runningTotalUsd,
    })
  );
}
