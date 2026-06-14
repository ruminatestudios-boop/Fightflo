"use client";

import { useCallback, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { UPLOAD_CONFIG } from "@/config/prompts";

export interface UploadZoneHandle {
  open: () => void;
}

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  /** Hidden file input only — no drop zone UI */
  hidden?: boolean;
}

export const UploadZone = forwardRef<UploadZoneHandle, UploadZoneProps>(
  function UploadZone({ onFileSelect, disabled = false, hidden = false }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleFile = useCallback(
      (file: File) => onFileSelect(file),
      [onFileSelect]
    );

    useImperativeHandle(ref, () => ({
      open: () => inputRef.current?.click(),
    }));

    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_CONFIG.acceptedMimeTypes.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {hidden ? null : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 bg-white p-6 text-black shadow-md transition-all active:scale-[0.98] ${
            dragging ? "border-black shadow-lg" : "border-transparent hover:shadow-lg"
          } ${disabled ? "pointer-events-none opacity-40" : ""}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Session
            </span>
            <svg
              className="h-4 w-4 text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <p className="mt-6 font-display text-base font-semibold leading-snug text-neutral-900">
            Drop your training video
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            MP4, MOV, AVI · Max 500MB
          </p>
        </div>
        )}
      </>
    );
  }
);
