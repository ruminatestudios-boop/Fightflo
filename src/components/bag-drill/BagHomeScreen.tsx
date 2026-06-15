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
    <BagScreenWrapper hubScreen onHome={onHome}>
      <div className="flex flex-col gap-7">
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
            <div className="mt-3">
              {freeSessionsLeft > 0 ? (
                <p className="text-xs text-white/45">
                  {`${freeSessionsLeft} free combo session${freeSessionsLeft === 1 ? "" : "s"} left today`}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <p className="text-xs text-white/45">{BAG_COPY.freeSessionsUsed}</p>
                  {onUpgrade && (
                    <button
                      type="button"
                      onClick={onUpgrade}
                      className="group inline-flex max-w-full flex-wrap items-center gap-2 text-left"
                    >
                      <span className="shrink-0 rounded-full border border-[#fa4141]/35 bg-[#fa4141]/14 px-3 py-1 font-display text-[10px] tracking-[0.14em] text-[#fa4141] shadow-[0_4px_18px_rgba(250,65,65,0.14)] backdrop-blur-md transition-colors group-hover:border-[#fa4141]/55 group-hover:bg-[#fa4141]/22">
                        {BAG_COPY.goProPill}
                      </span>
                      <span className="text-xs leading-snug text-white/50 transition-colors group-hover:text-white/70">
                        {BAG_COPY.goProUpsell}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
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
