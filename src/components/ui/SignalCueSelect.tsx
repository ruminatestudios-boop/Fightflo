"use client";

import { SIGNAL_CUE_MODES } from "@/lib/constants";
import type { SignalCueMode } from "@/lib/types";

interface SignalCueSelectProps {
  value: SignalCueMode;
  onChange: (mode: SignalCueMode) => void;
}

export function SignalCueSelect({ value, onChange }: SignalCueSelectProps) {
  return (
    <div className="space-y-2">
      {SIGNAL_CUE_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
            value === mode.id
              ? "nike-card-selected"
              : "nike-card hover:border-white/[0.12]"
          }`}
        >
          <div>
            <p className="font-display text-lg text-white">{mode.label}</p>
            <p className="mt-1 text-sm text-[#737373]">{mode.subtitle}</p>
          </div>
          <div
            className={`h-5 w-5 rounded-full border-2 ${
              value === mode.id ? "border-[#fa4141] bg-[#fa4141]" : "border-[#404040]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
