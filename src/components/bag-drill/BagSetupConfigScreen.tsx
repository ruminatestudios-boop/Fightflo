"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { BagScreenWrapper } from "@/components/bag-drill/BagScreenWrapper";
import { BagSection, chipClass } from "@/components/bag-drill/bag-ui";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { DIFFICULTY_REST_MS } from "@/lib/bag-drill/combos";
import {
  defaultTiming,
  estimateComboWindowSec,
  formatComboWindowScale,
  formatRestSeconds,
  formatSessionDuration,
  TIMING_SLIDER,
} from "@/lib/bag-drill/timing-presets";
import type {
  BagCameraMode,
  BagDifficulty,
  BagDrillMode,
  BagTimingConfig,
  BagTrainingConfig,
  FlurryDuration,
} from "@/lib/bag-drill/types";
import { FLURRY_DURATION_OPTIONS } from "@/lib/bag-drill/types";

interface BagSetupConfigScreenProps {
  cameraMode: BagCameraMode;
  initialDrillMode?: BagDrillMode;
  initialConfig?: Partial<BagTrainingConfig>;
  onBack: () => void;
  onHome?: () => void;
  onReady: (config: BagTrainingConfig) => void;
}

const DIFFICULTIES: { id: BagDifficulty; label: string; desc: string }[] = [
  { id: "beginner", label: "Beginner", desc: "Simple combos, slower speech" },
  { id: "fighter", label: "Fighter", desc: "Standard combos and pace" },
  { id: "champion", label: "Champion", desc: "Long combos, fast windows" },
];

