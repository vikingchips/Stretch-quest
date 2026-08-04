/**
 * All cues are synthesized with the Web Audio API — no audio files.
 * The AudioContext must be created from a user gesture (the Start tap).
 */
let ctx: AudioContext | null = null;

export function initAudio(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  try {
    ctx = new AudioContext();
  } catch {
    ctx = null;
  }
}

function beep(frequency: number, durationMs: number, startInMs = 0, volume = 0.25): void {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + startInMs / 1000;
  const t1 = t0 + durationMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.setValueAtTime(volume, t1 - 0.03);
  gain.gain.linearRampToValueAtTime(0, t1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t1 + 0.01);
}

/** Short tick for the 3-2-1 countdown at the end of a segment. */
export function playCountdownTick(): void {
  beep(880, 80);
}

/** A segment (stretch/rest) has begun. */
export function playSegmentStart(): void {
  beep(660, 150);
}

/** Switch sides: quick double beep. */
export function playSideSwitch(): void {
  beep(740, 90);
  beep(740, 90, 140);
}

/** Session complete: ascending C-E-G arpeggio. */
export function playComplete(): void {
  beep(523.25, 130);
  beep(659.25, 130, 150);
  beep(783.99, 220, 300);
}
