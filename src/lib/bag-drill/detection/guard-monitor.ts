import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { GUARD_DROP_PCT, GUARD_PUNCH_COOLDOWN_MS, LM } from "./constants";
import { chinY, lm } from "./landmarks";

export interface GuardBaseline {
  left: number;
  right: number;
  chinY: number;
}

export type GuardWarningKind = "left" | "right" | "both" | null;

export interface GuardState {
  left: "up" | "down";
  right: "up" | "down";
  warning: GuardWarningKind;
  message: string | null;
}

export class GuardMonitor {
  private baseline: GuardBaseline | null = null;
  private lastPunchAt = 0;
  private dropCount = 0;
  private comboGuardDrops: string[] = [];

  setBaseline(baseline: GuardBaseline): void {
    this.baseline = baseline;
  }

  recordPunch(): void {
    this.lastPunchAt = Date.now();
  }

  calibrateFromLandmarks(landmarks: NormalizedLandmark[], height: number): GuardBaseline {
    const lw = lm(landmarks, LM.LEFT_WRIST);
    const rw = lm(landmarks, LM.RIGHT_WRIST);
    const chin = chinY(landmarks, height);
    const baseline: GuardBaseline = {
      left: lw ? lw.y * height : chin,
      right: rw ? rw.y * height : chin,
      chinY: chin,
    };
    this.baseline = baseline;
    return baseline;
  }

  check(landmarks: NormalizedLandmark[], height: number): GuardState {
    if (!this.baseline) {
      return { left: "up", right: "up", warning: null, message: null };
    }

    const now = Date.now();
    const afterPunch = now - this.lastPunchAt < GUARD_PUNCH_COOLDOWN_MS;

    const lw = lm(landmarks, LM.LEFT_WRIST);
    const rw = lm(landmarks, LM.RIGHT_WRIST);
    const leftY = lw ? lw.y * height : this.baseline.left;
    const rightY = rw ? rw.y * height : this.baseline.right;

    const leftDrop =
      leftY > this.baseline.left * (1 + GUARD_DROP_PCT) && !afterPunch;
    const rightDrop =
      rightY > this.baseline.right * (1 + GUARD_DROP_PCT) && !afterPunch;

    let warning: GuardWarningKind = null;
    let message: string | null = null;

    if (leftDrop && rightDrop) {
      warning = "both";
      message = "HANDS UP ⚠️ YOU'RE OPEN";
      this.dropCount += 1;
      this.comboGuardDrops.push("both hands down");
    } else if (leftDrop) {
      warning = "left";
      message = "LEFT HAND 👊 KEEP IT UP";
      this.dropCount += 1;
      this.comboGuardDrops.push("left hand");
    } else if (rightDrop) {
      warning = "right";
      message = "RIGHT HAND 👊 KEEP IT UP";
      this.dropCount += 1;
      this.comboGuardDrops.push("right hand");
    }

    return {
      left: leftDrop ? "down" : "up",
      right: rightDrop ? "down" : "up",
      warning,
      message,
    };
  }

  consumeComboGuardDrops(): string[] {
    const drops = [...this.comboGuardDrops];
    this.comboGuardDrops = [];
    return drops;
  }

  getDropCount(): number {
    return this.dropCount;
  }

  reset(): void {
    this.baseline = null;
    this.dropCount = 0;
    this.comboGuardDrops = [];
    this.lastPunchAt = 0;
  }
}
