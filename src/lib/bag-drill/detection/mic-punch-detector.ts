import { MIC_SAMPLE_MS, MIC_SPIKE_MAX_MS, MIC_SPIKE_THRESHOLD } from "./constants";

export interface MicPunchDetectorOptions {
  threshold?: number;
  onSpike: (peak: number, at: number) => void;
}

/** Web Audio mic punch spike detector — 60fps sampling */
export class MicPunchDetector {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array | null = null;
  private threshold: number;
  private spikeStart: number | null = null;
  private spikePeak = 0;
  private readonly onSpike: (peak: number, at: number) => void;

  constructor(options: MicPunchDetectorOptions) {
    this.threshold = options.threshold ?? MIC_SPIKE_THRESHOLD;
    this.onSpike = options.onSpike;
  }

  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  start(stream: MediaStream): void {
    this.stop();
    if (!stream.getAudioTracks().length) return;

    this.audioContext = new AudioContext();
    void this.audioContext.resume();

    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    this.intervalId = setInterval(() => this.sample(), MIC_SAMPLE_MS);
  }

  private sample(): void {
    if (!this.analyser || !this.data) return;
    this.analyser.getByteFrequencyData(
      this.data as Uint8Array<ArrayBuffer>
    );
    let peak = 0;
    for (let i = 0; i < this.data.length; i++) {
      const v = this.data[i] / 255;
      if (v > peak) peak = v;
    }

    const now = performance.now();

    if (peak >= this.threshold) {
      if (this.spikeStart == null) {
        this.spikeStart = now;
        this.spikePeak = peak;
      } else {
        this.spikePeak = Math.max(this.spikePeak, peak);
        if (now - this.spikeStart > MIC_SPIKE_MAX_MS) {
          this.spikeStart = null;
        }
      }
      return;
    }

    if (this.spikeStart != null) {
      const duration = now - this.spikeStart;
      if (duration <= MIC_SPIKE_MAX_MS && this.spikePeak >= this.threshold) {
        this.onSpike(this.spikePeak, now);
      }
      this.spikeStart = null;
      this.spikePeak = 0;
    }
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.data = null;
    this.spikeStart = null;
  }
}
