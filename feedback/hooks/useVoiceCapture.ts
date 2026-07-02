"use client";

import { useCallback, useRef, useState } from "react";

export type CaptureStep = "idle" | "recording" | "confirm";

interface SpeechRecognitionResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useVoiceCapture() {
  const [step, setStep] = useState<CaptureStep>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startRecording = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setError("Voice input isn't supported in this browser.");
      setStep("confirm");
      return;
    }

    setError(null);
    setTranscript("");

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setStep("recording");

    recognition.onresult = (event: SpeechRecognitionResultLike) => {
      const text = event.results[event.results.length - 1][0].transcript;
      setTranscript(text);
    };

    recognition.onerror = () => {
      setError("Microphone error. Try again.");
      setStep("confirm");
    };

    recognition.onend = () => {
      setStep((current) => (current === "recording" ? "confirm" : current));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setTranscript("");
    setError(null);
  }, []);

  return { step, transcript, setTranscript, error, startRecording, stopRecording, reset };
}
