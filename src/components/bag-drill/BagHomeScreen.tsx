"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BagLastRound, BagQuickDrills } from "@/components/bag-drill/BagHomeActions";
import { BagScreenWrapper } from "@/components/bag-drill/BagScreenWrapper";
import { HeroCarousel, type HeroSlide } from "@/components/ui/HeroCarousel";
import type { BagDrillMode, FightFloBagData } from "@/lib/bag-drill/types";
import {
  getLastSession,
  hasMeaningfulSessionHistory,
} from "@/lib/bag-drill/storage";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { BAG_CAROUSEL_CLINCH, BAG_CAROUSEL_FIGHTER } from "@/lib/media";

export interface BagHomeStartOptions {
  weaknessFocus?: boolean;
}

interface BagHomeScreenProps {
  data: FightFloBagData;
  isPro?: boolean;
  freeSessionsLeft?: number | null;
  onStart: (mode: BagDrillMode, options?: BagHomeStartOptions) => void;
  onUpgrade?: () => void;
  onHome?: () => void;
}

export function BagHomeScreen({
  data,
  isPro: isProUser = false,
  freeSessionsLeft = null,
  onStart,
  onUpgrade,
  onHome,
}: BagHomeScreenProps) {
  const last = getLastSession(data);
  const showLastSession = hasMeaningfulSessionHistory(data);

  const howItWorksSlides = useMemo(
    (): HeroSlide[] =>
      BAG_COPY.howItWorksSlides.map((slide, index) => ({
        id: `how-${index + 1}`,
        eyebrow: slide.eyebrow,
        title: slide.title,
        detail: slide.detail,
        image:
          index === 1 ? BAG_CAROUSEL_FIGHTER : BAG_CAROUSEL_CLINCH,
        actions: [],
      })),
    []
  );

  return (
    <BagScreenWrapper hubScreen onHome={onHome} className="overflow-y-auto">
      <div className="flex min-h-0 flex-1 flex-col gap-7">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="label text-[#525252]">{BAG_COPY.hubLabel}</p>
          <h1 className="font-display mt-2 text-[2rem] leading-tight tracking-wide text-white">
            {BAG_COPY.headline}
          </h1>
          <p className="mt-2 text-sm text-white/50">{BAG_COPY.homeSubline}</p>
          {!isProUser && freeSessionsLeft != null && (
            <p className="mt-2 text-xs text-white/45">
              {freeSessionsLeft > 0
                ? `${freeSessionsLeft} free combo session${freeSessionsLeft === 1 ? "" : "s"} left today`
                : "Free sessions used today — "}
              {freeSessionsLeft <= 0 && onUpgrade && (
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="text-[#fa4141] underline-offset-2 hover:underline"
                >
                  Go Pro
                </button>
              )}
            </p>
          )}
        </motion.div>

        <PwaInstallBanner />

        <BagQuickDrills data={data} onStart={onStart} />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="space-y-2"
        >
          <p className="label text-[#525252]">{BAG_COPY.howItWorksLabel}</p>
          <HeroCarousel slides={howItWorksSlides} autoPlayMs={9000} variant="compact" />
        </motion.div>

        {showLastSession && last && (
          <BagLastRound data={data} onStart={onStart} />
        )}
      </div>
    </BagScreenWrapper>
  );
}
