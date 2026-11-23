// Sound effects, synthesized with Web Audio so the game needs no sound files.
// Swap these for recorded clips later; the function names are the interface.

// The noises content may name with "sound": in animals.json and rewards.json.
export const SOUND_NAMES = [
  'moo', 'cluck', 'oink', 'hoot', 'squeak', 'boing', 'quack', 'baa', 'bleat', 'woof',
  'neigh', 'meow', 'crow', 'gobble', 'hum', 'peep', 'honk',
];

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

  /**
   * One animal-like sound: a buzzy or pure tone whose pitch follows `pitch` (a list of
   * [fraction of the sound, Hz]), shaped by a filter standing in for a mouth, with an
   * optional wobble in pitch (`vibrato`) or loudness (`tremolo`).
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

  /** A short breath of noise, for a snort or the edge of a bark. */
  function puff({ dur = 0.08, freq = 1200, q = 1, gain = 0.2, delay = 0 }) {
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const length = Math.ceil(a.sampleRate * dur);
    const buffer = a.createBuffer(1, length, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = a.createBufferSource();
    source.buffer = buffer;
    const mouth = a.createBiquadFilter();
    mouth.type = 'bandpass';
    mouth.frequency.value = freq;
    mouth.Q.value = q;
    const level = a.createGain();
    level.gain.setValueAtTime(gain * volume, t0);
    level.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    source.connect(mouth).connect(level).connect(a.destination);
    source.start(t0);
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
    // ----- animal noises -----
    /** Play the noise called `name` (see SOUND_NAMES). Returns false if there is none. */
    animal(name) {
      if (!SOUND_NAMES.includes(name) || typeof this[name] !== 'function') return false;
      this[name]();
      return true;
    },
    /** Cow: one long low note that swells and sags. */
    moo() {
      voice({ pitch: [[0, 105], [0.18, 150], [0.7, 138], [1, 108]], dur: 1.15, gain: 0.38, attack: 0.14, release: 0.3, filter: { type: 'lowpass', freq: 650, q: 3 }, vibrato: { rate: 5, depth: 3 } });
    },
    /** Hen: "bok, bok, bok, ba-GAWK". */
    cluck() {
      [0, 0.14, 0.28].forEach((delay) => voice({ pitch: [[0, 520], [1, 400]], dur: 0.07, gain: 0.84, attack: 0.008, release: 0.04, delay, filter: { freq: 1500, q: 3 } }));
      voice({ pitch: [[0, 560], [0.35, 980], [1, 700]], dur: 0.26, gain: 0.9, attack: 0.01, delay: 0.46, filter: { freq: 1700, q: 2.5 } });
    },
    /** Pig: two rattling grunts with a snort in front. */
    oink() {
      [[0, 0.17], [0.26, 0.26]].forEach(([delay, dur]) => {
        puff({ dur: 0.05, freq: 1800, q: 2, gain: 0.18, delay });
        voice({ pitch: [[0, 190], [0.4, 240], [1, 130]], dur, gain: 0.68, attack: 0.02, delay, filter: { freq: 950, q: 1.6 }, tremolo: { rate: 46, depth: 0.85 } });
      });
    },
    /** Owl: "hoo... hoo-hoo". */
    hoot() {
      [[0, 0.3], [0.5, 0.16], [0.72, 0.42]].forEach(([delay, dur]) => {
        voice({ type: 'sine', pitch: [[0, 345], [0.2, 360], [1, 318]], dur, gain: 0.5, attack: 0.05, release: 0.12, delay });
      });
    },
    /** Mouse: three tiny squeaks. */
    squeak() {
      [0, 0.13, 0.3].forEach((delay, i) => voice({ type: 'sine', pitch: [[0, 2500], [0.4, 3700 + i * 200], [1, 3000]], dur: 0.09, gain: 0.31, attack: 0.01, release: 0.04, delay }));
    },
    /** Rabbit: rabbits are quiet, so it gets two springy hops. */
    boing() {
      [0, 0.24].forEach((delay) => voice({ type: 'sine', pitch: [[0, 190], [0.55, 560], [1, 420]], dur: 0.2, gain: 0.4, attack: 0.01, release: 0.1, delay, vibrato: { rate: 28, depth: 30 } }));
    },
    /** Duck: three nasal quacks, the last one longest. */
    quack() {
      [[0, 0.14], [0.2, 0.14], [0.4, 0.24]].forEach(([delay, dur]) => {
        voice({ pitch: [[0, 430], [0.25, 470], [1, 330]], dur, gain: 1.28, attack: 0.012, release: 0.06, delay, filter: { freq: 1250, q: 4 }, tremolo: { rate: 70, depth: 0.5 } });
      });
    },
    /** Sheep: one wobbly "baaa". */
    baa() {
      voice({ pitch: [[0, 300], [0.15, 335], [1, 290]], dur: 0.95, gain: 0.8, attack: 0.05, release: 0.2, filter: { freq: 1150, q: 2 }, vibrato: { rate: 9, depth: 20 }, tremolo: { rate: 9, depth: 0.6 } });
    },
    /** Goat: higher and shakier than the sheep. */
    bleat() {
      voice({ pitch: [[0, 420], [0.2, 470], [1, 400]], dur: 0.65, gain: 0.94, attack: 0.03, release: 0.15, filter: { freq: 1500, q: 2.5 }, vibrato: { rate: 14, depth: 34 }, tremolo: { rate: 14, depth: 0.7 } });
    },
    /** Dog: two barks. */
    woof() {
      [0, 0.3].forEach((delay) => {
        puff({ dur: 0.09, freq: 800, q: 0.8, gain: 0.21, delay });
        voice({ pitch: [[0, 300], [0.25, 340], [1, 140]], dur: 0.15, gain: 0.39, attack: 0.008, release: 0.07, delay, filter: { type: 'lowpass', freq: 1300, q: 2 } });
      });
    },
    /** Horse: a whinny that starts high and tumbles down. */
    neigh() {
      voice({ pitch: [[0, 650], [0.12, 1050], [0.5, 760], [1, 330]], dur: 1.1, gain: 0.61, attack: 0.04, release: 0.25, filter: { freq: 1700, q: 1.2 }, vibrato: { rate: 13, depth: 70 }, tremolo: { rate: 13, depth: 0.45 } });
    },
    /** Cat: "mee-ow", up and then down. */
    meow() {
      voice({ type: 'triangle', pitch: [[0, 520], [0.3, 840], [0.6, 760], [1, 470]], dur: 0.75, gain: 0.5, attack: 0.08, release: 0.22 });
      voice({ pitch: [[0, 520], [0.3, 840], [0.6, 760], [1, 470]], dur: 0.75, gain: 0.16, attack: 0.08, release: 0.22, filter: { freq: 1500, q: 2 } });
    },
    /** Rooster: "cock-a-doodle-doo". */
    crow() {
      [[0, 0.12, 620, 660], [0.17, 0.09, 720, 720], [0.31, 0.12, 660, 680], [0.47, 0.13, 860, 900]].forEach(([delay, dur, from, to]) => {
        voice({ pitch: [[0, from], [1, to]], dur, gain: 0.77, attack: 0.01, release: 0.04, delay, filter: { freq: 1600, q: 2 } });
      });
      voice({ pitch: [[0, 900], [0.15, 960], [1, 600]], dur: 0.6, gain: 0.82, attack: 0.02, release: 0.2, delay: 0.64, filter: { freq: 1600, q: 2 }, vibrato: { rate: 8, depth: 18 } });
    },
    /** Turkey: a quick tumbling gobble. */
    gobble() {
      for (let i = 0; i < 9; i++) {
        const hz = 720 - i * 42;
        voice({ pitch: [[0, hz], [1, hz * 0.8]], dur: 0.05, gain: 0.8, attack: 0.006, release: 0.025, delay: i * 0.062, filter: { freq: 1250, q: 2 } });
      }
    },
    /** Llama: a soft hum. */
    hum() {
      voice({ type: 'triangle', pitch: [[0, 225], [0.5, 270], [1, 235]], dur: 0.7, gain: 0.45, attack: 0.1, release: 0.25, filter: { type: 'lowpass', freq: 700, q: 1 } });
    },
    /** Chick: two peeps. */
    peep() {
      [0, 0.16].forEach((delay) => voice({ type: 'sine', pitch: [[0, 3100], [0.5, 4200], [1, 3700]], dur: 0.08, gain: 0.3, attack: 0.008, release: 0.04, delay }));
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
