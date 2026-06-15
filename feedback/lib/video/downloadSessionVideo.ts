import { apiPath } from "@/lib/paths";

export class DownloadSessionVideoError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "DownloadSessionVideoError";
    this.code = code;
  }
}

function triggerBrowserDownload(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.style.display = "none";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Download overlay video — uses native browser download (handles long exports). */
export async function downloadSessionVideo(
  sessionId: string,
  userId: string,
  onProgress?: (message: string) => void
): Promise<void> {
  const params = new URLSearchParams({
    sessionId,
    userId,
  });

  onProgress?.("Checking export…");

  const statusRes = await fetch(
    apiPath(`/api/video/download/status?${params.toString()}`)
  );

  if (statusRes.status === 402) {
    throw new DownloadSessionVideoError("Pro plan required", "PRO_REQUIRED");
  }

  if (!statusRes.ok) {
    const body = (await statusRes.json().catch(() => ({}))) as { error?: string };
    throw new DownloadSessionVideoError(
      body.error ?? "Could not check download status"
    );
  }

  const status = (await statusRes.json()) as { ready?: boolean };
  const downloadUrl = apiPath(
    `/api/video/download?${params.toString()}${status.ready ? "" : "&rebuild=1"}`
  );

  if (!status.ready) {
    onProgress?.(
      "Building overlay video — your browser will download when ready (1–2 min)…"
    );
  } else {
    onProgress?.("Starting download…");
  }

  triggerBrowserDownload(downloadUrl);
}
