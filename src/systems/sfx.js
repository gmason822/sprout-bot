// Sound effects. Most are synthesized with Web Audio, so they need no files. The animal
// noises are real recordings (public/assets/audio/animals/, credited in CREDITS.md),
// because a synthesized moo does not sound like a cow.

import { ANIMAL_CLIPS } from './animalClips.js';

const ANIMAL_DIR = 'assets/audio/animals/';
// Noises with no recording: a rabbit is a quiet animal, so it gets a springy hop.
const SYNTHESIZED_MS = { boing: 450, squeak: 400, honk: 420 };

// The noises content may name with "sound": in animals.json and rewards.json.
export const SOUND_NAMES = [...Object.keys(ANIMAL_CLIPS), ...Object.keys(SYNTHESIZED_MS)];

/** `context` is only given when rendering the sounds to a file; the game leaves it out. */
export function createSfx(context = null) {
  let ctx = context;
  let volume = 0.5;

  const ac = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  };

  // One <audio> element per recording, made the first time it is needed.
  const recordings = new Map();
  function recording(name) {
    if (typeof Audio === 'undefined') return null;
    if (!recordings.has(name)) {
      const clip = new Audio(`${import.meta.env?.BASE_URL ?? './'}${ANIMAL_DIR}${name}.mp3`);
      clip.preload = 'auto';
      recordings.set(name, clip);
    }
    return recordings.get(name);
  }

  /**
   * A tone whose pitch follows `pitch` (a list of [fraction of the sound, Hz]), with
   * an optional filter, wobble in pitch (`vibrato`) or wobble in loudness (`tremolo`).
   */
  function voice({ pitch, dur, type = 'sawtooth', gain = 0.3, delay = 0, attack = 0.03, release = 0.08, filter = null, vibrato = null, tremolo = null }) {
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const end = t0 + dur;
    const osc = a.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(pitch[0][1], t0);
    for (const [at, hz] of pitch.slice(1)) osc.frequency.linearRampToValueAtTime(hz, t0 + at * dur);

    const level = a.createGain();
    const peak = gain * volume;
    level.gain.setValueAtTime(0.0001, t0);
    level.gain.linearRampToValueAtTime(peak, t0 + Math.min(attack, dur / 2));
    level.gain.setValueAtTime(peak, Math.max(t0 + attack, end - release));
    level.gain.linearRampToValueAtTime(0.0001, end);

    const lfo = (rate, depth, target) => {
      const wobble = a.createOscillator();
      const amount = a.createGain();
      wobble.frequency.value = rate;
      amount.gain.value = depth;
      wobble.connect(amount).connect(target);
      wobble.start(t0);
      wobble.stop(end + 0.05);
    };
    if (vibrato) lfo(vibrato.rate, vibrato.depth, osc.frequency);

    let node = osc;
    if (filter) {
      const mouth = a.createBiquadFilter();
      mouth.type = filter.type ?? 'bandpass';
      mouth.frequency.value = filter.freq;
      mouth.Q.value = filter.q ?? 1;
      node = node.connect(mouth);
    }
    if (tremolo) {
      // A second gain whose level swings around 1 makes the sound flutter or rattle.
      const flutter = a.createGain();
      flutter.gain.value = 1 - tremolo.depth / 2;
      lfo(tremolo.rate, tremolo.depth / 2, flutter.gain);
      node = node.connect(flutter);
    }
    node.connect(level).connect(a.destination);
    osc.start(t0);
    osc.stop(end + 0.05);
  }

  function tone({ freq, to = freq, dur = 0.15, type = 'sine', gain = 0.3, delay = 0 }) {
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * volume, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // C major scale, so each loaded apple climbs one note.
  const SCALE = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659];

  return {
    /** Call from the first tap: browsers start the audio context suspended. */
    unlock() {
      ac()?.resume?.();
      // Start fetching the recordings, so the first animal he taps answers at once.
      Object.keys(ANIMAL_CLIPS).forEach(recording);
    },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); },

    /** Loading thing number n (1-based). */
    pop(n = 1) {
      const f = SCALE[Math.min(SCALE.length - 1, Math.max(0, n - 1))];
      tone({ freq: f, to: f * 1.5, dur: 0.12, type: 'triangle' });
    },
    /** Taking one back out. */
    drop() { tone({ freq: 400, to: 180, dur: 0.18, type: 'triangle' }); },
    /** Gentle and silly, never a buzzer. */
    oops() {
      tone({ freq: 330, to: 262, dur: 0.18, type: 'sine' });
      tone({ freq: 262, to: 196, dur: 0.25, type: 'sine', delay: 0.18 });
    },
    /** Truck putter for `dur` seconds. */
    engine(dur = 0.7) {
      const puffs = Math.floor(dur / 0.09);
      for (let i = 0; i < puffs; i++) {
        tone({ freq: 70 + (i % 2) * 14, to: 55, dur: 0.08, type: 'sawtooth', gain: 0.18, delay: i * 0.09 });
      }
    },
    honk() {
      tone({ freq: 392, dur: 0.14, type: 'square', gain: 0.15 });
      tone({ freq: 392, dur: 0.22, type: 'square', gain: 0.15, delay: 0.2 });
    },
    /** The robot's hello. */
    beepBoop() {
      tone({ freq: 880, dur: 0.12, type: 'square', gain: 0.12 });
      tone({ freq: 587, dur: 0.18, type: 'square', gain: 0.12, delay: 0.16 });
    },
    /** LEFT always sounds like this low boop... */
    left() { tone({ freq: 233, to: 196, dur: 0.22, type: 'square', gain: 0.14 }); },
    /** ...and RIGHT always like this high beep. */
    right() { tone({ freq: 784, to: 880, dur: 0.16, type: 'square', gain: 0.12 }); },
    // ----- animal noises -----
    /**
     * Play the noise called `name` (see SOUND_NAMES). Returns how long it lasts in
     * milliseconds, so a caller can wait before speaking, or 0 if there is no such noise.
     */
    animal(name) {
      if (ANIMAL_CLIPS[name]) {
        const clip = recording(name);
        if (clip) {
          clip.currentTime = 0;
          // Recordings are quieter than the synthesized effects at the same setting.
          clip.volume = Math.min(1, volume * 1.5);
          clip.play()?.catch?.(() => {});
        }
        return Math.round(ANIMAL_CLIPS[name] * 1000);
      }
      if (!SYNTHESIZED_MS[name]) return 0;
      this[name]();
      return SYNTHESIZED_MS[name];
    },
    /** The barn's cow and the hen house use the same recordings as the animals. */
    moo() { this.animal('moo'); },
    cluck() { this.animal('cluck'); },
    /** Mouse: three tiny squeaks. */
    squeak() {
      [0, 0.13, 0.3].forEach((delay, i) => voice({ type: 'sine', pitch: [[0, 2500], [0.4, 3700 + i * 200], [1, 3000]], dur: 0.09, gain: 0.31, attack: 0.01, release: 0.04, delay }));
    },
    /** Rabbit: two springy hops. */
    boing() {
      [0, 0.24].forEach((delay) => voice({ type: 'sine', pitch: [[0, 190], [0.55, 560], [1, 420]], dur: 0.2, gain: 0.4, attack: 0.01, release: 0.1, delay, vibrato: { rate: 28, depth: 30 } }));
    },
    // ----- the home farm's toys -----
    splash() {
      [900, 700, 1100, 600, 800].forEach((f, i) => tone({ freq: f, to: f * 0.5, dur: 0.09, type: 'sine', gain: 0.14, delay: i * 0.04 }));
    },
    creak() { tone({ freq: 210, to: 330, dur: 0.4, type: 'sawtooth', gain: 0.1 }); },
    whoosh() {
      tone({ freq: 260, to: 900, dur: 0.45, type: 'sine', gain: 0.12 });
      tone({ freq: 900, to: 300, dur: 0.6, type: 'sine', gain: 0.12, delay: 0.45 });
    },
    buzz() {
      for (let i = 0; i < 7; i++) tone({ freq: 190 + (i % 2) * 22, to: 205, dur: 0.11, type: 'sawtooth', gain: 0.08, delay: i * 0.1 });
    },
    caw() {
      tone({ freq: 620, to: 430, dur: 0.16, type: 'square', gain: 0.1 });
      tone({ freq: 600, to: 400, dur: 0.2, type: 'square', gain: 0.1, delay: 0.22 });
    },
    rain() {
      for (let i = 0; i < 26; i++) tone({ freq: 1400 + (i * 137) % 900, to: 900, dur: 0.04, type: 'sine', gain: 0.05, delay: i * 0.07 });
    },
    rustle() {
      for (let i = 0; i < 6; i++) tone({ freq: 1100 + (i % 3) * 300, to: 500, dur: 0.05, type: 'triangle', gain: 0.07, delay: i * 0.05 });
    },
    thud() { tone({ freq: 140, to: 70, dur: 0.12, type: 'sine', gain: 0.25 }); },
    chime() {
      [784, 988, 1175].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.14, delay: i * 0.09 }));
    },
    cheer() {
      [523, 659, 784, 1047].forEach((f, i) => {
        tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.3, delay: i * 0.11 });
      });
      tone({ freq: 1047, to: 1568, dur: 0.5, type: 'triangle', gain: 0.25, delay: 0.5 });
    },
  };
}
