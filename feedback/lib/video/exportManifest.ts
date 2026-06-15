import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { join } from "path";

const EXPORT_DIR = join(process.cwd(), ".local-data", "exports");

/** Bump when export burn logic changes — invalidates stale watermark-only caches */
const EXPORT_CACHE_VERSION = 5;

export interface ExportManifestRecord {
  url: string;
  version: number;
  has_skeleton: boolean;
  updated_at: string;
}

function manifestPath(sessionId: string): string {
  return join(EXPORT_DIR, `${sessionId}.json`);
}

export function localExportFilePath(sessionId: string): string {
  return join(EXPORT_DIR, `${sessionId}.mp4`);
}

export async function readExportManifest(
  sessionId: string
): Promise<ExportManifestRecord | null> {
  try {
    const raw = await readFile(manifestPath(sessionId), "utf8");
    const parsed = JSON.parse(raw) as Partial<ExportManifestRecord>;
    if (parsed.version !== EXPORT_CACHE_VERSION) return null;
    if (!parsed.has_skeleton || !parsed.url) return null;
    return {
      url: parsed.url,
      version: EXPORT_CACHE_VERSION,
      has_skeleton: true,
      updated_at: parsed.updated_at ?? "",
    };
  } catch {
    return null;
  }
}

export function exportCacheVersion(): number {
  return EXPORT_CACHE_VERSION;
}

export async function writeExportManifest(
  sessionId: string,
  url: string,
  options?: { hasSkeleton?: boolean }
): Promise<void> {
  await mkdir(EXPORT_DIR, { recursive: true });
  await writeFile(
    manifestPath(sessionId),
    JSON.stringify({
      url,
      version: EXPORT_CACHE_VERSION,
      has_skeleton: options?.hasSkeleton ?? true,
      updated_at: new Date().toISOString(),
    } satisfies ExportManifestRecord),
    "utf8"
  );
}

export async function clearExportManifest(sessionId: string): Promise<void> {
  try {
    await writeFile(manifestPath(sessionId), "");
  } catch {
    /* ignore */
  }
}

export async function localExportExists(sessionId: string): Promise<boolean> {
  try {
    await stat(localExportFilePath(sessionId));
    return true;
  } catch {
    return false;
  }
}
