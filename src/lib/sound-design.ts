import type { RhythmSegment, SignalType } from "./types";

/** Audio intensity tier — drives dynamic layering */
export type SoundIntensity = "calm" | "medium" | "high" | "chaos";

const INTENSITY_GAIN: Record<SoundIntensity, number> = {
  calm: 0.82,
  medium: 0.92,
  high: 1.0,
  chaos: 1.08,
};

export function segmentToIntensity(
  segment?: RhythmSegment | null
): SoundIntensity {
  switch (segment) {
    case "explosive":
    case "grind":
      return "chaos";
    case "pressure":
      return "high";
    case "feint":
    case "counter":
      return "medium";
    case "reading":
    case "probing":
    case "reset":
    case "defensive":
    default:
      return "calm";
  }
}

export function signalBaseIntensity(type: SignalType): SoundIntensity {
  if (type === "burnout" || type === "pressure") return "high";
  if (type === "attack") return "medium";
  return "calm";
}

export function mergeIntensity(
  segment?: RhythmSegment | null,
  type?: SignalType
): SoundIntensity {
  const fromSegment = segmentToIntensity(segment);
  const fromSignal = type ? signalBaseIntensity(type) : "calm";
  const order: SoundIntensity[] = ["calm", "medium", "high", "chaos"];
  return order[Math.max(order.indexOf(fromSegment), order.indexOf(fromSignal))];
}

export interface SynthBus {
  ctx: AudioContext;
  master: GainNode;
  dry: GainNode;
  wet: GainNode;
  reverb: ConvolverNode;
}

export function createSynthBus(ctx: AudioContext, master: GainNode): SynthBus {
  const dry = ctx.createGain();
  dry.gain.value = 0.88;

  const wet = ctx.createGain();
  wet.gain.value = 0.14;

  const reverb = ctx.createConvolver();
  reverb.buffer = createReverbImpulse(ctx, 1.1, 2.8);
  reverb.connect(wet);
  wet.connect(master);
  dry.connect(master);

  return { ctx, master, dry, wet, reverb };
}

function createReverbImpulse(
  ctx: AudioContext,
  duration: number,
  decay: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

interface ToneLayer {
  freq: number;
  type?: OscillatorType;
  gain: number;
  duration: number;
  attack?: number;
  filterFreq?: number;
  filterQ?: number;
  pitchSlide?: number;
  sub?: boolean;
}

function connectLayer(
  bus: SynthBus,
  layer: ToneLayer,
  when: number,
  intensity: SoundIntensity
): void {
  const { ctx, dry, reverb } = bus;
  const scale = INTENSITY_GAIN[intensity];
  const attack = layer.attack ?? 0.003;
  const end = when + layer.duration;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(layer.filterFreq ?? 2400, when);
  filter.Q.setValueAtTime(layer.filterQ ?? 0.7, when);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(layer.gain * scale, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  const osc = ctx.createOscillator();
  osc.type = layer.type ?? "triangle";
  osc.frequency.setValueAtTime(layer.freq, when);
  if (layer.pitchSlide) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, layer.freq * layer.pitchSlide),
      end
    );
  }

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dry);
  gain.connect(reverb);

  osc.start(when);
  osc.stop(end + 0.04);

  if (layer.sub) {
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(layer.freq * 0.5, when);
    subGain.gain.setValueAtTime(0.0001, when);
    subGain.gain.linearRampToValueAtTime(layer.gain * 0.55 * scale, when + attack);
    subGain.gain.exponentialRampToValueAtTime(0.0001, end);
    sub.connect(subGain);
    subGain.connect(dry);
    sub.start(when);
    sub.stop(end + 0.04);
  }
}

function playTransient(
  bus: SynthBus,
  when: number,
  intensity: SoundIntensity,
  brightness = 1800
): void {
  const { ctx, dry, reverb } = bus;
  const scale = INTENSITY_GAIN[intensity];
  const bufferSize = Math.floor(ctx.sampleRate * 0.018);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.08));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = brightness;
  filter.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.22 * scale, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.02);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(dry);
  gain.connect(reverb);
  source.start(when);
}

