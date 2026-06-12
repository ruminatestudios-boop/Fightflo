"use client";

import { motion } from "framer-motion";
import { FIGHT_STYLES } from "@/lib/constants";
import { CORE_ROUND_LENGTHS } from "@/lib/core-loop-presets";
import type { FightStyle } from "@/lib/types";
import { AppTopBar } from "@/components/ui/AppTopBar";

interface CoreHomeScreenProps {
  style: FightStyle;
  roundLengthSeconds: number;
  onStyleChange: (style: FightStyle) => void;
  onRoundLengthChange: (seconds: number) => void;
  onStart: () => void;
  onCustomize: () => void;
}

export function CoreHomeScreen({
  style,
  roundLengthSeconds,
  onStyleChange,
  onRoundLengthChange,
  onStart,
  onCustomize,
}: CoreHomeScreenProps) {
  return (
    <div className="app-shell relative flex min-h-dvh flex-col bg-black px-5 pb-10 pt-10">
      <AppTopBar className="mb-8" />

      <div className="flex flex-1 flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="label text-[#525252]">Shadowboxing</p>
          <h1 className="font-display mt-2 text-[2.25rem] leading-tight tracking-wide text-white">
            Pick your round
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="mt-10"
        >
          <p className="label mb-3 text-[#525252]">Style</p>
          <div className="grid grid-cols-2 gap-2">
            {FIGHT_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onStyleChange(s.id)}
                className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                  style === s.id
                    ? "border-[#fa4141]/50 bg-[#fa4141]/10"
                    : "border-white/[0.08] hover:border-white/[0.15]"
                }`}
              >
                <span className="font-display text-sm tracking-wide text-white">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mt-8"
        >
          <p className="label mb-3 text-[#525252]">Round length</p>
          <div className="flex gap-2">
            {CORE_ROUND_LENGTHS.map((opt) => (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => onRoundLengthChange(opt.seconds)}
                className={`flex-1 rounded-xl border py-3 text-center transition-colors ${
                  roundLengthSeconds === opt.seconds
                    ? "border-[#fa4141]/50 bg-[#fa4141]/10 text-white"
                    : "border-white/[0.08] text-[#737373] hover:border-white/[0.15]"
                }`}
              >
                <span className="font-display text-lg">{opt.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          onClick={onStart}
          className="font-display mt-12 flex h-16 w-full items-center justify-center rounded-full bg-[#fa4141] text-[15px] tracking-[0.2em] text-white transition-transform active:scale-[0.98]"
        >
          Start
        </motion.button>

        <button
          type="button"
          onClick={onCustomize}
          className="mt-5 w-full py-2 text-center text-xs text-[#525252] transition-colors hover:text-[#a3a3a3]"
        >
          Customize
        </button>
      </div>
    </div>
  );
}
