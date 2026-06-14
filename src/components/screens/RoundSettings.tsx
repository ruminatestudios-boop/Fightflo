"use client";

import type { AppSettings } from "@/lib/types";
import { CLEAR_SIGNALS } from "@/lib/types";
import { SIGNAL_CONFIG } from "@/lib/constants";
import { combosForStyle } from "@/lib/style-discipline";
import { audioEngine } from "@/lib/audio";
import { isAmbiencePro } from "@/lib/pro-gates";
import { Button } from "@/components/ui/Button";
import { CueStyleSelect } from "@/components/ui/CueStyleSelect";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { ProUpsell } from "@/components/ui/ProUpsell";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Slider } from "@/components/ui/Slider";
import { SignalCueSelect } from "@/components/ui/SignalCueSelect";
import { RhythmArchetypeSelect } from "@/components/ui/RhythmArchetypeSelect";
import { Toggle } from "@/components/ui/Toggle";

interface RoundSettingsProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onStart: () => void;
  onBack: () => void;
  isPro: boolean;
  onUpgrade: () => void;
  /** Core loop: save preferences only, no start button */
  customizeOnly?: boolean;
}

function formatRoundLength(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${m}:00`;
}

export function RoundSettingsScreen({
  settings,
  onChange,
  onStart,
  onBack,
  isPro,
  onUpgrade,
  customizeOnly = false,
}: RoundSettingsProps) {
  const isCombos = settings.workoutMode === "combos";
  const isClear = settings.cueStyle === "clear";
  const ambienceLocked = !isPro && isAmbiencePro();

  const updateRounds = (patch: Partial<AppSettings["rounds"]>) => {
    onChange({ ...settings, rounds: { ...settings.rounds, ...patch } });
  };

  const updateAudio = (patch: Partial<AppSettings["audio"]>) => {
    onChange({ ...settings, audio: { ...settings.audio, ...patch } });
  };

  const handleAmbience = (
    key: "gymAmbience" | "crowdAmbience" | "trainerClaps",
    v: boolean
  ) => {
    if (ambienceLocked && v) {
      onUpgrade();
      return;
    }
    if (key === "gymAmbience") {
      updateAudio({
        gymAmbience: v,
        crowdAmbience: v ? false : settings.audio.crowdAmbience,
      });
    } else if (key === "crowdAmbience") {
      updateAudio({
        crowdAmbience: v,
        gymAmbience: v ? false : settings.audio.gymAmbience,
      });
    } else {
      updateAudio({ trainerClaps: v });
    }
  };

  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader eyebrow="Round settings" title="Configure" />

      <div className="mt-10 flex-1 space-y-9">
        <div>
          <p className="label mb-3">Fight rhythm</p>
          <p className="mb-3 text-sm text-[#737373]">
            Controls pacing, pressure waves, and how alive the round feels.
          </p>
          <RhythmArchetypeSelect
            style={settings.style}
            value={settings.rhythmArchetype}
            onChange={(rhythmArchetype) =>
              onChange({ ...settings, rhythmArchetype, rhythmMode: "default" })
            }
            isPro={isPro}
            onUpgrade={onUpgrade}
          />
        </div>

        {isCombos ? (
          <div>
            <p className="text-sm leading-relaxed text-[#737373]">
              Combos follow the same rhythm engine — pressure builds, then calls
              land in the exchanges.
            </p>
            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#525252]">
                {settings.style.replace("-", " ")} combos only
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {combosForStyle(settings.style).map((combo) => (
                  <li
                    key={combo.id}
                    className="rounded-lg border border-white/[0.06] px-2.5 py-2 text-xs text-[#d4d4d4]"
                  >
                    <span className="font-medium text-white">{combo.label}</span>
                    <span className="mt-0.5 block text-[#737373]">{combo.speak}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <p className="label mb-3">Cue style</p>
            <CueStyleSelect
              value={settings.cueStyle}
              onChange={(cueStyle) => onChange({ ...settings, cueStyle })}
              isPro={isPro}
              onUpgrade={onUpgrade}
            />
          </div>
        )}

        <div>
          <p className="label mb-3">Coach language</p>
          <p className="mb-3 text-sm text-[#737373]">
            Voice cues and corner coaching during training.
          </p>
          <LanguageSelect
            value={settings.language}
            onChange={(language) => onChange({ ...settings, language })}
          />
        </div>

        <Slider
          label="Rounds"
          value={settings.rounds.rounds}
          min={1}
          max={12}
          onChange={(v) => updateRounds({ rounds: v })}
        />
        <Slider
          label="Round length"
          value={settings.rounds.roundLength}
          min={60}
          max={300}
          step={30}
          format={formatRoundLength}
          onChange={(v) => updateRounds({ roundLength: v })}
        />
        <Slider
          label="Rest time"
          value={settings.rounds.restTime}
          min={15}
          max={120}
          step={15}
          format={(v) => `${v}s`}
          onChange={(v) => updateRounds({ restTime: v })}
        />

        {!isCombos && !isClear && (
          <div>
            <p className="label mb-3">Signal tones</p>
            <p className="mb-3 text-sm text-[#737373]">
              Tap to preview each signal identity.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["attack", "defend", "move", "pressure", "burnout", "reset"] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={async () => {
                      await audioEngine.unlock();
                      audioEngine.previewSignal(type, settings.cueStyle);
                    }}
                    className="rounded-xl border border-[#3a3a3a] px-4 py-2 text-sm font-medium transition-colors hover:border-[#525252]"
                    style={{ color: SIGNAL_CONFIG[type].color }}
                  >
                    {SIGNAL_CONFIG[type].label}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {!isCombos && isClear && (
          <div>
            <p className="label mb-3">Signal preview</p>
            <div className="flex flex-wrap gap-2">
              {CLEAR_SIGNALS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={async () => {
                    await audioEngine.unlock();
                      audioEngine.previewSignal(type, settings.cueStyle);
                  }}
                  className="rounded-xl border border-[#3a3a3a] px-4 py-2 text-sm font-medium transition-colors hover:border-[#525252]"
                  style={{ color: SIGNAL_CONFIG[type].color }}
                >
                  {SIGNAL_CONFIG[type].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isCombos && !isClear && (
          <div>
            <p className="label mb-3">Beep mode</p>
            <SignalCueSelect
              value={settings.audio.signalCueMode}
              onChange={(signalCueMode) => updateAudio({ signalCueMode })}
            />
          </div>
        )}

        {!isCombos && isClear && (
          <p className="text-sm leading-relaxed text-[#525252]">
            Clear mode calls each move aloud. No beep patterns to memorize.
          </p>
        )}

        <div className="nike-card rounded-2xl px-5">
          <p className="label pt-5 pb-1">Ambience</p>
          {ambienceLocked && (
            <p className="mb-3 text-xs text-[#525252]">Pro feature</p>
          )}
          <Toggle
            label="Gym ambience"
            checked={settings.audio.gymAmbience}
            onChange={(v) => handleAmbience("gymAmbience", v)}
          />
          <Toggle
            label="Crowd ambience"
            checked={settings.audio.crowdAmbience}
            onChange={(v) => handleAmbience("crowdAmbience", v)}
          />
          {!isCombos && !isClear && (
            <Toggle
              label="Trainer claps"
              checked={settings.audio.trainerClaps}
              onChange={(v) => handleAmbience("trainerClaps", v)}
            />
          )}
        </div>

        {!isPro && <ProUpsell onUpgrade={onUpgrade} />}
      </div>

      <div className="mt-10 pb-2">
        <Button onClick={customizeOnly ? onBack : onStart}>
          {customizeOnly ? "Done" : "Start round"}
        </Button>
      </div>
    </ScreenWrapper>
  );
}
