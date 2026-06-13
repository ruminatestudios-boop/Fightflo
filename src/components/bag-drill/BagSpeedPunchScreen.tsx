"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BagScreenWrapper } from "@/components/bag-drill/BagScreenWrapper";
import { chipClass } from "@/components/bag-drill/bag-ui";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { strikeLabel } from "@/lib/bag-drill/strike-speed";
import { SPEED_PUNCH_IDS, type SpeedPunchId } from "@/lib/bag-drill/types";

interface BagSpeedPunchScreenProps {
  onBack: () => void;
  onHome?: () => void;
  onStart: (punchId: SpeedPunchId) => void;
}

export function BagSpeedPunchScreen({ onBack, onHome, onStart }: BagSpeedPunchScreenProps) {
  const copy = BAG_COPY.speedPick;
  const [selected, setSelected] = useState<SpeedPunchId>("jab");

  return (
    <BagScreenWrapper onBack={onBack} onHome={onHome} className="overflow-y-auto pb-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col"
      >
        <p className="label text-[#fa4141]">Punch speed</p>
        <h1 className="font-display mt-2 text-2xl tracking-wide text-white">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#737373]">{copy.subtitle}</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {SPEED_PUNCH_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`rounded-xl border px-4 py-5 text-center transition-colors ${chipClass(selected === id)}`}
            >
              <span className="font-display text-lg">{strikeLabel(id)}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onStart(selected)}
          className="font-display mt-10 flex h-14 w-full items-center justify-center rounded-full bg-[#fa4141] text-[13px] tracking-[0.14em] text-white"
        >
          {copy.cta}
        </button>
      </motion.div>
    </BagScreenWrapper>
  );
}
