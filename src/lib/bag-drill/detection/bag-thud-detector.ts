"use client";

/** Raw mic — browser DSP removes bag thud frequencies. */
export const RAW_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

export type GymEnvironment = "quiet" | "normal" | "loud" | "very_loud";

export interface BagThudHit {
  peakVolume: number;
  peakFrequency: number;
  attackTime: number;
  decayTime: number;
}

export interface BagThudProfile {
  threshold: number;
  frequencyCenter: number;
  expectedDecay: number;
  tolerance: number;
  proximityMinimum: number;
  ambientFloor: number;
  environment: GymEnvironment;
  soundDetectionEnabled: boolean;
}

export interface ThudDevLog {
  rawVolume: number;
  filteredVolume: number;
  passedFrequencyFilter: boolean;
  attackTime: number;
  decayTime: number;
  passedShapeTest: boolean;
  abovePersonalThreshold: boolean;
  aboveProximityMinimum: boolean;
  inDeadZone: boolean;
  finalResult: "thud" | "rejected";
  rejectionReason: string;
}

export interface BagThudDetectorOptions {
  audioContext?: AudioContext;
  ownsAudioContext?: boolean;
  profile?: Partial<BagThudProfile>;
  /** Stricter thresholds during live combos when no bag profile exists. */
  strictSession?: boolean;
  devMode?: boolean;
  calibrating?: boolean;
  onThud?: (hit: BagThudHit) => void;
  onCalibrationHit?: (hit: BagThudHit) => void;
  onEnvironment?: (env: GymEnvironment, label: string) => void;
  onLevel?: (level: number) => void;
  onDevLog?: (log: ThudDevLog) => void;
}

const SAMPLE_MS = 8;
const AMBIENT_MS = 3000;
const DEAD_ZONE_MS = 100;
const FFT_SIZE = 2048;
const DEFAULT_FREQ_CENTER = 120;

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx] ?? 0;
}

export function detectEnvironment(ambientFloor: number): GymEnvironment {
  if (ambientFloor < 20) return "quiet";
  if (ambientFloor <= 50) return "normal";
  if (ambientFloor <= 80) return "loud";
  return "very_loud";
}

export function environmentLabel(env: GymEnvironment): string {
  switch (env) {
    case "quiet":
      return "Home mode — tuned for lighter impacts";
    case "normal":
      return "Gym mode — bag thud detection active";
    case "loud":
      return "Busy gym — sound + tap backup combined";
    case "very_loud":
      return "Loud environment — tap each punch for best results";
  }
}

export function buildBagProfileFromHits(
  hits: BagThudHit[],
  ambientFloor: number
): BagThudProfile | null {
  if (hits.length === 0) return null;

  const avgPeak = average(hits.map((h) => h.peakVolume));
  const avgFreq = average(hits.map((h) => h.peakFrequency));
  const avgDecay = average(hits.map((h) => h.decayTime));
  const threshold = avgPeak * 0.55;
  const environment = detectEnvironment(ambientFloor);

  return {
    threshold,
    frequencyCenter: avgFreq || DEFAULT_FREQ_CENTER,
    expectedDecay: avgDecay || 100,
    tolerance: 0.4,
    proximityMinimum: threshold * 0.7,
    ambientFloor,
    environment,
    soundDetectionEnabled: environment !== "very_loud",
  };
}

function hzToBin(hz: number, sampleRate: number, fftSize: number): number {
  return Math.floor((hz * fftSize) / sampleRate);
}

function binToHz(bin: number, sampleRate: number, fftSize: number): number {
  return (bin * sampleRate) / fftSize;
}

function bagBinRange(sampleRate: number, fftSize: number): { start: number; end: number } {
  const start = Math.max(1, hzToBin(80, sampleRate, fftSize));
  const end = Math.min(fftSize / 2, hzToBin(160, sampleRate, fftSize) + 1);
  return { start, end };
}

function readBagVolume(data: Uint8Array, start: number, end: number): number {
  let peak = 0;
  for (let i = start; i < end; i++) {
    if (data[i] > peak) peak = data[i];
  }
  return peak;
}

function readDominantFrequency(
  data: Uint8Array,
  start: number,
  end: number,
  sampleRate: number,
  fftSize: number
): number {
  let peak = 0;
  let peakBin = start;
  for (let i = start; i < end; i++) {
    if (data[i] > peak) {
      peak = data[i];
      peakBin = i;
    }
  }
  return binToHz(peakBin, sampleRate, fftSize);
}

