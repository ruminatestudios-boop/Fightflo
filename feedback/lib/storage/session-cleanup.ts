import { rm } from "fs/promises";
import { join } from "path";
import { deleteVideo } from "@/lib/storage/cloudinary";
import type { Session } from "@/types";

export async function cleanupSessionAssets(session: Session): Promise<void> {
  if (session.cloudinary_public_id) {
    try {
      await deleteVideo(session.cloudinary_public_id);
    } catch {
      /* best effort */
    }
  }

  const localDir = join(process.cwd(), ".local-data", "videos", session.id);
  try {
    await rm(localDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}
