import { v2 as cloudinary } from "cloudinary";
import { getScanCostCollector } from "@/lib/telemetry/scanCost";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  duration: number;
  bytes: number;
}

export async function uploadVideo(
  fileBuffer: Buffer,
  sessionId: string
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: `feedback/sessions/${sessionId}`,
        public_id: `session_${sessionId}`,
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          duration: result.duration ?? 0,
          bytes: result.bytes ?? 0,
        });
      }
    );
    stream.end(fileBuffer);
  });
}

export async function uploadClip(
  filePath: string,
  sessionId: string,
  label: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "video",
    folder: `feedback/clips/${sessionId}`,
    public_id: `${sessionId}_${label}`,
    overwrite: true,
  });
  const bytes = result.bytes ?? 0;
  if (bytes > 0) getScanCostCollector()?.addClipBytes(bytes);
  return result.secure_url;
}

export async function uploadExportVideo(
  fileBuffer: Buffer,
  sessionId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: `feedback/exports/${sessionId}`,
        public_id: `export_${sessionId}`,
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary export upload failed"));
          return;
        }
        const bytes = result.bytes ?? fileBuffer.length;
        if (bytes > 0) getScanCostCollector()?.setExportBytes(bytes);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
}

export async function getVideoResourceBytes(publicId: string): Promise<number> {
  const result = await cloudinary.api.resource(publicId, {
    resource_type: "video",
  });
  return result.bytes ?? 0;
}

export async function deleteVideo(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
}

export function getSignedUploadParams(sessionId: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `feedback/sessions/${sessionId}`;
  const publicId = `session_${sessionId}`;

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      public_id: publicId,
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
    publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
  };
}
