// Sound effects, synthesized with Web Audio so Milestone 1 needs no sound files.
// Swap these for Kenney clips later; the function names are the interface.

export function createSfx() {
  let ctx = null;
  let volume = 0.5;

  const ac = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  };

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
    unlock() { ac()?.resume?.(); },
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
    // ----- the home farm's toys -----
    moo() {
      tone({ freq: 150, to: 118, dur: 0.55, type: 'sawtooth', gain: 0.2 });
      tone({ freq: 118, to: 140, dur: 0.35, type: 'sawtooth', gain: 0.16, delay: 0.5 });
    },
    cluck() {
      [0, 0.11, 0.22, 0.4].forEach((d, i) => tone({ freq: i === 3 ? 700 : 520, to: i === 3 ? 900 : 430, dur: 0.07, type: 'square', gain: 0.1, delay: d }));
    },
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
