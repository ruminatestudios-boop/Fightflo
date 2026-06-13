import type { BagThudProfile } from "./bag-thud-detector";
import { BagThudDetector } from "./bag-thud-detector";

export interface MicPunchDetectorOptions {
  threshold?: number;
  bagProfile?: Partial<BagThudProfile>;
  onSpike: (peak: number, at: number) => void;
}

/** Mic spike detector — filtered bag thud only (used in pose fusion path). */
export class MicPunchDetector {
  private detector: BagThudDetector | null = null;
  private readonly onSpike: (peak: number, at: number) => void;

  constructor(options: MicPunchDetectorOptions) {
    this.onSpike = options.onSpike;
    const profile =
      options.bagProfile ??
      (options.threshold != null
        ? { threshold: options.threshold * 255 }
        : undefined);
    this.detector = new BagThudDetector({
      profile,
      onThud: (hit) => this.onSpike(hit.peakVolume / 255, performance.now()),
    });
  }

  setThreshold(threshold: number): void {
    this.detector = new BagThudDetector({
      profile: { threshold: threshold * 255 },
      onThud: (hit) => this.onSpike(hit.peakVolume / 255, performance.now()),
    });
  }

  start(stream: MediaStream): void {
    void this.detector?.start(stream);
  }

  stop(): void {
    this.detector?.stop();
  }
}
