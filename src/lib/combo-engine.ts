import { STYLE_COMBOS } from "./constants";
import { localizeComboSpeak, type AppLanguage } from "./i18n";
import {
  generateRhythmSchedule,
  resolveRhythmArchetype,
} from "./fight-rhythm-engine";
import type {
  ComboEvent,
  CueStyle,
  DifficultyMode,
  FightStyle,
  RhythmArchetype,
  RhythmMode,
  SignalEvent,
} from "./types";

interface ComboEngineConfig {
  style: FightStyle;
  mode: DifficultyMode;
  roundDuration: number;
  roundNumber: number;
  totalRounds: number;
  rhythmArchetype: RhythmArchetype;
  rhythmMode: RhythmMode;
  cueStyle?: CueStyle;
  language?: AppLanguage;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function rhythmToCombos(
  rhythmEvents: SignalEvent[],
  style: FightStyle,
  roundDuration: number,
  language: AppLanguage = "en"
): ComboEvent[] {
  const pool = STYLE_COMBOS[style];
  const events: ComboEvent[] = [];
  let lastId: string | null = null;
  let comboIdx = 0;

  // Only fire combos during active rhythm moments — skip long reading gaps
  for (let i = 0; i < rhythmEvents.length; i++) {
    const e = rhythmEvents[i];
    const prev = rhythmEvents[i - 1];
    const gap = prev ? e.timestamp - prev.timestamp : e.timestamp;

    // Skip isolated probes in calm segments
    if (
      e.segment === "reading" ||
      (gap > 4 && e.segment !== "explosive" && e.segment !== "grind")
    ) {
      continue;
    }

    let combo = pool[comboIdx % pool.length];
    if (combo.id === lastId && pool.length > 1) {
      combo = pool[(comboIdx + 1) % pool.length];
    }
    lastId = combo.id;
    comboIdx++;

    const duration = rand(2.2, 3.8);
    if (e.timestamp + duration > roundDuration - 2) break;

    events.push({
      id: combo.id,
      label: combo.label,
      speak: localizeComboSpeak(combo.speak, language),
      timestamp: e.timestamp,
      duration,
      segment: e.segment,
    });
  }

  return events;
}

export function generateComboSchedule(config: ComboEngineConfig): ComboEvent[] {
  const archetype = resolveRhythmArchetype(
    config.rhythmArchetype,
    config.rhythmMode
  );

  const rhythmEvents = generateRhythmSchedule({
    style: config.style,
    mode: config.mode,
    cueStyle: config.cueStyle ?? "clear",
    roundDuration: config.roundDuration,
    roundNumber: config.roundNumber,
    totalRounds: config.totalRounds,
    rhythmArchetype: archetype,
    rhythmMode: config.rhythmMode,
  });

  const combos = rhythmToCombos(
    rhythmEvents,
    config.style,
    config.roundDuration,
    config.language ?? "en"
  );

  // Fallback if rhythm produced sparse combos
  if (combos.length < 3) {
    return generateLegacyComboSchedule(config);
  }

  return combos;
}

function generateLegacyComboSchedule(config: ComboEngineConfig): ComboEvent[] {
  const pool = STYLE_COMBOS[config.style];
  const pacing =
    config.mode === "easy"
      ? { minGap: 5, maxGap: 9, duration: [3, 4] as [number, number] }
      : config.mode === "stadium"
        ? { minGap: 2.5, maxGap: 4.5, duration: [2, 3] as [number, number] }
        : { minGap: 3.5, maxGap: 6, duration: [2.5, 3.5] as [number, number] };

  const events: ComboEvent[] = [];
  let t = rand(3, 6);
  let lastId: string | null = null;

  while (t < config.roundDuration - 3) {
    let combo = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && combo.id === lastId) {
      combo = pool[(pool.indexOf(combo) + 1) % pool.length];
    }
    lastId = combo.id;

    const duration = rand(...pacing.duration);
    events.push({
      id: combo.id,
      label: combo.label,
      speak: localizeComboSpeak(combo.speak, config.language ?? "en"),
      timestamp: t,
      duration,
    });

    t += duration + rand(pacing.minGap, pacing.maxGap);
  }

  return events;
}
