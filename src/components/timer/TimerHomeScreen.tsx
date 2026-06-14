"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AppTopBar } from "@/components/ui/AppTopBar";
import { chipClass } from "@/components/bag-drill/bag-ui";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { FlowBagSocialTooltip } from "@/components/timer/FlowBagSocialTooltip";
import { TIMER_PRESETS, configFromPreset } from "@/lib/boxing-timer/presets";
import {
  loadTimerEmailStorage,
  shouldShowEmailCapture,
} from "@/lib/boxing-timer/email-capture-storage";
import {
  getFlowBagLinkCta,
  loadTimerUpsellStats,
  recordFlowBagClick,
} from "@/lib/boxing-timer/upsell-storage";
import type { TimerConfig } from "@/lib/boxing-timer/types";
import { DEFAULT_TIMER_CONFIG } from "@/lib/boxing-timer/types";

interface TimerHomeScreenProps {
  isPro?: boolean;
  config: TimerConfig;
  onConfigChange: (patch: Partial<TimerConfig>) => void;
  onSelectPreset: (presetId: string) => void;
  onStart: () => void;
}

function formatWorkRest(c: TimerConfig): string {
  const wm = Math.floor(c.workSeconds / 60);
  const ws = c.workSeconds % 60;
  const work = ws ? `${wm}:${ws.toString().padStart(2, "0")}` : `${wm} min`;
  return `${c.rounds} × ${work} · ${c.restSeconds}s rest`;
}

export function TimerHomeScreen({
  isPro = false,
  config,
  onConfigChange,
  onSelectPreset,
  onStart,
}: TimerHomeScreenProps) {
  const [flowBagCta, setFlowBagCta] = useState("Try fightflo →");
  const [bannerOffset, setBannerOffset] = useState(false);

  useEffect(() => {
    setFlowBagCta(getFlowBagLinkCta(loadTimerUpsellStats()));
    const storage = loadTimerEmailStorage();
    setBannerOffset(
      shouldShowEmailCapture(isPro) && !storage.hasSeenBanner && !storage.emailCaptured
    );
  }, [isPro]);

  return (
    <div
      className={`app-shell relative flex h-dvh flex-col overflow-y-auto overscroll-y-contain bg-black px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] ${bannerOffset ? "mt-[7.5rem]" : ""}`}
    >
      <AppTopBar
        className="mb-6"
        trailing={
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.14em] text-[#525252] hover:text-white"
          >
            fightflo
          </Link>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        <p className="label text-[#fa4141]">Free tool</p>
        <h1 className="font-display mt-2 text-[2rem] leading-tight tracking-wide text-white">
          Boxing round timer
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#737373]">
          Championship phases, corner coaching, and combo callouts — not just a
          countdown.
        </p>

        <div className="mt-8 space-y-2">
          {TIMER_PRESETS.map((preset) => {
            const selected = config.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                className={`w-full rounded-xl border px-4 py-3.5 text-left transition-colors ${chipClass(selected)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm tracking-wide text-white">
                    {preset.name}
                  </span>
                  {preset.badge && (
                    <span className="shrink-0 rounded bg-[#fa4141]/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#fa4141]">
                      {preset.badge}
                    </span>
                  )}
                </div>
                <span className="mt-1 block text-xs text-[#737373]">
                  {preset.tagline}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="label text-[#525252]">Session</p>
          <p className="font-display mt-2 text-lg text-white">
            {config.label}
          </p>
          <p className="mt-1 text-sm text-[#737373]">{formatWorkRest(config)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onConfigChange({ comboPulses: !config.comboPulses })}
              className={`rounded-xl border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider ${chipClass(config.comboPulses)}`}
            >
              Combo calls
            </button>
            <button
              type="button"
              onClick={() =>
                onConfigChange({ voiceCoaching: !config.voiceCoaching })
              }
              className={`rounded-xl border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider ${chipClass(config.voiceCoaching)}`}
            >
              Corner voice
            </button>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <Button onClick={onStart}>Start workout</Button>
          {!isPro && (
            <p className="text-center text-[10px] leading-relaxed text-[#525252]">
              {BAG_COPY.timerHomeTeaser}{" "}
              <FlowBagSocialTooltip enabled={!isPro}>
                <Link
                  href="/"
                  onClick={() => recordFlowBagClick()}
                  className="text-[#fa4141]/90 hover:text-[#fa4141]"
                >
                  {flowBagCta}
                </Link>
              </FlowBagSocialTooltip>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function defaultConfigFromPresetId(presetId: string): TimerConfig {
  const preset = TIMER_PRESETS.find((p) => p.id === presetId);
  if (!preset) return { ...DEFAULT_TIMER_CONFIG };
  return configFromPreset(preset);
}
