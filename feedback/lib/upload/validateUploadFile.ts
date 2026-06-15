import { UPLOAD_CONFIG } from "@/config/prompts";

const MIME_TO_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/3gpp": ".3gp",
  "video/3gpp2": ".3g2",
  "video/hevc": ".mov",
  "video/x-m4v": ".m4v",
};

function extensionFromName(name: string): string | null {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed.includes(".")) return null;
  const ext = `.${trimmed.split(".").pop()}`;
  return UPLOAD_CONFIG.acceptedExtensions.includes(ext) ? ext : null;
}

/** iOS Safari often omits MIME type or uses application/octet-stream for camera-roll videos. */
export function isAcceptableUploadFile(file: File): boolean {
  if (!file || file.size <= 0) return false;
  if (file.size > UPLOAD_CONFIG.maxSizeBytes) return false;

  const mime = file.type.trim().toLowerCase();
  if (mime.startsWith("video/")) return true;
  if (UPLOAD_CONFIG.acceptedMimeTypes.includes(mime)) return true;
  if (mime && MIME_TO_EXT[mime]) return true;

  const fromName = extensionFromName(file.name);
  if (fromName) return true;

  if (
    mime === "application/octet-stream" ||
    mime === "" ||
    !file.name.trim()
  ) {
    // Last resort: picker gave a blob with no metadata — allow if it looks like a real clip.
    return file.size >= 64 * 1024;
  }

  return false;
}

export function validateUploadFile(file: File): string | null {
  if (!file || file.size <= 0) {
    return "Could not read that video. Try another clip from your camera roll.";
  }
  if (file.size > UPLOAD_CONFIG.maxSizeBytes) {
    return "Video must be under 500MB";
  }
  if (!isAcceptableUploadFile(file)) {
    return "Accepted formats: MP4, MOV, M4V, AVI";
  }
  return null;
}
