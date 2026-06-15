import type { Report } from "@/types";
import {
  exportCacheVersion,
  readExportManifest,
} from "@/lib/video/exportManifest";

function isVerifiedExportUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return true;
  return url.includes("/exports/") || url.includes("export_");
}

function isVerifiedSkeletonExport(report: Report | null | undefined): boolean {
  if (!report) return false;

  const summary = report.landmark_summary;
  if (summary?.export_has_skeleton !== true) return false;
  if (summary?.export_cache_version !== exportCacheVersion()) return false;

  if (report.export_video_url) {
    return isVerifiedExportUrl(report.export_video_url);
  }

  const fromSummary = summary.export_video_url;
  return (
    typeof fromSummary === "string" &&
    fromSummary.length > 0 &&
    isVerifiedExportUrl(fromSummary)
  );
}

export function getExportVideoUrl(report: Report | null | undefined): string | null {
  if (!isVerifiedSkeletonExport(report)) return null;
  if (report!.export_video_url) return report!.export_video_url;
  const fromSummary = report!.landmark_summary?.export_video_url;
  return typeof fromSummary === "string" && fromSummary.length > 0
    ? fromSummary
    : null;
}

export async function resolveExportVideoUrl(
  sessionId: string,
  report: Report | null | undefined
): Promise<string | null> {
  const manifest = await readExportManifest(sessionId);
  if (manifest?.url && isVerifiedExportUrl(manifest.url)) return manifest.url;
  return getExportVideoUrl(report);
}
