import type { AudioSettings, CueStyle, RhythmSegment, SignalCueMode, SignalType } from "./types";
import {
  createSynthBus,
  mergeIntensity,
  playSignalSound,
  synthCountdownStep,
  synthGoSignal,
  synthNeutralTick,
  synthRoundEnd,
  synthRoundStart,
  synthRoundTick,
  synthTrainerClap,
  synthBagImpact,
  type SynthBus,
} from "./sound-design";
import { speakCoachLine, stopCoachVoice, type CoachSpeakHooks } from "./coach-voice";
import { getSignalLabel } from "./i18n";
import { getVoiceLanguage } from "./voice";

type AmbienceType = "crowd" | "gym" | null;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private synthBus: SynthBus | null = null;
  private ambienceNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private ambienceGain: GainNode | null = null;
  private bagImpactTimer: ReturnType<typeof setInterval> | null = null;
  private currentSegment: RhythmSegment | null = null;
  private settings: AudioSettings = {
    crowdAmbience: false,
    gymAmbience: true,
    trainerClaps: true,
    masterVolume: 0.85,
    signalCueMode: "learn",
  };
  private unlocked = false;

  async unlock(): Promise<void> {
    if (this.unlocked && this.ctx?.state === "running") return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.synthBus = createSynthBus(this.ctx, this.masterGain);
      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.connect(this.masterGain);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.unlocked = true;
    this.applyVolume();
  }

  setSettings(settings: AudioSettings): void {
    this.settings = settings;
    this.applyVolume();
    this.updateAmbience();
  }

  /** Track rhythm segment so signal timbre evolves with round pacing */
  setRoundIntensity(segment?: RhythmSegment | null): void {
    this.currentSegment = segment ?? null;
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private requireBus(): SynthBus | null {
    if (!this.ctx || !this.synthBus) return null;
    return this.synthBus;
  }

  private applyVolume(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume;
    }
    if (this.ambienceGain) {
      this.ambienceGain.gain.value = 0.045;
    }
  }

  playSignalBeep(type: SignalType, segment?: RhythmSegment | null): void {
    const bus = this.requireBus();
    if (!bus) return;
    playSignalSound(
      bus,
      type,
      this.now(),
      mergeIntensity(segment ?? this.currentSegment, type)
    );
  }

  playNeutralTick(): void {
    const bus = this.requireBus();
    if (!bus) return;
    synthNeutralTick(bus, this.now());
  }

  playComboCue(
    speak: string,
    segment?: RhythmSegment | null,
    hooks?: CoachSpeakHooks
  ): void {
    speakCoachLine(speak, this.settings.masterVolume, getVoiceLanguage(), hooks);
  }

  /** Preview a signal — clear mode uses coach voice, advanced uses beep */
  previewSignal(type: SignalType, cueStyle: CueStyle = "advanced"): void {
    if (cueStyle === "clear") {
      speakCoachLine(
        getSignalLabel(type, getVoiceLanguage()),
        this.settings.masterVolume
      );
      return;
    }
    this.playSignalBeep(type, this.currentSegment);
  }

  playSignalCue(
    type: SignalType,
    mode: SignalCueMode,
    alreadyVoiced: boolean,
    cueStyle: CueStyle = "clear",
    segment?: RhythmSegment | null,
    hooks?: CoachSpeakHooks
  ): boolean {
    const label = getSignalLabel(type, getVoiceLanguage());

    if (cueStyle === "clear") {
      speakCoachLine(label, this.settings.masterVolume, getVoiceLanguage(), hooks);
      return true;
    }

    const modeSetting = mode ?? this.settings.signalCueMode;
    const useVoice =
      modeSetting === "voice" ||
      (modeSetting === "learn" && !alreadyVoiced);

    if (useVoice) {
      speakCoachLine(label, this.settings.masterVolume, getVoiceLanguage(), hooks);
      return true;
    }

    this.playSignalBeep(type, segment);
    hooks?.onStart?.();
    return false;
  }

  playCountdownStep(step: 3 | 2 | 1): void {
    const bus = this.requireBus();
    if (!bus) return;
    synthCountdownStep(bus, this.now(), step);
  }

  playGo(): void {
    const bus = this.requireBus();
    if (!bus) return;
    synthGoSignal(bus, this.now());
  }

  playRoundTick(): void {
    const bus = this.requireBus();
    if (!bus) return;
    synthRoundTick(bus, this.now());
  }

  playRoundBell(): void {
    const bus = this.requireBus();
    if (!bus) return;
    synthRoundEnd(bus, this.now());
  }

  playRoundStartBell(): void {
    const bus = this.requireBus();
    if (!bus) return;
    synthRoundStart(bus, this.now());
  }

  playTrainerClap(): void {
    const bus = this.requireBus();
    if (!bus || !this.settings.trainerClaps) return;
    synthTrainerClap(bus, this.now());
  }

  startAmbience(): void {
    this.updateAmbience();
  }

  stopAmbience(): void {
    this.stopAll();
    this.clearAmbienceNodes();
    if (this.bagImpactTimer) {
      clearInterval(this.bagImpactTimer);
      this.bagImpactTimer = null;
    }
  }

  stopAll(): void {
    stopCoachVoice();
  }

  private clearAmbienceNodes(): void {
    this.ambienceNodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    });
    this.ambienceNodes = [];
  }

  private updateAmbience(): void {
    this.clearAmbienceNodes();
    if (this.bagImpactTimer) {
      clearInterval(this.bagImpactTimer);
      this.bagImpactTimer = null;
    }

    if (!this.ctx || !this.ambienceGain) return;

    const type: AmbienceType = this.settings.crowdAmbience
      ? "crowd"
      : this.settings.gymAmbience
        ? "gym"
        : null;

    if (!type) return;

    if (type === "gym") {
      this.startGymAmbience();
    } else {
      this.startCrowdAmbience();
    }
  }

  /** Subtle gym room tone + distant bag impacts */
  private startGymAmbience(): void {
    if (!this.ctx || !this.ambienceGain) return;

    const hum = this.ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 48;
    const humGain = this.ctx.createGain();
    humGain.gain.value = 0.07;

    const breathLfo = this.ctx.createOscillator();
    breathLfo.type = "sine";
    breathLfo.frequency.value = 0.14;
    const breathGain = this.ctx.createGain();
    breathGain.gain.value = 0.018;
    breathLfo.connect(breathGain);
    breathGain.connect(humGain.gain);

    hum.connect(humGain);
    humGain.connect(this.ambienceGain);
    hum.start();
    breathLfo.start();
    this.ambienceNodes.push(hum, breathLfo);

    const room = this.createNoiseBuffer(2.5, "brown");
    const roomSource = this.ctx.createBufferSource();
    roomSource.buffer = room;
    roomSource.loop = true;

    const roomFilter = this.ctx.createBiquadFilter();
    roomFilter.type = "lowpass";
    roomFilter.frequency.value = 180;

    const roomGain = this.ctx.createGain();
    roomGain.gain.value = 0.035;

    roomSource.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(this.ambienceGain);
    roomSource.start();
    this.ambienceNodes.push(roomSource);

    this.scheduleBagImpacts();
  }

  /** Faint stadium wash — very subtle */
  private startCrowdAmbience(): void {
    if (!this.ctx || !this.ambienceGain) return;

    const crowd = this.createNoiseBuffer(3, "pink");
    const source = this.ctx.createBufferSource();
    source.buffer = crowd;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.4;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.028;

    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.22;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambienceGain);
    source.start();
    lfo.start();
    this.ambienceNodes.push(source, lfo);
  }

  private scheduleBagImpacts(): void {
    const fireImpact = () => {
      if (!this.settings.gymAmbience || !this.synthBus) return;
      synthBagImpact(this.synthBus, this.now());
    };

    fireImpact();
    this.bagImpactTimer = setInterval(() => {
      if (Math.random() < 0.55) fireImpact();
    }, 12000);
  }

  private createNoiseBuffer(
    duration: number,
    color: "pink" | "brown"
  ): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === "pink") {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        data[i] = (b0 + white * 0.02) * 0.25;
        b0 = data[i];
      }
    }
    return buffer;
  }

  destroy(): void {
    this.stopAmbience();
    this.ctx?.close();
    this.ctx = null;
    this.synthBus = null;
    this.unlocked = false;
  }
}

export const audioEngine = new AudioEngine();
