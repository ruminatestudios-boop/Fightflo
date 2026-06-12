import {
  getGeneralPauseCues,
  getSegmentPauseCues,
  type AppLanguage,
} from "./i18n";
import { getFighterSegmentCoaching } from "./fighter-profiles";
import { TRAINER_IDLE_ACTIONS } from "./idle-coaching";
import type { ComboEvent, RhythmSegment, SignalEvent } from "./types";

export interface CoachPauseEvent {
  timestamp: number;
  text: string;
}

type TimedEvent = {
  timestamp: number;
  duration: number;
  segment?: RhythmSegment;
};

const MIN_GAP_SECONDS = 1.6;
const MIN_LEAD_BEFORE_NEXT = 0.6;

const LOW_ACTIVITY_SEGMENTS = new Set<RhythmSegment>([
  "reading",
  "probing",
  "reset",
  "counter",
  "feint",
]);

function inferGapSegment(
  gap: number,
  prevSegment?: RhythmSegment,
  nextSegment?: RhythmSegment
): RhythmSegment {
  if (gap >= 4) return prevSegment ?? nextSegment ?? "reading";
  if (prevSegment && LOW_ACTIVITY_SEGMENTS.has(prevSegment)) return prevSegment;
  return nextSegment ?? prevSegment ?? "probing";
}

function pickCoachCue(
  segment: RhythmSegment,
  used: Set<string>,
  last: string | null,
  lang: AppLanguage,
  cueIndex: { value: number },
  fighterDisplayName?: string,
  customCues?: string[],
  lowActivityCues?: string[]
): string {
  const fighterMap = fighterDisplayName
    ? getFighterSegmentCoaching(fighterDisplayName)
    : undefined;
  const fighterLines = fighterMap?.[segment];
  if (fighterLines && fighterLines.length > 0) {
    const line = fighterLines[cueIndex.value % fighterLines.length];
    cueIndex.value += 1;
    return line;
  }

  if (customCues && customCues.length > 0) {
    const line = customCues[cueIndex.value % customCues.length];
    cueIndex.value += 1;
    return line;
  }

  if (lowActivityCues && lowActivityCues.length > 0) {
    const line = lowActivityCues[cueIndex.value % lowActivityCues.length];
    cueIndex.value += 1;
    return line;
  }

  const segmentCues = getSegmentPauseCues(lang);
  const generalCues = getGeneralPauseCues(lang);
  const idlePool =
    TRAINER_IDLE_ACTIONS[segment] ?? TRAINER_IDLE_ACTIONS.reading;

  let pool: string[];
  if (LOW_ACTIVITY_SEGMENTS.has(segment)) {
    pool = [...idlePool, ...(segmentCues[segment] ?? []), ...generalCues];
  } else {
    pool = [...(segmentCues[segment] ?? []), ...generalCues];
  }

  const available = pool.filter((c) => c !== last && !used.has(c));
  const pickFrom = available.length > 0 ? available : pool.filter((c) => c !== last);
  if (pickFrom.length === 0) return pool[0] ?? generalCues[0];
  const line = pickFrom[cueIndex.value % pickFrom.length];
  cueIndex.value += 1;
  return line;
}

function gapCueSlots(gap: number, segment: RhythmSegment): number[] {
  const isQuiet =
    LOW_ACTIVITY_SEGMENTS.has(segment) || segment === "reading" || gap >= 3.5;

  if (gap >= 6 || segment === "reading") {
    return [0.1, 0.32, 0.54, 0.76];
  }
  if (isQuiet && gap >= 4) {
    return [0.18, 0.48, 0.72];
  }
  if (isQuiet && gap >= 2.8) {
    return [0.22, 0.58];
  }
  if (gap >= MIN_GAP_SECONDS) {
    return [0.38];
  }
  return [];
}

function scheduleGapCues(
  schedule: CoachPauseEvent[],
  used: Set<string>,
  lastCueRef: { last: string | null },
  cueIndex: { value: number },
  cursor: number,
  gapEnd: number,
  segment: RhythmSegment,
  lang: AppLanguage,
  fighterDisplayName?: string,
  customCues?: string[],
  lowActivityCues?: string[]
): void {
  const gap = gapEnd - cursor;
  if (gap < MIN_GAP_SECONDS) return;

  const slots = gapCueSlots(gap, segment);

  for (const fraction of slots) {
    const speakAt = cursor + Math.min(
      Math.max(gap * fraction, 0.8),
      gap - MIN_LEAD_BEFORE_NEXT
    );
    if (speakAt < cursor + 0.5 || speakAt > gapEnd - MIN_LEAD_BEFORE_NEXT) continue;

    const text = pickCoachCue(
      segment,
      used,
      lastCueRef.last,
      lang,
      cueIndex,
      fighterDisplayName,
      customCues,
      lowActivityCues
    );
    schedule.push({ timestamp: speakAt, text });
    used.add(text);
    lastCueRef.last = text;
  }
}

export function generatePauseCoachSchedule(
  events: TimedEvent[],
  roundDuration: number,
  lang: AppLanguage = "en",
  customCues?: string[],
  lowActivityCues?: string[],
  fighterDisplayName?: string
): CoachPauseEvent[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const schedule: CoachPauseEvent[] = [];
  const used = new Set<string>();
  const lastCueRef = { last: null as string | null };
  const cueIndex = { value: 0 };
  let cursor = 0;
  let prevSegment: RhythmSegment | undefined;

  const opener = pickCoachCue(
    "reading",
    used,
    null,
    lang,
    cueIndex,
    fighterDisplayName,
    customCues,
    lowActivityCues
  );
  schedule.push({ timestamp: 1.2, text: opener });
  used.add(opener);
  lastCueRef.last = opener;

  for (const event of sorted) {
    const segment = inferGapSegment(
      event.timestamp - cursor,
      prevSegment,
      event.segment
    );
    scheduleGapCues(
      schedule,
      used,
      lastCueRef,
      cueIndex,
      cursor,
      event.timestamp,
      segment,
      lang,
      fighterDisplayName,
      customCues,
      lowActivityCues
    );
    cursor = event.timestamp + event.duration;
    prevSegment = event.segment;
  }

  const tailGap = roundDuration - 2 - cursor;
  if (tailGap >= MIN_GAP_SECONDS) {
    scheduleGapCues(
      schedule,
      used,
      lastCueRef,
      cueIndex,
      cursor,
      roundDuration - 2,
      "reading",
      lang,
      fighterDisplayName,
      customCues,
      lowActivityCues
    );
  }

  return schedule.sort((a, b) => a.timestamp - b.timestamp);
}

export function generateSignalPauseCoachSchedule(
  events: SignalEvent[],
  roundDuration: number,
  lang: AppLanguage = "en",
  customCues?: string[],
  lowActivityCues?: string[],
  fighterDisplayName?: string
): CoachPauseEvent[] {
  return generatePauseCoachSchedule(
    events,
    roundDuration,
    lang,
    customCues,
    lowActivityCues,
    fighterDisplayName
  );
}

export function generateComboPauseCoachSchedule(
  events: ComboEvent[],
  roundDuration: number,
  lang: AppLanguage = "en",
  customCues?: string[],
  lowActivityCues?: string[],
  fighterDisplayName?: string
): CoachPauseEvent[] {
  return generatePauseCoachSchedule(
    events,
    roundDuration,
    lang,
    customCues,
    lowActivityCues,
    fighterDisplayName
  );
}
