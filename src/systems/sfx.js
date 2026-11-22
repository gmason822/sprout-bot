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
    cheer() {
      [523, 659, 784, 1047].forEach((f, i) => {
        tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.3, delay: i * 0.11 });
      });
      tone({ freq: 1047, to: 1568, dur: 0.5, type: 'triangle', gain: 0.25, delay: 0.5 });
    },
  };
}
