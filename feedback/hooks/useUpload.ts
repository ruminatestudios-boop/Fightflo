"use client";

import { useCallback, useState } from "react";
import { UPLOAD_CONFIG } from "@/config/prompts";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import { storeUserId } from "@/lib/storage/client";
import type { SkillLevel, SportId } from "@/types";

export type UploadPhase =
  | "idle"
  | "uploading"
  | "processing"
  | "complete"
  | "error";

interface UploadState {
  phase: UploadPhase;
  progress: number;
  message: string;
  sessionId: string | null;
  userId: string | null;
  error: string | null;
}

interface CloudinarySignResponse {
  mode: "cloudinary" | "direct";
  sessionId?: string;
  userId: string;
  cloudinary?: {
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
    publicId: string;
    uploadUrl: string;
  };
  error?: string;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  error?: { message: string };
}

function uploadToCloudinary(
  file: File,
  params: NonNullable<CloudinarySignResponse["cloudinary"]>,
  onProgress: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText) as CloudinaryUploadResult;
        if (xhr.status >= 400 || data.error) {
          reject(new Error(data.error?.message ?? "Cloudinary upload failed"));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error("Cloudinary upload failed"));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("POST", params.uploadUrl);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", params.apiKey);
    formData.append("timestamp", String(params.timestamp));
    formData.append("signature", params.signature);
    formData.append("folder", params.folder);
    formData.append("public_id", params.publicId);

    xhr.send(formData);
  });
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    phase: "idle",
    progress: 0,
    message: "",
    sessionId: null,
    userId: null,
    error: null,
  });

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > UPLOAD_CONFIG.maxSizeBytes) {
      return "Video must be under 500MB";
    }
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!UPLOAD_CONFIG.acceptedExtensions.includes(ext)) {
      return "Accepted formats: MP4, MOV, AVI";
    }
    return null;
  }, []);

  const upload = useCallback(
    async (file: File, sport: SportId, level: SkillLevel) => {
      const validationError = validateFile(file);
      if (validationError) {
        setState((s) => ({ ...s, phase: "error", error: validationError }));
        return null;
      }

      setState({
        phase: "uploading",
        progress: 10,
        message: "Uploading your video...",
        sessionId: null,
        userId: null,
        error: null,
      });

      try {
        const storedUserId =
          typeof window !== "undefined"
            ? localStorage.getItem("feedback_anon_user_id")
            : null;

        const signResponse = await fetch("/api/upload/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sport,
            level,
            userId: storedUserId,
          }),
        });

        const sign = await parseJsonResponse<CloudinarySignResponse>(signResponse);

        if (!signResponse.ok) {
          throw new Error(sign.error ?? "Could not start upload");
        }

        if (sign.mode === "cloudinary" && sign.cloudinary && sign.sessionId) {
          const cloudinaryResult = await uploadToCloudinary(
            file,
            sign.cloudinary,
            (percent) => {
              setState((s) => ({
                ...s,
                progress: 10 + Math.round(percent * 0.6),
                message: "Uploading your video...",
              }));
            }
          );

          setState((s) => ({
            ...s,
            progress: 75,
            message: "Starting analysis...",
          }));

          const completeResponse = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sign.sessionId,
              userId: sign.userId,
              sport,
              level,
              videoUrl: cloudinaryResult.secure_url,
              cloudinaryPublicId: cloudinaryResult.public_id,
              videoDuration: cloudinaryResult.duration ?? 60,
            }),
          });

          const data = await parseJsonResponse<{
            sessionId: string;
            userId: string;
            error?: string;
          }>(completeResponse);

          if (!completeResponse.ok) {
            throw new Error(data.error ?? "Upload failed");
          }

          if (data.userId) storeUserId(data.userId);

          setState({
            phase: "processing",
            progress: 30,
            message: "Extracting frames...",
            sessionId: data.sessionId,
            userId: data.userId,
            error: null,
          });

          return data.sessionId;
        }

        const formData = new FormData();
        formData.append("video", file);
        formData.append("sport", sport);
        formData.append("level", level);
        if (storedUserId) formData.append("userId", storedUserId);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await parseJsonResponse<{
          sessionId: string;
          userId: string;
          error?: string;
        }>(response);

        if (!response.ok) {
          throw new Error(data.error ?? "Upload failed");
        }

        if (data.userId) storeUserId(data.userId);

        setState({
          phase: "processing",
          progress: 30,
          message: "Extracting frames...",
          sessionId: data.sessionId,
          userId: data.userId,
          error: null,
        });

        return data.sessionId;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setState((s) => ({ ...s, phase: "error", error: message }));
        return null;
      }
    },
    [validateFile]
  );

  const updateProgress = useCallback((progress: number, message: string) => {
    setState((s) => ({ ...s, progress, message }));
  }, []);

  const markComplete = useCallback((sessionId: string) => {
    setState((s) => ({
      ...s,
      phase: "complete",
      progress: 100,
      message: "Your report is ready.",
      sessionId,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      phase: "idle",
      progress: 0,
      message: "",
      sessionId: null,
      userId: null,
      error: null,
    });
  }, []);

  return { ...state, upload, updateProgress, markComplete, reset };
}
