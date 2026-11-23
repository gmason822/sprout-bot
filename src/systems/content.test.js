import { describe, it, expect, vi } from 'vitest';
import { validateContent, loadContent } from './content.js';
import { GENERATOR_IDS } from '../skills/index.js';

const good = () => ({
  letters: { letters: [{ id: 'B' }, { id: 'C', sameSoundAs: ['K'] }, { id: 'K', sameSoundAs: ['C'] }] },
  skills: { skills: [
    { id: 'count', answer: 'count', tiers: [{ id: 'a', min: 1, max: 5 }, { id: 'b', min: 1, max: 10, unlockAfter: 'a' }] },
    { id: 'letters', answer: 'pick', tiers: [{ id: 'letter-name' }, { id: 'letter-sound', perItemAfter: 'letter-name' }] },
  ] },
  animals: { animals: [{ id: 'hen', skill: 'count' }, { id: 'cow', skill: 'letters' }] },
  rewards: { rewards: [{ id: 'r1', type: 'friend', emoji: '🦆', day: 1 }, { id: 'p1', type: 'paint', value: '#fff', day: 3 }] },
});
const GEN = ['count', 'letters', 'leftright'];

describe('validateContent', () => {
  it('accepts good content untouched', () => {
    const { content, errors } = validateContent(good(), GEN);
    expect(errors).toEqual([]);
    expect(content.animals).toHaveLength(2);
    expect(content.skills).toHaveLength(2);
    expect(content.letters).toHaveLength(3);
    expect(content.rewards).toHaveLength(2);
  });

  it('skips a skill with no generator, and the animal that owns it', () => {
    const raw = good();
    raw.skills.skills.push({ id: 'shapes', answer: 'pick', tiers: [{ id: 't' }] });
    raw.animals.animals.push({ id: 'owl', skill: 'shapes' });
    const { content, errors } = validateContent(raw, GEN);
    expect(content.skills.map((s) => s.id)).toEqual(['count', 'letters']);
    expect(content.animals.map((a) => a.id)).toEqual(['hen', 'cow']);
    expect(errors).toHaveLength(2);
  });

  it('skips a skill with a bad answer kind or a broken tier link', () => {
    const raw = good();
    raw.skills.skills[0].answer = 'draw';
    raw.skills.skills[1].tiers[1].perItemAfter = 'nope';
    const { content, errors } = validateContent(raw, GEN);
    expect(content.skills).toEqual([]);
    expect(content.animals).toEqual([]);
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });

  it('skips duplicate and malformed letters, and drops bad references', () => {
    const raw = good();
    raw.letters.letters.push({ id: 'B' }, { id: 'bb' }, { id: 'D', looksLike: ['B', '?'] });
    const { content, errors } = validateContent(raw, GEN);
    expect(content.letters.map((l) => l.id)).toEqual(['B', 'C', 'K', 'D']);
    expect(content.letters.find((l) => l.id === 'D').looksLike).toEqual(['B']);
    expect(errors).toHaveLength(3);
  });

  it('skips bad rewards', () => {
    const raw = good();
    raw.rewards.rewards.push({ id: 'r1', type: 'friend', emoji: '🦆', day: 2 }, { id: 'x', type: 'car', day: 2 }, { id: 'p2', type: 'paint', day: 2 }, { id: 'h1', type: 'hat', day: 2 }, { id: 'f2', type: 'friend', emoji: '🐑' }, { id: 'f3', type: 'friend', emoji: '🐑', day: 0 });
    const { content, errors } = validateContent(raw, GEN);
    expect(content.rewards.map((r) => r.id)).toEqual(['r1', 'p1']);
    // A duplicate, an unknown type, a paint with no colour, a hat with no picture,
    // and two friends with no usable day.
    expect(errors).toHaveLength(6);
  });

  it('checks small things and upgrades', () => {
    const raw = good();
    raw.rewards.rewards.push({ id: 'u1', type: 'upgrade', value: 'barn', day: 5 }, { id: 'u2', type: 'upgrade', day: 6 });
    raw.rewards.small = [
      { id: 'small-rock', emoji: '🪨' },
      { id: 'friend-dog', type: 'friend', emoji: '🐶', once: true },
      { id: 'paint-red', type: 'paint', value: '#f00', once: true, needs: 'barn' },
      { id: 'small-x' },                                             // nothing to draw
      { id: 'small-rock', emoji: '🪨' },                              // twice
      { id: 'thing', type: 'car', emoji: '🚗' },                      // unknown type
      { id: 'paint-loose', type: 'paint', value: '#0f0' },           // a paint that could repeat
      { id: 'hat-early', type: 'hat', emoji: '🎩', once: true, needs: 'castle' },  // needs a building that is not there
    ];
    const { content, errors } = validateContent(raw, GEN);
    expect(content.rewards.map((r) => r.id)).toEqual(['r1', 'p1', 'u1']);
    expect(content.small.map((r) => r.id)).toEqual(['small-rock', 'friend-dog', 'paint-red']);
    expect(errors).toHaveLength(6);
  });

  it('skips bad words', () => {
    const raw = good();
    raw.words = { words: [{ id: 'cat', emoji: '🐱' }, { id: 'cat', emoji: '🐱' }, { id: 'Dog', emoji: '🐶' }, { id: 'sun' }] };
    const { content, errors } = validateContent(raw, GEN);
    expect(content.words.map((w) => w.id)).toEqual(['cat']);
    expect(errors).toHaveLength(3);
  });

  it('survives files that are missing or the wrong shape', () => {
    const { content, errors } = validateContent({}, GEN);
    expect(content).toEqual({ animals: [], skills: [], letters: [], rewards: [], small: [], words: [] });
    expect(errors).toHaveLength(4);
  });
});

describe('the real content files', () => {
  it('load with no errors', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const content = loadContent(GENERATOR_IDS);
    expect(spy).not.toHaveBeenCalled();
    expect(content.animals.length).toBeGreaterThanOrEqual(6);
    expect(content.words.length).toBeGreaterThan(20);
    expect(content.small.length).toBeGreaterThan(10);
    // Every big reward is a farm building, and every paint and hat is a one-off small thing.
    expect(content.rewards.length).toBeGreaterThan(10);
    expect(content.rewards.every((r) => r.type === 'upgrade')).toBe(true);
    expect(content.small.filter((r) => r.type === 'paint' || r.type === 'hat').every((r) => r.once)).toBe(true);
    expect(content.letters).toHaveLength(26);
    spy.mockRestore();
  });
});
