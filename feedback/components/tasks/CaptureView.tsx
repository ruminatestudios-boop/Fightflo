"use client";

import { useEffect } from "react";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { RecordButton } from "./RecordButton";
import { TransportButton } from "./TransportButton";
import { CheckIcon, XIcon } from "./icons";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";

export function CaptureView({
  onAdd,
  onClose,
}: {
  onAdd: (title: string) => void;
  onClose: () => void;
}) {
  const { step, transcript, setTranscript, error, startRecording, stopRecording, reset } =
    useVoiceCapture();

  useEffect(() => {
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    stopRecording();
    reset();
    onClose();
  }

  function handleConfirm() {
    const title = transcript.trim();
    if (title) onAdd(title);
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--background)]/95 backdrop-blur flex flex-col items-center justify-center gap-8 px-6">
      <WaveformVisualizer active={step === "recording"} />

      {error ? (
        <p className="text-[var(--accent-red)] text-sm text-center px-8">{error}</p>
      ) : step === "confirm" ? (
        <input
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          autoFocus
          className="w-full max-w-sm h-12 rounded-full bg-[var(--surface-pill)] border border-[var(--border)] px-4 text-center text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)]"
        />
      ) : (
        <p className="text-[var(--muted)] text-sm text-center px-8">{transcript || "Listening…"}</p>
      )}

      <div className="flex items-center gap-6">
        <TransportButton onClick={handleClose} aria-label="Cancel">
          <XIcon className="h-5 w-5" />
        </TransportButton>

        {step === "recording" ? (
          <RecordButton recording onClick={stopRecording} />
        ) : (
          <TransportButton
            variant="active"
            size="lg"
            onClick={handleConfirm}
            aria-label="Add task"
            disabled={!transcript.trim()}
          >
            <CheckIcon className="h-8 w-8" />
          </TransportButton>
        )}
      </div>
    </div>
  );
}