function profileFromPartial(partial?: Partial<BagThudProfile>): BagThudProfile | null {
  if (!partial?.threshold) return null;
  const environment = partial.environment ?? detectEnvironment(partial.ambientFloor ?? 25);
  return {
    threshold: partial.threshold,
    frequencyCenter: partial.frequencyCenter ?? DEFAULT_FREQ_CENTER,
    expectedDecay: partial.expectedDecay ?? 100,
    tolerance: partial.tolerance ?? 0.4,
    proximityMinimum: partial.proximityMinimum ?? partial.threshold * 0.7,
    ambientFloor: partial.ambientFloor ?? 20,
    environment,
    soundDetectionEnabled:
      partial.soundDetectionEnabled ?? environment !== "very_loud",
  };
}

/** Isolated 60–200 Hz bag thud detector with shape validation. */
export class BagThudDetector {
  private readonly options: BagThudDetectorOptions;
  private audioContext: AudioContext | null = null;
  private ownsAudioContext = true;
  private source: MediaStreamAudioSourceNode | null = null;
  private highPass: BiquadFilterNode | null = null;
  private lowPass: BiquadFilterNode | null = null;
  private peaking: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private intervalId: number | null = null;
  private data: Uint8Array | null = null;
  private binStart = 4;
  private binEnd = 8;

  private profile: BagThudProfile | null = null;
  private ambientFloor = 15;
  private ambientSamples: number[] = [];
  private ambientDone = false;
  private ambientStartedAt = 0;

  private lastVolume = 0;
  private attackStartTime: number | null = null;
  private peakVolume = 0;
  private peakTime: number | null = null;
  private peakFrequency = DEFAULT_FREQ_CENTER;
  private isTracking = false;
  private deadZoneActive = false;
  private currentLevel = 0;
  private environment: GymEnvironment = "normal";

  constructor(options: BagThudDetectorOptions = {}) {
    this.options = options;
    this.profile = profileFromPartial(options.profile);
    if (this.profile) {
      this.ambientFloor = this.profile.ambientFloor;
      this.ambientDone = true;
      this.environment = this.profile.environment;
    }
  }

  getLevel(): number {
    return this.currentLevel;
  }

  getEnvironment(): GymEnvironment {
    return this.environment;
  }

  getProfile(): BagThudProfile | null {
    return this.profile;
  }

  isSoundDetectionEnabled(): boolean {
    if (this.profile) return this.profile.soundDetectionEnabled;
    return this.environment !== "very_loud";
  }

  buildProfileFromHits(hits: BagThudHit[]): BagThudProfile | null {
    const built = buildBagProfileFromHits(hits, this.ambientFloor);
    if (built) {
      this.profile = built;
      this.applyFrequencyCenter(built.frequencyCenter);
    }
    return built;
  }

  async start(stream: MediaStream): Promise<void> {
    this.stop();
    if (!stream.getAudioTracks().length) return;

    this.ownsAudioContext = this.options.ownsAudioContext ?? !this.options.audioContext;
    this.audioContext = this.options.audioContext ?? new AudioContext();
    await this.audioContext.resume();

    const sampleRate = this.audioContext.sampleRate;
    const range = bagBinRange(sampleRate, FFT_SIZE);
    this.binStart = range.start;
    this.binEnd = range.end;

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.highPass = this.audioContext.createBiquadFilter();
    this.highPass.type = "highpass";
    this.highPass.frequency.value = 60;

    this.lowPass = this.audioContext.createBiquadFilter();
    this.lowPass.type = "lowpass";
    this.lowPass.frequency.value = 200;

    this.peaking = this.audioContext.createBiquadFilter();
    this.peaking.type = "peaking";
    this.peaking.frequency.value = this.profile?.frequencyCenter ?? DEFAULT_FREQ_CENTER;
    this.peaking.Q.value = 1.2;
    this.peaking.gain.value = 12;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.1;

    this.source.connect(this.highPass);
    this.highPass.connect(this.lowPass);
    this.lowPass.connect(this.peaking);
    this.peaking.connect(this.analyser);

    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.ambientStartedAt = Date.now();
    if (!this.profile) {
      this.ambientDone = false;
      this.ambientSamples = [];
    }

    this.intervalId = window.setInterval(() => this.tick(), SAMPLE_MS);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.source?.disconnect();
    this.highPass?.disconnect();
    this.lowPass?.disconnect();
    this.peaking?.disconnect();
    this.source = null;
    this.highPass = null;
    this.lowPass = null;
    this.peaking = null;
    this.analyser = null;
    this.data = null;
    if (this.ownsAudioContext) {
      void this.audioContext?.close();
    }
    this.audioContext = null;
    this.resetTracking();
  }

