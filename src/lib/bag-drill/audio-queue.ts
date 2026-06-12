"use client";

const MAX_QUEUE = 2;

interface QueueItem {
  file: string;
  onEnd?: () => void;
}

let queue: QueueItem[] = [];
let isPlaying = false;
let currentAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

function stopCurrent(): void {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
}

function playFile(file: string, onEnd?: () => void): void {
  stopCurrent();
  const audio = new Audio(`/audio/${file}`);
  audio.volume = 1;
  currentAudio = audio;
  const finish = () => {
    currentAudio = null;
    onEnd?.();
  };
  audio.onended = finish;
  audio.onerror = finish;
  void audio.play().catch(finish);
}

function playNext(): void {
  const item = queue.shift();
  if (!item) {
    isPlaying = false;
    return;
  }
  isPlaying = true;
  playFile(item.file, () => {
    item.onEnd?.();
    playNext();
  });
}

/** Unlock audio on iOS — call once after user gesture */
export async function unlockBagAudio(): Promise<void> {
  if (audioUnlocked || typeof window === "undefined") return;
  const audio = new Audio("/audio/silent.mp3");
  audio.volume = 0.01;
  try {
    await audio.play();
    audioUnlocked = true;
  } catch {
    /* needs user gesture */
  }
}

export function queueAudio(
  file: string,
  options?: { onEnd?: () => void }
): void {
  if (typeof window === "undefined") {
    options?.onEnd?.();
    return;
  }
  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push({ file, onEnd: options?.onEnd });
  if (!isPlaying) playNext();
}

/** Guard drop — interrupts queue immediately, then resumes drained queue */
export function interruptAudio(file: string): void {
  if (typeof window === "undefined") return;
  const pending = [...queue];
  queue = [];
  stopCurrent();
  isPlaying = true;
  playFile(file, () => {
    queue = pending.slice(0, MAX_QUEUE);
    if (queue.length > 0) playNext();
    else isPlaying = false;
  });
}

export function stopBagAudio(): void {
  stopCurrent();
  queue = [];
  isPlaying = false;
}

export function isBagAudioPlaying(): boolean {
  return isPlaying;
}
