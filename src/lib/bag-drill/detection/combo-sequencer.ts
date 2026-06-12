import { COMBO_GAP_MS, COMBO_MAX_BUFFER, COMBO_MIN_LENGTH } from "./constants";

const NAMED_COMBOS: Record<string, string> = {
  "1-2": "The Jab Cross",
  "1-2-3": "The Classic",
  "1-2-3-2": "The Return",
  "1-1-2": "Double Jab",
  "2-3-2": "Power Combo",
  "3-2-3": "Hook Heaven",
  "1-2-5-2": "The Philly",
};

export interface CompletedCombo {
  numbers: number[];
  key: string;
  name: string;
  completedAt: number;
}

export class ComboSequencer {
  private buffer: number[] = [];
  private lastPunchAt = 0;
  private gapTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onFlush: (combo: CompletedCombo) => void;

  constructor(onFlush: (combo: CompletedCombo) => void) {
    this.onFlush = onFlush;
  }

  push(punchNumber: number): void {
    const now = Date.now();
    if (this.buffer.length > 0 && now - this.lastPunchAt > COMBO_GAP_MS) {
      this.flush();
    }

    this.buffer.push(punchNumber);
    if (this.buffer.length > COMBO_MAX_BUFFER) {
      this.buffer.shift();
    }
    this.lastPunchAt = now;
    this.scheduleGapFlush();
  }

  private scheduleGapFlush(): void {
    if (this.gapTimer) clearTimeout(this.gapTimer);
    this.gapTimer = setTimeout(() => this.flush(), COMBO_GAP_MS);
  }

  flush(): CompletedCombo | null {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer);
      this.gapTimer = null;
    }
    if (this.buffer.length < COMBO_MIN_LENGTH) {
      this.buffer = [];
      return null;
    }
    const numbers = [...this.buffer];
    this.buffer = [];
    const key = numbers.join("-");
    const name =
      numbers.length >= 6
        ? "Flurry"
        : (NAMED_COMBOS[key] ?? key);
    const combo: CompletedCombo = {
      numbers,
      key,
      name,
      completedAt: Date.now(),
    };
    this.onFlush(combo);
    return combo;
  }

  reset(): void {
    if (this.gapTimer) clearTimeout(this.gapTimer);
    this.gapTimer = null;
    this.buffer = [];
  }
}

export function punchNumberFromId(strikeId: string): number {
  const id = strikeId.toLowerCase();
  if (id === "jab") return 1;
  if (id === "cross") return 2;
  if (id.includes("hook") && id.includes("lead")) return 3;
  if (id.includes("hook")) return 3;
  if (id === "hook") return 3;
  if (id.includes("upper") && id.includes("lead")) return 5;
  if (id.includes("upper")) return 6;
  if (id === "uppercut") return 5;
  return 0;
}

export function strikeIdFromPunchNumber(n: number): string {
  switch (n) {
    case 1:
      return "jab";
    case 2:
      return "cross";
    case 3:
      return "hook";
    case 4:
      return "hook";
    case 5:
    case 6:
      return "uppercut";
    default:
      return "jab";
  }
}
