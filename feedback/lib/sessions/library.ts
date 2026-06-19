import { SPORTS } from "@/config/sports";
import { apiPath } from "@/lib/paths";
import type { Report, Session, SportId } from "@/types";

export interface SessionLibraryEntry extends Session {
  resolved_title: string;
  resolved_summary: string;
  resolved_thumbnail: string | null;
}

export function defaultSessionTitle(session: Session): string {
  const sportName = SPORTS[session.sport]?.name ?? session.sport;
  return `${sportName} · Session ${session.session_number}`;
}

export function defaultSessionSummary(
  session: Session,
  report?: Report | null
): string {
  if (report?.coach_summary?.trim()) {
    return truncateSummary(report.coach_summary);
  }
  if (report?.main_weakness?.title?.trim()) {
    return truncateSummary(report.main_weakness.title);
  }
  if (session.status === "processing" || session.status === "uploading") {
    return "Analysis in progress…";
  }
  if (session.status === "failed") {
    return "Analysis could not be completed.";
  }
  return `${capitalize(session.level)} ${SPORTS[session.sport]?.name ?? session.sport} training`;
}

export function truncateSummary(text: string, max = 96): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function cloudinaryVideoThumbnail(
  publicId: string,
  cloudName: string,
  opts?: { width?: number; height?: number; offset?: number }
): string {
  const w = opts?.width ?? 160;
  const h = opts?.height ?? 160;
  const offset = opts?.offset ?? 1;
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_${offset},w_${w},h_${h},c_fill,q_auto,f_jpg/${publicId}.jpg`;
}

export function resolveSessionThumbnail(
  session: Session & { cloudinary_public_id?: string | null },
  cloudName?: string | null
): string | null {
  if (session.thumbnail_url?.startsWith("preset:")) {
    return null;
  }

  if (session.thumbnail_url?.startsWith("data:") || session.thumbnail_url?.startsWith("http")) {
    return session.thumbnail_url;
  }

  if (session.cloudinary_public_id && cloudName) {
    return cloudinaryVideoThumbnail(session.cloudinary_public_id, cloudName);
  }

  if (session.video_url.startsWith("http://") || session.video_url.startsWith("https://")) {
    return null;
  }

  return apiPath(`/api/video/thumbnail?sessionId=${session.id}`);
}

export function toSessionLibraryEntry(
  session: Session & { cloudinary_public_id?: string | null },
  report: Report | null,
  cloudName?: string | null
): SessionLibraryEntry {
  // If a report exists the analysis succeeded — don't show failed regardless of DB status
  const status = session.status === "failed" && report ? "complete" : session.status;
  return {
    ...session,
    status,
    resolved_title: session.display_name?.trim() || defaultSessionTitle(session),
    resolved_summary: session.summary?.trim() || defaultSessionSummary(session, report),
    resolved_thumbnail: resolveSessionThumbnail(session, cloudName),
  };
}

export const THUMBNAIL_PRESETS: { id: string; label: string; emoji: string; sport?: SportId }[] = [
  { id: "preset:glove", label: "Boxing", emoji: "🥊", sport: "boxing" },
  { id: "preset:thai", label: "Muay Thai", emoji: "🇹🇭", sport: "muaythai" },
  { id: "preset:mma", label: "MMA", emoji: "🥋", sport: "mma" },
  { id: "preset:fire", label: "Intensity", emoji: "🔥" },
  { id: "preset:target", label: "Focus", emoji: "🎯" },
  { id: "preset:chart", label: "Progress", emoji: "📈" },
];

export function presetThumbnailValue(presetId: string): string {
  return presetId;
}

export function isPresetThumbnail(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith("preset:"));
}

export function presetEmoji(value: string | null | undefined): string | null {
  if (!value?.startsWith("preset:")) return null;
  return THUMBNAIL_PRESETS.find((p) => p.id === value)?.emoji ?? "🎬";
}
