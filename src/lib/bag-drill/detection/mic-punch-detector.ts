import type { BagThudProfile } from "./bag-thud-detector";
import { BagThudDetector } from "./bag-thud-detector";

export interface MicPunchDetectorOptions {
  threshold?: number;
  bagProfile?: Partial<BagThudProfile>;
  strictSession?: boolean;
  onSpike: (peak: number, at: number) => void;
}

/** Mic spike detector — filtered bag thud only (used in pose fusion path). */
export class MicPunchDetector {
  private detector: BagThudDetector | null = null;
  private readonly onSpike: (peak: number, at: number) => void;

  constructor(options: MicPunchDetectorOptions) {
    this.onSpike = options.onSpike;
    this.detector = this.buildDetector(options);
  }

  private buildDetector(options: MicPunchDetectorOptions): BagThudDetector {
    const profile =
      options.bagProfile ??
      (options.threshold != null
        ? { threshold: options.threshold * 255 }
        : undefined);
    return new BagThudDetector({
      profile,
      strictSession: options.strictSession ?? !options.bagProfile,
      onThud: (hit) => this.onSpike(hit.peakVolume / 255, performance.now()),
    });
  }

  setThreshold(threshold: number): void {
    this.detector = this.buildDetector({
      threshold,
      strictSession: true,
      onSpike: this.onSpike,
    });
  }

  start(stream: MediaStream): void {
    void this.detector?.start(stream);
  }

  stop(): void {
    this.detector?.stop();
  }
}