/** Deep tactical training beep — classic timer DNA, modern body */
export function synthTrainingBeep(
  bus: SynthBus,
  when: number,
  freq: number,
  duration: number,
  gain: number,
  intensity: SoundIntensity = "medium"
): void {
  connectLayer(bus, {
    freq,
    type: "triangle",
    gain,
    duration,
    attack: 0.002,
    filterFreq: 1800,
    sub: true,
  }, when, intensity);
}

export function synthAttackSignal(
  bus: SynthBus,
  when: number,
  intensity: SoundIntensity
): void {
  playTransient(bus, when, intensity, 2200);
  synthTrainingBeep(bus, when, 248, 0.11, 0.78, intensity);
  connectLayer(bus, {
    freq: 496,
    type: "sine",
    gain: 0.22,
    duration: 0.06,
    attack: 0.001,
    filterFreq: 3200,
  }, when + 0.018, intensity);
}

export function synthDefendSignal(
  bus: SynthBus,
  when: number,
  intensity: SoundIntensity
): void {
  const alert = intensity === "chaos" ? 520 : 468;
  synthTrainingBeep(bus, when, alert, 0.09, 0.62, intensity);
  synthTrainingBeep(bus, when + 0.11, alert * 1.04, 0.08, 0.58, intensity);
  connectLayer(bus, {
    freq: alert * 0.75,
    type: "sine",
    gain: 0.18,
    duration: 0.14,
    attack: 0.004,
    filterFreq: 1400,
    pitchSlide: 0.92,
  }, when, intensity);
}

export function synthMoveSignal(
  bus: SynthBus,
  when: number,
  intensity: SoundIntensity
): void {
  connectLayer(bus, {
    freq: 340,
    type: "sine",
    gain: 0.42,
    duration: 0.1,
    attack: 0.006,
    filterFreq: 1200,
    pitchSlide: 1.08,
  }, when, intensity);
  connectLayer(bus, {
    freq: 420,
    type: "triangle",
    gain: 0.28,
    duration: 0.12,
    attack: 0.008,
    filterFreq: 1600,
    pitchSlide: 1.12,
  }, when + 0.09, intensity);
}

export function synthBurnoutSignal(
  bus: SynthBus,
  when: number,
  intensity: SoundIntensity
): void {
  const tier = intensity === "calm" ? "high" : "chaos";
  playTransient(bus, when, tier, 900);
  connectLayer(bus, {
    freq: 92,
    type: "sawtooth",
    gain: 0.38,
    duration: 0.28,
    attack: 0.002,
    filterFreq: 420,
    sub: true,
  }, when, tier);
  [0, 0.09, 0.18].forEach((offset, i) => {
    synthTrainingBeep(
      bus,
      when + 0.22 + offset,
      280 + i * 40,
      0.07,
      0.55 + i * 0.06,
      tier
    );
  });
}

export function synthPressureSignal(
  bus: SynthBus,
  when: number,
  intensity: SoundIntensity
): void {
  const tier = intensity === "calm" ? "high" : "chaos";
  connectLayer(bus, {
    freq: 110,
    type: "sawtooth",
    gain: 0.32,
    duration: 0.35,
    attack: 0.001,
    filterFreq: 380,
    sub: true,
  }, when, tier);
  [0, 0.07, 0.14, 0.21].forEach((offset, i) => {
    playTransient(bus, when + offset, tier, 1600 + i * 200);
    synthTrainingBeep(
      bus,
      when + offset,
      310 + i * 25,
      0.06,
      0.52,
      tier
    );
  });
}

export function synthResetSignal(
  bus: SynthBus,
  when: number,
  intensity: SoundIntensity
): void {
  connectLayer(bus, {
    freq: 380,
    type: "sine",
    gain: 0.38,
    duration: 0.2,
    attack: 0.008,
    filterFreq: 1400,
    pitchSlide: 0.82,
  }, when, intensity);
  connectLayer(bus, {
    freq: 290,
    type: "triangle",
    gain: 0.32,
    duration: 0.24,
    attack: 0.01,
    filterFreq: 1100,
    pitchSlide: 0.78,
  }, when + 0.16, intensity);
}

export function synthNeutralTick(
  bus: SynthBus,
  when: number
): void {
  synthTrainingBeep(bus, when, 220, 0.05, 0.28, "calm");
}