export function BagSetupConfigScreen({
  cameraMode,
  initialDrillMode = "combo",
  initialConfig,
  onBack,
  onHome,
  onReady,
}: BagSetupConfigScreenProps) {
  const [drillMode, setDrillMode] = useState<BagDrillMode>(
    initialConfig?.drillMode ?? initialDrillMode
  );
  const [difficulty, setDifficulty] = useState<BagDifficulty>(
    initialConfig?.difficulty ?? "fighter"
  );
  const [timing, setTiming] = useState<BagTimingConfig>(() =>
    initialConfig?.timing ?? defaultTiming(initialConfig?.difficulty ?? "fighter")
  );
  const [flurrySeconds, setFlurrySeconds] = useState<FlurryDuration>(
    (initialConfig?.flurrySeconds as FlurryDuration) ?? 30
  );
  const [weaknessFocus, setWeaknessFocus] = useState(
    initialConfig?.weaknessFocus ?? false
  );
  const [restOverridden, setRestOverridden] = useState(false);

  useEffect(() => {
    if (restOverridden) return;
    if (drillMode === "speed") {
      setTiming((t) => ({ ...t, restBetweenCombosMs: 3_000 }));
      return;
    }
    if (drillMode === "combo") {
      setTiming((t) => ({
        ...t,
        restBetweenCombosMs: DIFFICULTY_REST_MS[difficulty],
      }));
    }
  }, [difficulty, restOverridden, drillMode]);

  const restSec = Math.round(timing.restBetweenCombosMs / 1000);
  const windowExample = estimateComboWindowSec(3, difficulty, timing.comboWindowScale);
  const isFlurry = drillMode === "flurry";
  const isSpeed = drillMode === "speed";
  const isWeakness = weaknessFocus && drillMode === "combo";
  const lockDrillMode =
    initialDrillMode !== "combo" || Boolean(initialConfig?.weaknessFocus);

  return (
    <BagScreenWrapper onBack={onBack} onHome={onHome} className="overflow-y-auto pb-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col"
      >
        <p className="label text-[#525252]">Boxing session setup</p>
        <h1 className="font-display mt-2 text-2xl tracking-wide text-white">
          {isFlurry
            ? "Flurry"
            : isSpeed
              ? "Punch speed"
              : isWeakness
                ? "Weakness drill"
                : "Called combos"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#737373]">
          {isFlurry
            ? BAG_COPY.quickStart.flurry.detail
            : isSpeed
              ? BAG_COPY.quickStart.speed.detail
              : isWeakness
                ? BAG_COPY.quickStart.weakness.detail
                : BAG_COPY.quickStart.combo.detail}
        </p>

        {!lockDrillMode && (
          <div className="mt-6 flex gap-2">
            {(["combo", "flurry"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDrillMode(m)}
                className={`flex-1 rounded-xl border py-3 text-center transition-colors ${chipClass(drillMode === m)}`}
              >
                <span className="font-display text-xs">
                  {m === "combo" ? "Combos" : "Flurry"}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-8">
          {!isFlurry && isWeakness && (
            <div className="rounded-xl border border-[#fa4141]/30 bg-[#fa4141]/10 px-4 py-3 text-sm text-[#fa4141]/90">
              Prioritises combos you&apos;re slowest on.
            </div>
          )}

          {!isFlurry && isSpeed && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-[#737373]">
              Camera on you works best — we time each punch as it lands.
            </div>
          )}

          <BagSection label="Difficulty">
            <div className="space-y-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${chipClass(difficulty === d.id)}`}
                >
                  <span className="font-display text-sm">{d.label}</span>
                  <span className="mt-0.5 block text-xs normal-case tracking-normal text-[#737373]">
                    {d.desc}
                  </span>
                </button>
              ))}
            </div>
          </BagSection>

          {isFlurry ? (
            <BagSection label="Flurry length">
              <div className="flex gap-2">
                {FLURRY_DURATION_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setFlurrySeconds(sec)}
                    className={`flex-1 rounded-xl border py-4 text-center transition-colors ${chipClass(flurrySeconds === sec)}`}
                  >
                    <span className="font-display text-lg">{sec}s</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[#525252]">
                Throw non-stop when the timer hits zero. Beat your personal best.
              </p>
            </BagSection>
          ) : (
            <>
              <BagSection label="Session length">
                <Slider
                  label="Round duration"
                  value={timing.durationSeconds}
                  min={TIMING_SLIDER.durationSec.min}
                  max={TIMING_SLIDER.durationSec.max}
                  step={TIMING_SLIDER.durationSec.step}
                  format={formatSessionDuration}
                  onChange={(seconds) =>
                    setTiming((t) => ({ ...t, durationSeconds: seconds }))
                  }
                />
              </BagSection>

              <BagSection label="Rest between combos">
                <Slider
                  label="Pause after each combo"
                  value={restSec}
                  min={TIMING_SLIDER.restSec.min}
                  max={TIMING_SLIDER.restSec.max}
                  step={TIMING_SLIDER.restSec.step}
                  format={formatRestSeconds}
                  onChange={(sec) => {
                    setRestOverridden(true);
                    setTiming((t) => ({
                      ...t,
                      restBetweenCombosMs: sec * 1000,
                    }));
                  }}
                />
              </BagSection>

              <BagSection label="Combo window">
                <Slider
                  label="Time to complete each combo"
                  value={Math.round(timing.comboWindowScale * 100)}
                  min={TIMING_SLIDER.comboWindowPct.min}
                  max={TIMING_SLIDER.comboWindowPct.max}
                  step={TIMING_SLIDER.comboWindowPct.step}
                  format={(pct) => formatComboWindowScale(pct / 100)}
                  onChange={(pct) =>
                    setTiming((t) => ({
                      ...t,
                      comboWindowScale: pct / 100,
                    }))
                  }
                />
                <p className="mt-2 text-xs text-[#737373]">
                  3-hit example: ~{windowExample}s
                </p>
              </BagSection>

              {!isSpeed && !lockDrillMode && (
                <BagSection label="Focus">
                  <button
                    type="button"
                    onClick={() => setWeaknessFocus((v) => !v)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${chipClass(weaknessFocus)}`}
                  >
                    <span className="font-display text-sm">Weakness drill</span>
                    <span className="mt-0.5 block text-xs normal-case tracking-normal text-[#737373]">
                      Weight calls toward combos you&apos;re slowest on
                    </span>
                  </button>
                </BagSection>
              )}
            </>
          )}
        </div>

        <div className="mt-10 space-y-3">
          <Button
            variant="secondary"
            onClick={() =>
              onReady({
                difficulty,
                cameraMode,
                drillMode,
                stance: initialConfig?.stance,
                calibration: initialConfig?.calibration,
                flurrySeconds: isFlurry ? flurrySeconds : undefined,
                weaknessFocus: isFlurry || isSpeed ? false : weaknessFocus,
                weeklyPlanId: initialConfig?.weeklyPlanId,
                timing: {
                  ...timing,
                  durationSeconds: isFlurry
                    ? flurrySeconds
                    : Math.max(
                        TIMING_SLIDER.durationSec.min,
                        Math.min(TIMING_SLIDER.durationSec.max, timing.durationSeconds)
                      ),
                },
              })
            }
          >
            Start session
          </Button>
        </div>
      </motion.div>
    </BagScreenWrapper>
  );
}
