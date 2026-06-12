"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FIGHT_STYLES } from "@/lib/constants";
import { combosForStyle, techniquesForStyle } from "@/lib/style-discipline";
import type { FightStyle, WorkoutMode } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface StyleSelectProps {
  selected: FightStyle;
  workoutMode: WorkoutMode;
  onSelect: (style: FightStyle) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StyleSelect({
  selected,
  workoutMode,
  onSelect,
  onNext,
  onBack,
}: StyleSelectProps) {
  const isCombos = workoutMode === "combos";
  const previewItems = isCombos
    ? combosForStyle(selected).map((c) => ({ label: c.label, detail: c.speak }))
    : techniquesForStyle(selected).map((t) => ({ label: t, detail: null }));

  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader eyebrow="Select style" title="Your discipline" />

      <div className="mt-10 flex-1 space-y-2">
        {FIGHT_STYLES.map((style, i) => (
          <GlassCard
            key={style.id}
            index={i}
            selected={selected === style.id}
            onClick={() => onSelect(style.id)}
          >
            <p className="font-display text-xl text-white">{style.label}</p>
            <p className="mt-1 text-sm text-[#737373]">{style.subtitle}</p>
          </GlassCard>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${selected}-${workoutMode}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-4"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#fa4141]">
            {FIGHT_STYLES.find((s) => s.id === selected)?.label}
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {isCombos ? "Your combo calls" : "Your techniques"}
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            {isCombos
              ? "Only these combinations will be called in this session."
              : "React cues tailored to this discipline."}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {previewItems.map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.detail && (
                  <p className="mt-0.5 text-xs text-[#737373]">{item.detail}</p>
                )}
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 pb-2">
        <Button onClick={onNext}>Continue</Button>
      </div>
    </ScreenWrapper>
  );
}