  private applyFrequencyCenter(hz: number): void {
    if (this.peaking) {
      this.peaking.frequency.value = hz;
    }
  }

  private resetTracking(): void {
    this.isTracking = false;
    this.attackStartTime = null;
    this.peakVolume = 0;
    this.peakTime = null;
    this.peakFrequency = DEFAULT_FREQ_CENTER;
  }

  private personalThreshold(): number {
    const floor = Math.max(this.ambientFloor + 55, 70);
    if (this.profile) {
      return this.options.strictSession
        ? Math.max(this.profile.threshold, floor)
        : this.profile.threshold;
    }
    if (this.options.strictSession) {
      return floor;
    }
    return Math.max(this.ambientFloor + 35, 40);
  }

  private attackVolumeMin(): number {
    return this.options.strictSession
      ? this.ambientFloor + 45
      : this.ambientFloor + 30;
  }

  private attackMultiplier(): number {
    return this.options.strictSession ? 3.2 : 2.5;
  }

  private proximityMinimum(): number {
    if (this.profile) return this.profile.proximityMinimum;
    return this.personalThreshold() * 0.7;
  }

  private finishAmbient(): void {
    if (this.ambientDone) return;
    this.ambientFloor = Math.max(8, percentile(this.ambientSamples, 0.9));
    this.environment = detectEnvironment(this.ambientFloor);
    this.ambientDone = true;
    this.options.onEnvironment?.(this.environment, environmentLabel(this.environment));
  }

  private matchesProfile(hit: BagThudHit): boolean {
    if (!this.profile) return true;
    const freqDiff =
      Math.abs(hit.peakFrequency - this.profile.frequencyCenter) /
      Math.max(this.profile.frequencyCenter, 60);
    const decayDiff =
      Math.abs(hit.decayTime - this.profile.expectedDecay) /
      Math.max(this.profile.expectedDecay, 30);
    return freqDiff <= this.profile.tolerance && decayDiff <= this.profile.tolerance;
  }

  private emitDevLog(log: ThudDevLog): void {
    if (this.options.devMode) {
      console.debug("[fightflo:thud]", log);
    }
    this.options.onDevLog?.(log);
  }

  private confirmThud(hit: BagThudHit): void {
    if (this.deadZoneActive) return;
    if (!this.isSoundDetectionEnabled()) return;

    this.deadZoneActive = true;
    window.setTimeout(() => {
      this.deadZoneActive = false;
    }, DEAD_ZONE_MS);

    if (this.options.calibrating) {
      this.options.onCalibrationHit?.(hit);
    } else {
      this.options.onThud?.(hit);
    }
  }

