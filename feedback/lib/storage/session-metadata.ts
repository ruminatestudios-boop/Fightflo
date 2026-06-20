import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { isDevStoreActive } from "@/lib/db/devFallback";

export interface SessionMetadataRecord {
  display_name?: string | null;
  summary?: string | null;
  thumbnail_url?: string | null;
}

const META_DIR = join(process.cwd(), ".local-data", "session-metadata");

function metaPath(sessionId: string): string {
  return join(META_DIR, `${sessionId}.json`);
}

export async function readSessionMetadata(
  sessionId: string
): Promise<SessionMetadataRecord | null> {
  if (!isDevStoreActive()) return null;
  try {
    const raw = await readFile(metaPath(sessionId), "utf8");
    return JSON.parse(raw) as SessionMetadataRecord;
  } catch {
    return null;
  }
}

export async function writeSessionMetadata(
  sessionId: string,
  patch: SessionMetadataRecord
): Promise<SessionMetadataRecord> {
  // Production (Supabase configured) stores these columns directly on the
  // sessions table — local disk is only a fallback for the in-memory dev store,
  // and Vercel's filesystem is read-only outside /tmp so this must not run there.
  if (!isDevStoreActive()) return patch;

  await mkdir(META_DIR, { recursive: true });
  const existing = (await readSessionMetadata(sessionId)) ?? {};
  const merged: SessionMetadataRecord = { ...existing };

  if (patch.display_name !== undefined) merged.display_name = patch.display_name;
  if (patch.summary !== undefined) merged.summary = patch.summary;
  if (patch.thumbnail_url !== undefined) merged.thumbnail_url = patch.thumbnail_url;

  await writeFile(metaPath(sessionId), JSON.stringify(merged), "utf8");
  return merged;
}

export async function deleteSessionMetadata(sessionId: string): Promise<void> {
  if (!isDevStoreActive()) return;
  try {
    await rm(metaPath(sessionId), { force: true });
  } catch {
    /* ignore */
  }
}

export function mergeSessionMetadata<T extends SessionMetadataRecord>(
  session: T,
  meta: SessionMetadataRecord | null
): T {
  if (!meta) return session;
  return {
    ...session,
    display_name: meta.display_name ?? session.display_name ?? null,
    summary: meta.summary ?? session.summary ?? null,
    thumbnail_url: meta.thumbnail_url ?? session.thumbnail_url ?? null,
  };
}
