import type { KeyValueStore } from '../core/storage';

/** Kleine 8-bit geluidjes met de Web Audio API. Standaard uit; de keuze wordt onthouden. */
export const SOUND_KEY = 'coredive:sound';

export interface Sound {
  readonly on: boolean;
  toggle(): boolean;
  /** Korte "krak" bij het indienen van een antwoord. */
  dig(): void;
  /** Toonladder die hoger eindigt naarmate de score beter is. */
  reveal(score: number): void;
}

export function createSound(store: KeyValueStore): Sound {
  let on = false;
  try {
    on = store.getItem(SOUND_KEY) === '1';
  } catch {
    on = false;
  }
  let ctx: AudioContext | null = null;

  function audio(): AudioContext | null {
    if (!on) return null;
    try {
      ctx ??= new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(
    freq: number,
    start: number,
    duration: number,
    type: OscillatorType = 'square',
    gain = 0.06,
  ) {
    const ac = audio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ac.currentTime + start;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(amp).connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  return {
    get on() {
      return on;
    },
    toggle() {
      on = !on;
      try {
        store.setItem(SOUND_KEY, on ? '1' : '0');
      } catch {
        // Negeren.
      }
      if (on) tone(660, 0, 0.08);
      return on;
    },
    dig() {
      const ac = audio();
      if (!ac) return;
      // Ruisstoot: een schep in de grond.
      const length = Math.floor(ac.sampleRate * 0.18);
      const buffer = ac.createBuffer(1, length, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const src = ac.createBufferSource();
      const amp = ac.createGain();
      amp.gain.value = 0.12;
      src.buffer = buffer;
      src.connect(amp).connect(ac.destination);
      src.start();
    },
    reveal(score) {
      const steps =
        score >= 950
          ? 5
          : score >= 800
            ? 4
            : score >= 600
              ? 3
              : score >= 300
                ? 2
                : score > 0
                  ? 1
                  : 0;
      if (steps === 0) {
        tone(196, 0, 0.25, 'triangle', 0.08);
        return;
      }
      const scale = [262, 330, 392, 523, 659, 784];
      for (let i = 0; i <= steps; i++) tone(scale[i]!, i * 0.09, 0.14);
    },
  };
}
