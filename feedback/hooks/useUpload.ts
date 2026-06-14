"use client";

import { useCallback, useState } from "react";
import { UPLOAD_CONFIG } from "@/config/prompts";
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
        const formData = new FormData();
        formData.append("video", file);
        formData.append("sport", sport);
        formData.append("level", level);

        const storedUserId =
          typeof window !== "undefined"
            ? localStorage.getItem("feedback_anon_user_id")
            : null;
        if (storedUserId) formData.append("userId", storedUserId);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

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

        return data.sessionId as string;
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