export function synthCountdownStep(
  bus: SynthBus,
  when: number,
  step: 3 | 2 | 1
): void {
  const freqs: Record<3 | 2 | 1, number> = { 3: 176, 2: 208, 1: 248 };
  playTransient(bus, when, "medium", 1400);
  synthTrainingBeep(bus, when, freqs[step], 0.14, 0.68, "medium");
}

export function synthGoSignal(bus: SynthBus, when: number): void {
  connectLayer(bus, {
    freq: 62,
    type: "sine",
    gain: 0.45,
    duration: 0.35,
    attack: 0.004,
    filterFreq: 280,
    pitchSlide: 1.35,
    sub: true,
  }, when, "high");
  synthTrainingBeep(bus, when + 0.04, 280, 0.18, 0.82, "high");
  synthTrainingBeep(bus, when + 0.12, 352, 0.22, 0.72, "high");
}

export function synthRoundTick(bus: SynthBus, when: number): void {
  synthTrainingBeep(bus, when, 196, 0.04, 0.22, "calm");
}

export function synthRoundStart(bus: SynthBus, when: number): void {
  connectLayer(bus, {
    freq: 48,
    type: "sine",
    gain: 0.5,
    duration: 0.55,
    attack: 0.012,
    filterFreq: 320,
    pitchSlide: 1.6,
    sub: true,
  }, when, "high");

  const partials = [
    { freq: 620, gain: 0.55, decay: 0.9 },
    { freq: 930, gain: 0.32, decay: 0.75 },
    { freq: 1240, gain: 0.18, decay: 0.55 },
  ];

  partials.forEach(({ freq, gain, decay }) => {
    connectLayer(bus, {
      freq,
      type: "sine",
      gain,
      duration: decay,
      attack: 0.003,
      filterFreq: 4200,
    }, when + 0.08, "high");
  });
}

export function synthRoundEnd(bus: SynthBus, when: number): void {
  [0, 0.48].forEach((offset, i) => {
    const partials = [
      { freq: 740 - i * 40, gain: 0.5 },
      { freq: 1110 - i * 60, gain: 0.28 },
      { freq: 1480 - i * 80, gain: 0.16 },
    ];
    partials.forEach(({ freq, gain }) => {
      connectLayer(bus, {
        freq,
        type: "sine",
        gain,
        duration: 1.35 - i * 0.15,
        attack: 0.004,
        filterFreq: 3600,
      }, when + offset, "medium");
    });
  });
  connectLayer(bus, {
    freq: 55,
    type: "sine",
    gain: 0.28,
    duration: 0.8,
    attack: 0.02,
    filterFreq: 200,
    pitchSlide: 0.85,
  }, when + 0.5, "calm");
}

export function synthTrainerClap(bus: SynthBus, when: number): void {
  const { ctx, dry, reverb } = bus;
  const bufferSize = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400;
  filter.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.32, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(dry);
  gain.connect(reverb);
  source.start(when);
}

export function synthBagImpact(bus: SynthBus, when: number): void {
  playTransient(bus, when, "medium", 600);
  connectLayer(bus, {
    freq: 78,
    type: "sine",
    gain: 0.42,
    duration: 0.14,
    attack: 0.001,
    filterFreq: 280,
    sub: true,
  }, when, "medium");
}

export function synthComboStinger(
  bus: SynthBus,
  when: number,
  intensity: SoundIntensity
): void {
  playTransient(bus, when, intensity, 2000);
  synthTrainingBeep(bus, when, 272, 0.09, 0.62, intensity);
  connectLayer(bus, {
    freq: 544,
    type: "sine",
    gain: 0.16,
    duration: 0.05,
    attack: 0.001,
    filterFreq: 2800,
  }, when + 0.015, intensity);
}

export function playSignalSound(
  bus: SynthBus,
  type: SignalType,
  when: number,
  intensity: SoundIntensity
): void {
  switch (type) {
    case "attack":
      synthAttackSignal(bus, when, intensity);
      break;
    case "defend":
      synthDefendSignal(bus, when, intensity);
      break;
    case "move":
      synthMoveSignal(bus, when, intensity);
      break;
    case "burnout":
      synthBurnoutSignal(bus, when, intensity);
      break;
    case "pressure":
      synthPressureSignal(bus, when, intensity);
      break;
    case "reset":
      synthResetSignal(bus, when, intensity);
      break;
  }
}
