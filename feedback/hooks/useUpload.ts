"use client";

import { useCallback, useRef, useState } from "react";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import { apiPath } from "@/lib/paths";
import { hapticStep } from "@/lib/haptics";
import { storeUserId, getStoredCrewToken } from "@/lib/storage/client";
import { validateUploadFile } from "@/lib/upload/validateUploadFile";
import type { AnalysisAllowance, SkillLevel, SportId } from "@/types";
import type { PaywallMode } from "@/components/shared/PaywallSheet";

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
  paywallMode: PaywallMode | null;
}

interface UploadApiResponse {
  sessionId?: string;
  userId?: string;
  error?: string;
  allowance?: AnalysisAllowance;
}

interface CloudinarySignResponse extends UploadApiResponse {
  mode: "cloudinary" | "direct";
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
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  error?: { message: string };
}

function startSimulatedProgress(
  onTick: (value: number) => void,
  start: number,
  cap: number,
  step = 1,
  intervalMs = 2000
): () => void {
  let current = start;
  onTick(current);
  const id = window.setInterval(() => {
    if (current < cap) {
      current += step;
      onTick(current);
    }
  }, intervalMs);
  return () => window.clearInterval(id);
}

function uploadToCloudinary(
  file: File,
  params: NonNullable<CloudinarySignResponse["cloudinary"]>,
  onProgress: (percent: number) => void,
  onXhrReady?: (xhr: XMLHttpRequest) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onXhrReady?.(xhr);
    let lastReported = 0;
    let heartbeat: number | null = null;

    const report = (percent: number) => {
      const clamped = Math.max(lastReported, Math.min(100, percent));
      if (clamped > lastReported) {
        lastReported = clamped;
        onProgress(clamped);
      }
    };

    const startHeartbeat = () => {
      if (heartbeat) return;
      heartbeat = window.setInterval(() => {
        if (lastReported < 88) {
          report(lastReported + 1);
        }
      }, 2000);
    };

    const stopHeartbeat = () => {
      if (heartbeat) {
        window.clearInterval(heartbeat);
        heartbeat = null;
      }
    };

    const timeoutMs = Math.min(
      30 * 60 * 1000,
      Math.max(5 * 60 * 1000, Math.round(file.size / 40_000))
    );
    const timeoutId = window.setTimeout(() => {
      stopHeartbeat();
      xhr.abort();
      reject(new Error("Upload timed out — check your connection and try again"));
    }, timeoutMs);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        report(Math.round((event.loaded / event.total) * 100));
        return;
      }
      if (event.loaded > 0) {
        report(Math.min(88, lastReported + 2));
      }
    });

    xhr.upload.addEventListener("loadstart", () => {
      report(Math.max(1, lastReported));
      startHeartbeat();
    });

    xhr.addEventListener("load", () => {
      stopHeartbeat();
      window.clearTimeout(timeoutId);
      try {
        const data = JSON.parse(xhr.responseText) as CloudinaryUploadResult;
        if (xhr.status >= 400 || data.error) {
          reject(
            new Error(
              data.error?.message ??
                `Cloudinary upload failed (${xhr.status})`
            )
          );
          return;
        }
        if (!data.secure_url || !data.public_id) {
          reject(new Error("Cloudinary upload returned incomplete data"));
          return;
        }
        report(100);
        resolve(data);
      } catch {
        reject(new Error("Cloudinary upload failed — invalid response"));
      }
    });

    xhr.addEventListener("error", () => {
      stopHeartbeat();
      window.clearTimeout(timeoutId);
      reject(new Error("Network error during upload — try Wi‑Fi or a shorter clip"));
    });

    xhr.addEventListener("timeout", () => {
      stopHeartbeat();
      window.clearTimeout(timeoutId);
      reject(new Error("Upload timed out — check your connection and try again"));
    });

    xhr.addEventListener("abort", () => {
      stopHeartbeat();
      window.clearTimeout(timeoutId);
      reject(new Error("Upload cancelled"));
    });

    xhr.open("POST", params.uploadUrl);
    xhr.timeout = timeoutMs;

    const formData = new FormData();
    // Omit filename — iOS Safari handles bare File blobs more reliably.
    formData.append("file", file);
    formData.append("api_key", params.apiKey);
    formData.append("timestamp", String(params.timestamp));
    formData.append("signature", params.signature);
    formData.append("folder", params.folder);
    formData.append("public_id", params.publicId);

    report(1);
    startHeartbeat();
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
    paywallMode: null,
  });

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const failUpload = useCallback(
    (message: string, allowance?: AnalysisAllowance) => {
      setState((s) => ({
        ...s,
        phase: "error",
        error: message,
        paywallMode: allowance?.isPro ? "topup" : allowance ? "pro" : null,
      }));
    },
    []
  );

  const validateFile = useCallback((file: File): string | null => {
    return validateUploadFile(file);
  }, []);

  const upload = useCallback(
    async (
      file: File,
      sport: SportId,
      level: SkillLevel,
      parentSessionId?: string | null
    ) => {
      const validationError = validateFile(file);
      if (validationError) {
        setState((s) => ({ ...s, phase: "error", error: validationError }));
        return null;
      }

      setState({
        phase: "uploading",
        progress: 8,
        message: "Preparing upload...",
        sessionId: null,
        userId: null,
        error: null,
        paywallMode: null,
      });

      const stopSignProgress = startSimulatedProgress(
        (value) => {
          setState((s) =>
            s.phase === "uploading" && s.progress < 15
              ? { ...s, progress: value, message: "Preparing upload..." }
              : s
          );
        },
        8,
        15,
        1,
        1500
      );

      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

        const storedUserId =
          typeof window !== "undefined"
            ? localStorage.getItem("feedback_anon_user_id")
            : null;

        const crewToken = getStoredCrewToken();
        const signResponse = await fetch(apiPath("/api/upload/sign"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(crewToken ? { "x-crew-token": crewToken } : {}),
          },
          signal,
          body: JSON.stringify({
            sport,
            level,
            userId: storedUserId,
            parentSessionId: parentSessionId ?? null,
          }),
        });

        stopSignProgress();

        const sign = await parseJsonResponse<CloudinarySignResponse>(signResponse);

        if (!signResponse.ok) {
          failUpload(sign.error ?? "Could not start upload", sign.allowance);
          return null;
        }

        if (sign.mode === "cloudinary" && sign.cloudinary && sign.sessionId) {
          setState((s) => ({
            ...s,
            progress: 16,
            message: "Uploading your video...",
          }));

          const cloudinaryResult = await uploadToCloudinary(
            file,
            sign.cloudinary,
            (percent) => {
              setState((s) => ({
                ...s,
                progress: 16 + Math.round(percent * 0.59),
                message:
                  percent >= 88
                    ? "Finishing upload..."
                    : "Uploading your video...",
              }));
            },
            (xhr) => {
              xhrRef.current = xhr;
              signal.addEventListener(
                "abort",
                () => {
                  try {
                    xhr.abort();
                  } catch {
                    /* ignore */
                  }
                },
                { once: true }
              );
            }
          );

          setState((s) => ({
            ...s,
            progress: 75,
            message: "Starting analysis...",
          }));
          hapticStep();

          const completeResponse = await fetch(apiPath("/api/upload"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(crewToken ? { "x-crew-token": crewToken } : {}),
            },
            signal,
            body: JSON.stringify({
              sessionId: sign.sessionId,
              userId: sign.userId,
              sport,
              level,
              videoUrl: cloudinaryResult.secure_url,
              cloudinaryPublicId: cloudinaryResult.public_id,
              videoDuration: cloudinaryResult.duration ?? 60,
              parentSessionId: parentSessionId ?? null,
            }),
          });

          const data = await parseJsonResponse<UploadApiResponse>(completeResponse);

          if (!completeResponse.ok) {
            failUpload(data.error ?? "Upload failed", data.allowance);
            return null;
          }

          if (data.userId) storeUserId(data.userId);

          if (!data.sessionId || !data.userId) {
            failUpload("Upload failed");
            return null;
          }

          setState({
            phase: "processing",
            progress: 30,
            message: "Extracting frames...",
            sessionId: data.sessionId,
            userId: data.userId,
            error: null,
            paywallMode: null,
          });
          hapticStep();

          return data.sessionId;
        }

        const formData = new FormData();
        formData.append("video", file, file.name || "training-video.mp4");
        formData.append("sport", sport);
        formData.append("level", level);
        if (storedUserId) formData.append("userId", storedUserId);
        if (parentSessionId) formData.append("parentSessionId", parentSessionId);

        const response = await fetch(apiPath("/api/upload"), {
          method: "POST",
          signal,
          body: formData,
        });

        const data = await parseJsonResponse<UploadApiResponse>(response);

        if (!response.ok) {
          failUpload(data.error ?? "Upload failed", data.allowance);
          return null;
        }

        if (data.userId) storeUserId(data.userId);

        if (!data.sessionId || !data.userId) {
          failUpload("Upload failed");
          return null;
        }

        setState({
          phase: "processing",
          progress: 30,
          message: "Upload complete — extracting frames from your video…",
          sessionId: data.sessionId,
          userId: data.userId,
          error: null,
          paywallMode: null,
        });
        hapticStep();

        return data.sessionId;
      } catch (error) {
        stopSignProgress();
        const message = error instanceof Error ? error.message : "Upload failed";
        if (message === "Upload cancelled") {
          setState({
            phase: "idle",
            progress: 0,
            message: "",
            sessionId: null,
            userId: null,
            error: null,
            paywallMode: null,
          });
          return null;
        }
        failUpload(message);
        return null;
      } finally {
        xhrRef.current = null;
        abortRef.current = null;
      }
    },
    [validateFile, failUpload]
  );

  const cancel = useCallback(() => {
    // During upload: abort the network request
    if (state.phase === "uploading") {
      abortRef.current?.abort();
      try {
        xhrRef.current?.abort();
      } catch {
        /* ignore */
      }
      xhrRef.current = null;
      abortRef.current = null;
    }
    // During analysis: analysis continues on server but dismiss the progress UI
    setState({
      phase: "idle",
      progress: 0,
      message: "",
      sessionId: null,
      userId: null,
      error: null,
      paywallMode: null,
    });
  }, [state.phase]);

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
      paywallMode: null,
    });
  }, []);

  return { ...state, upload, cancel, updateProgress, markComplete, reset };
}
