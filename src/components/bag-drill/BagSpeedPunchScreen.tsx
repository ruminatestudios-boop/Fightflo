"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BagScreenWrapper } from "@/components/bag-drill/BagScreenWrapper";
import { MicListenPanel } from "@/components/bag-drill/MicListenPanel";
import { chipClass } from "@/components/bag-drill/bag-ui";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { hasLiveMicrophone } from "@/lib/bag-drill/media-capture";
import { strikeLabel } from "@/lib/bag-drill/strike-speed";
import { SPEED_PUNCH_IDS, type SpeedPunchId } from "@/lib/bag-drill/types";

interface BagSpeedPunchScreenProps {
  mediaStream?: MediaStream | null;
  micThreshold?: number;
  onBack: () => void;
  onHome?: () => void;
  onStart: (punchId: SpeedPunchId) => void;
}

export function BagSpeedPunchScreen({
  mediaStream = null,
  micThreshold,
  onBack,
  onHome,
  onStart,
}: BagSpeedPunchScreenProps) {
  const copy = BAG_COPY.speedPick;
  const [selected, setSelected] = useState<SpeedPunchId>("jab");
  const [testHits, setTestHits] = useState(0);
  const micLive = hasLiveMicrophone(mediaStream);
  const micConfirmed = testHits >= 1 || micThreshold != null;

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

        <div className="mt-6">
          <MicListenPanel
            stream={mediaStream}
            hitsRequired={micLive ? 1 : 0}
            hitsDetected={testHits}
            peakThreshold={micThreshold ?? 0.18}
            onPeak={() => setTestHits((n) => n + 1)}
          />
        </div>

        {!micLive && (
          <p className="mt-3 text-xs leading-relaxed text-amber-200/80">
            {copy.micBlockedHint}
          </p>
        )}

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
          disabled={micLive && !micConfirmed}
          className="font-display mt-10 flex h-14 w-full items-center justify-center rounded-xl bg-[#fa4141] text-[13px] tracking-[0.14em] text-white disabled:opacity-40"
        >
          {!micLive ? copy.ctaWithoutMic : micConfirmed ? copy.cta : copy.ctaNeedTest}
        </button>
      </motion.div>
    </BagScreenWrapper>
  );
}
