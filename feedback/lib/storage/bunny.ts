/**
 * Bunny Stream storage adapter — built ahead of time, NOT wired into the
 * active pipeline yet. Cloudinary (lib/storage/cloudinary.ts) remains the
 * live provider. This file mirrors its exact function signatures so the
 * switch later is a matter of changing imports, not rewriting call sites.
 *
 * ---- One-time setup required before this can be turned on ----
 * 1. Create a Bunny Stream "Video Library" in the Bunny dashboard.
 * 2. Under that library's encoding settings, enable "MP4 Fallback" —
 *    without this, uploaded videos never get a direct .mp4 URL, only
 *    HLS adaptive streams, which the current <video> playback and the
 *    accuracy tracker's <video src=...> tag both expect.
 * 3. Note the Library ID and the library's API key (different from any
 *    account-level API key).
 * 4. Set up a Pull Zone for the library (Bunny does this automatically
 *    when you create a Stream library) and note its hostname, e.g.
 *    "vz-xxxxx.b-cdn.net".
 * 5. Add these env vars:
 *      BUNNY_STREAM_LIBRARY_ID=
 *      BUNNY_STREAM_API_KEY=
 *      BUNNY_STREAM_PULL_ZONE_HOSTNAME=        e.g. vz-xxxxx.b-cdn.net
 *
 * ---- Key behavioral difference from Cloudinary ----
 * Cloudinary's secure_url is available the instant upload finishes.
 * Bunny encodes asynchronously — a freshly uploaded video has no
 * playable URL until encoding completes (seconds to a couple of
 * minutes depending on length). waitForEncoding() below polls the
 * video status for this. Any call site doing uploadVideo() and
 * immediately expecting a working url back needs to await that too.
 */

const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const API_KEY = process.env.BUNNY_STREAM_API_KEY;
const PULL_ZONE_HOSTNAME = process.env.BUNNY_STREAM_PULL_ZONE_HOSTNAME;

const API_BASE = "https://video.bunnycdn.com";

function requireConfig() {
  if (!LIBRARY_ID || !API_KEY || !PULL_ZONE_HOSTNAME) {
    throw new Error(
      "Bunny Stream not configured — set BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY, BUNNY_STREAM_PULL_ZONE_HOSTNAME"
    );
  }
}

function authHeaders() {
  return {
    AccessKey: API_KEY!,
    Accept: "application/json",
  };
}

export interface BunnyUploadResult {
  url: string;
  publicId: string; // Bunny video GUID
  duration: number;
  bytes: number;
}

interface BunnyVideoObject {
  guid: string;
  title: string;
  length?: number; // seconds
  storageSize?: number; // bytes
  status?: number; // 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
}

async function createVideoObject(title: string): Promise<BunnyVideoObject> {
  requireConfig();
  const res = await fetch(`${API_BASE}/library/${LIBRARY_ID}/videos`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`Bunny create-video failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function uploadBufferToVideo(videoId: string, buffer: Buffer): Promise<void> {
  requireConfig();
  const res = await fetch(`${API_BASE}/library/${LIBRARY_ID}/videos/${videoId}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/octet-stream" },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    throw new Error(`Bunny video upload failed (${res.status}): ${await res.text()}`);
  }
}

/** Polls until encoding finishes (status 4) so the mp4 URL is actually playable. */
export async function waitForEncoding(
  videoId: string,
  timeoutMs = 5 * 60 * 1000,
  pollIntervalMs = 3000
): Promise<BunnyVideoObject> {
  requireConfig();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${API_BASE}/library/${LIBRARY_ID}/videos/${videoId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Bunny status check failed (${res.status})`);
    const video: BunnyVideoObject = await res.json();
    if (video.status === 4) return video;
    if (video.status === 5) throw new Error("Bunny video encoding failed");
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error("Bunny video encoding timed out");
}

function mp4Url(videoId: string, resolution: 720 | 480 | 360 = 720): string {
  return `https://${PULL_ZONE_HOSTNAME}/${videoId}/play_${resolution}p.mp4`;
}

/** Mirrors cloudinary.ts uploadVideo() — server-side upload of the raw session video. */
export async function uploadVideo(
  fileBuffer: Buffer,
  sessionId: string
): Promise<BunnyUploadResult> {
  const video = await createVideoObject(`session_${sessionId}`);
  await uploadBufferToVideo(video.guid, fileBuffer);
  const finished = await waitForEncoding(video.guid);
  return {
    url: mp4Url(video.guid),
    publicId: video.guid,
    duration: finished.length ?? 0,
    bytes: finished.storageSize ?? fileBuffer.length,
  };
}

/** Mirrors cloudinary.ts uploadClip() — uploads an already ffmpeg-rendered clip file. */
export async function uploadClip(
  filePath: string,
  sessionId: string,
  label: string
): Promise<string> {
  const { readFile } = await import("fs/promises");
  const buffer = await readFile(filePath);
  const video = await createVideoObject(`${sessionId}_${label}`);
  await uploadBufferToVideo(video.guid, buffer);
  await waitForEncoding(video.guid);
  return mp4Url(video.guid);
}

/** Mirrors cloudinary.ts uploadExportVideo() — uploads the skeleton-overlay export. */
export async function uploadExportVideo(
  fileBuffer: Buffer,
  sessionId: string
): Promise<string> {
  const video = await createVideoObject(`export_${sessionId}`);
  await uploadBufferToVideo(video.guid, fileBuffer);
  await waitForEncoding(video.guid);
  return mp4Url(video.guid);
}

/** Mirrors cloudinary.ts getVideoResourceBytes() */
export async function getVideoResourceBytes(videoId: string): Promise<number> {
  requireConfig();
  const res = await fetch(`${API_BASE}/library/${LIBRARY_ID}/videos/${videoId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Bunny resource lookup failed (${res.status})`);
  const video: BunnyVideoObject = await res.json();
  return video.storageSize ?? 0;
}

/** Mirrors cloudinary.ts deleteVideo() */
export async function deleteVideo(videoId: string): Promise<void> {
  requireConfig();
  await fetch(`${API_BASE}/library/${LIBRARY_ID}/videos/${videoId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

/**
 * Mirrors cloudinary.ts getSignedUploadParams() — but the shape is different
 * because Bunny's secure direct-upload flow is TUS-based, not a single
 * signed multipart POST. The caller must:
 *   1. POST to /library/{libraryId}/videos server-side first (createVideoObject)
 *      to get a videoId — this step needs the server-only API key, so it
 *      CANNOT happen client-side the way Cloudinary's signature does.
 *   2. Hand the client this signed payload to resume/upload via a TUS
 *      client library (e.g. tus-js-client) against the TUS endpoint.
 *
 * This means the upload flow in useUpload.ts changes shape: instead of one
 * client-side signed POST, it becomes "ask our server for a videoId +
 * signature, then TUS-upload to Bunny" — two round trips instead of one.
 */
export async function getSignedUploadParams(sessionId: string) {
  requireConfig();
  const video = await createVideoObject(`session_${sessionId}`);
  const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour

  const crypto = await import("crypto");
  const signature = crypto
    .createHash("sha256")
    .update(`${LIBRARY_ID}${API_KEY}${expirationTime}${video.guid}`)
    .digest("hex");

  return {
    tusEndpoint: "https://video.bunnycdn.com/tusupload",
    videoId: video.guid,
    libraryId: LIBRARY_ID!,
    authorizationSignature: signature,
    authorizationExpire: expirationTime,
    // Final playback URL — only valid once encoding finishes (see waitForEncoding).
    expectedUrl: mp4Url(video.guid),
  };
}
