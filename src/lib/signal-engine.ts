import { generateRhythmSchedule } from "./fight-rhythm-engine";
import { USE_MOVE_CALL_ENGINE } from "./feature-flags";
import { buildMoveSchedule } from "./move-signal-engine";
import type {
  CueStyle,
  DifficultyMode,
  FightStyle,
  MoveCallEvent,
  RhythmArchetype,
  RhythmMode,
  SignalEvent,
  RhythmBlueprint,
} from "./types";

interface EngineConfig {
  style: FightStyle;
  mode: DifficultyMode;
  workoutMode: "solo" | "combos";
  roundDuration: number;
  cueStyle: CueStyle;
  roundNumber: number;
  totalRounds: number;
  rhythmArchetype: RhythmArchetype;
  rhythmMode: RhythmMode;
  rhythmBlueprint?: RhythmBlueprint | null;
}

export function shouldUseMoveCallEngine(config: {
  workoutMode: string;
  cueStyle: CueStyle;
}): boolean {
  return USE_MOVE_CALL_ENGINE && config.workoutMode === "solo";
}

export function generateMoveCallSchedule(config: EngineConfig): MoveCallEvent[] {
  const items = buildMoveSchedule({
    style: config.style,
    difficulty: config.mode,
    roundDurationSec: config.roundDuration,
    seed:
      hashRoundSeed(config.style, config.roundNumber) ^
      config.roundNumber * 997,
  });

  return items.map((item) => ({
    id: item.id,
    move: item.move,
    speak: item.speak,
    style: item.style,
    timestamp: item.timestamp,
    duration: item.duration,
  }));
}

function hashRoundSeed(style: FightStyle, round: number): number {
  let h = 0;
  const s = `${style}-${round}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function generateSignalSchedule(config: EngineConfig): SignalEvent[] {
  return generateRhythmSchedule({
    style: config.style,
    mode: config.mode,
    cueStyle: config.cueStyle,
    roundDuration: config.roundDuration,
    roundNumber: config.roundNumber,
    totalRounds: config.totalRounds,
    rhythmArchetype: config.rhythmArchetype,
    rhythmMode: config.rhythmMode,
    rhythmBlueprint: config.rhythmBlueprint,
  });
}

export function countBursts(events: SignalEvent[]): number {
  let bursts = 0;
  let streak = 0;
  for (let i = 1; i < events.length; i++) {
    const gap = events[i].timestamp - events[i - 1].timestamp;
    if (gap < 1.2) {
      streak++;
      if (streak === 2) bursts++;
    } else {
      streak = 0;
    }
  }
  return bursts;
}

export function countChaosMoments(events: SignalEvent[]): number {
  let chaos = 0;
  let streak = 0;
  for (let i = 1; i < events.length; i++) {
    const gap = events[i].timestamp - events[i - 1].timestamp;
    if (gap < 0.8) {
      streak++;
      if (streak === 4) {
        chaos++;
        streak = 0;
      }
    } else {
      streak = 0;
    }
  }
  return chaos;
}

export function countReadingMoments(events: SignalEvent[]): number {
  let reading = 0;
  for (let i = 1; i < events.length; i++) {
    const gap = events[i].timestamp - events[i - 1].timestamp;
    if (gap >= 3.5) reading++;
  }
  return reading;
}
