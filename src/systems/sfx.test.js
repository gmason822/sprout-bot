import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { SOUND_NAMES, createSfx } from './sfx.js';
import { ANIMAL_CLIPS } from './animalClips.js';

const files = readdirSync(new URL('../../public/assets/audio/animals/', import.meta.url))
  .filter((f) => f.endsWith('.mp3'))
  .map((f) => f.slice(0, -4))
  .sort();

describe('the animal recordings', () => {
  it('match the table the game plays them from', () => {
    expect(Object.keys(ANIMAL_CLIPS).sort()).toEqual(files);
  });

  it('are short enough to wait for before a request is spoken', () => {
    for (const [name, seconds] of Object.entries(ANIMAL_CLIPS)) {
      expect(seconds, name).toBeGreaterThan(0.2);
      expect(seconds, name).toBeLessThanOrEqual(2);
    }
  });

  it('can all be named by content, along with the synthesized noises', () => {
    for (const name of [...files, 'boing', 'squeak', 'honk']) expect(SOUND_NAMES).toContain(name);
    expect(new Set(SOUND_NAMES).size).toBe(SOUND_NAMES.length);
  });
});

describe('every sound effect', () => {
  // Just enough of Web Audio for the effects to build themselves against.
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ frequency: param(), gain: param(), Q: param(), type: '', connect: (next) => next, start() {}, stop() {} });
  const context = () => ({ currentTime: 0, sampleRate: 22050, destination: node(), createOscillator: node, createGain: node, createBiquadFilter: node, resume() {} });

  it('can be played without an error', () => {
    const sfx = createSfx(context());
    for (const [name, effect] of Object.entries(sfx)) {
      if (name === 'animal' || name === 'setVolume') continue;
      expect(() => effect.call(sfx), name).not.toThrow();
    }
  });

  it('is silent, not broken, with the volume right down', () => {
    // Real Web Audio refuses an exponential ramp to zero.
    const strict = () => ({ ...param(), exponentialRampToValueAtTime(value) { if (!(Math.abs(value) > 1e-40)) throw new RangeError('ramp to zero'); } });
    const strictNode = () => ({ ...node(), frequency: strict(), gain: strict() });
    const sfx = createSfx({ ...context(), createOscillator: strictNode, createGain: strictNode });
    sfx.setVolume(0);
    for (const [name, effect] of Object.entries(sfx)) {
      if (name === 'animal' || name === 'setVolume') continue;
      expect(() => effect.call(sfx), name).not.toThrow();
    }
  });

  it('answers for every noise content can name, and for nothing else', () => {
    const sfx = createSfx(context());
    for (const name of SOUND_NAMES) expect(sfx.animal(name), name).toBeGreaterThan(100);
    expect(sfx.animal('roar')).toBe(0);
    expect(sfx.animal(undefined)).toBe(0);
  });
});
