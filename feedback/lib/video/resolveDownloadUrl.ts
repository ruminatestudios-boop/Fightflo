import type { Session } from "@/types";

/** Cloudinary URL that triggers a browser download instead of inline playback */
export function cloudinaryAttachmentUrl(
  videoUrl: string,
  filename: string
): string | null {
  if (!videoUrl.includes("res.cloudinary.com")) return null;
  const marker = "/video/upload/";
  const index = videoUrl.indexOf(marker);
  if (index === -1) return null;

  const prefix = videoUrl.slice(0, index + marker.length);
  const suffix = videoUrl.slice(index + marker.length);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}fl_attachment:${encodeURIComponent(safeName)}/${suffix}`;
}

/** Instant download target — original upload, no server re-encode */
export function resolveInstantDownloadTarget(
  session: Pick<Session, "id" | "video_url">,
  filename: string
): { type: "redirect"; url: string } | { type: "local"; path: string } {
  const attached = cloudinaryAttachmentUrl(session.video_url, filename);
  if (attached) {
    return { type: "redirect", url: attached };
  }

  if (
    session.video_url.startsWith("http://") ||
    session.video_url.startsWith("https://")
  ) {
    return { type: "redirect", url: session.video_url };
  }

  return { type: "local", path: session.video_url };
}