  private tick(): void {
    if (!this.analyser || !this.data || !this.audioContext) return;

    this.analyser.getByteFrequencyData(this.data as Uint8Array<ArrayBuffer>);
    const currentVolume = readBagVolume(this.data, this.binStart, this.binEnd);
    const rawVolume = readBagVolume(this.data, 0, this.data.length / 4);
    this.currentLevel = Math.min(1, currentVolume / 255);
    this.options.onLevel?.(this.currentLevel);

    const now = Date.now();

    if (!this.ambientDone) {
      this.ambientSamples.push(currentVolume);
      if (now - this.ambientStartedAt >= AMBIENT_MS) {
        this.finishAmbient();
      }
      this.lastVolume = currentVolume;
      return;
    }

    if (this.deadZoneActive) {
      this.lastVolume = currentVolume;
      return;
    }

    let rejectionReason = "";
    let passedShapeTest = false;
    let abovePersonalThreshold = false;
    let aboveProximityMinimum = false;

    if (
      !this.isTracking &&
      currentVolume > this.attackVolumeMin() &&
      currentVolume > this.lastVolume * this.attackMultiplier() &&
      this.lastVolume > 0
    ) {
      this.isTracking = true;
      this.attackStartTime = now;
      this.peakVolume = currentVolume;
      this.peakTime = now;
      this.peakFrequency = readDominantFrequency(
        this.data,
        this.binStart,
        this.binEnd,
        this.audioContext.sampleRate,
        FFT_SIZE
      );
    }

    if (this.isTracking) {
      if (currentVolume > this.peakVolume) {
        this.peakVolume = currentVolume;
        this.peakTime = now;
        this.peakFrequency = readDominantFrequency(
          this.data,
          this.binStart,
          this.binEnd,
          this.audioContext.sampleRate,
          FFT_SIZE
        );
      }

      if (currentVolume < this.ambientFloor + 10 && this.attackStartTime != null && this.peakTime != null) {
        const attackTime = this.peakTime - this.attackStartTime;
        const decayTime = now - this.peakTime;
        const totalDuration = now - this.attackStartTime;

        passedShapeTest =
          attackTime < 15 &&
          decayTime < 200 &&
          decayTime > 30 &&
          totalDuration < 250;

        abovePersonalThreshold = this.peakVolume > this.personalThreshold();
        aboveProximityMinimum = this.peakVolume >= this.proximityMinimum();

        const hit: BagThudHit = {
          peakVolume: this.peakVolume,
          peakFrequency: this.peakFrequency,
          attackTime,
          decayTime,
        };

        if (!passedShapeTest) {
          rejectionReason = "shape";
        } else if (!aboveProximityMinimum) {
          rejectionReason = "proximity";
        } else if (!abovePersonalThreshold) {
          rejectionReason = "threshold";
        } else if (!this.matchesProfile(hit)) {
          rejectionReason = "profile";
        } else {
          this.emitDevLog({
            rawVolume,
            filteredVolume: currentVolume,
            passedFrequencyFilter: true,
            attackTime,
            decayTime,
            passedShapeTest: true,
            abovePersonalThreshold: true,
            aboveProximityMinimum: true,
            inDeadZone: false,
            finalResult: "thud",
            rejectionReason: "",
          });
          this.confirmThud(hit);
        }

        if (rejectionReason) {
          this.emitDevLog({
            rawVolume,
            filteredVolume: currentVolume,
            passedFrequencyFilter: true,
            attackTime,
            decayTime,
            passedShapeTest,
            abovePersonalThreshold,
            aboveProximityMinimum,
            inDeadZone: false,
            finalResult: "rejected",
            rejectionReason,
          });
        }

        this.resetTracking();
      }
    }

    this.lastVolume = currentVolume;
  }
}

export interface BagThudImpactOptions {
  bagProfile?: Partial<BagThudProfile>;
  threshold?: number;
  strictSession?: boolean;
  devMode?: boolean;
  onEnvironment?: (env: GymEnvironment, label: string) => void;
}

/** Session impact listener — returns cleanup. */
export function createBagThudImpactDetector(
  stream: MediaStream,
  audioContext: AudioContext,
  onImpact: () => void,
  options: BagThudImpactOptions = {}
): () => void {
  const profile = options.bagProfile
    ? profileFromPartial(options.bagProfile) ?? undefined
    : options.threshold != null
      ? profileFromPartial({
          threshold: options.threshold * 255,
          ambientFloor: 20,
        })
      : undefined;

  const detector = new BagThudDetector({
    audioContext,
    ownsAudioContext: false,
    profile: profile ?? undefined,
    strictSession: options.strictSession,
    devMode: options.devMode,
    onThud: () => onImpact(),
    onEnvironment: options.onEnvironment,
  });

  void detector.start(stream);

  return () => detector.stop();
}

export interface BagThudLevelMonitorOptions {
  peakThreshold?: number;
  bagProfile?: Partial<BagThudProfile>;
  onPeak?: () => void;
  onEnvironment?: (env: GymEnvironment, label: string) => void;
}

export function createBagThudLevelMonitor(
  stream: MediaStream,
  options: BagThudLevelMonitorOptions = {}
): { getLevel: () => number; stop: () => void } | null {
  if (!stream.getAudioTracks().length) return null;

  const thresholdNorm = options.peakThreshold ?? 0.18;
  const profile = options.bagProfile ?? {
    threshold: thresholdNorm * 255,
  };

  let cooldown = false;
  const detector = new BagThudDetector({
    profile,
    onLevel: () => {},
    onEnvironment: options.onEnvironment,
    onThud: () => {
      if (cooldown) return;
      cooldown = true;
      options.onPeak?.();
      window.setTimeout(() => {
        cooldown = false;
      }, DEAD_ZONE_MS);
    },
  });

  void detector.start(stream);

  return {
    getLevel: () => detector.getLevel(),
    stop: () => detector.stop(),
  };
}
