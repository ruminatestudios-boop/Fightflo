import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { isCloudinaryConfigured } from "@/lib/config/env";
import {
  uploadVideo as cloudinaryUpload,
  type CloudinaryUploadResult,
} from "@/lib/storage/cloudinary";

export async function storeVideo(
  fileBuffer: Buffer,
  sessionId: string
): Promise<CloudinaryUploadResult> {
  if (isCloudinaryConfigured()) {
    return cloudinaryUpload(fileBuffer, sessionId);
  }

  const dir = join(process.cwd(), ".local-data", "videos", sessionId);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, "video.mp4");
  await writeFile(filePath, fileBuffer);

  return {
    url: filePath,
    publicId: "",
    duration: Math.max(60, Math.round(fileBuffer.length / 500_000)),
    bytes: fileBuffer.length,
  };
}
