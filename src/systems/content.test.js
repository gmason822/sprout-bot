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
  rewards: { rewards: [{ id: 'r1', type: 'friend', emoji: '🦆' }, { id: 'p1', type: 'paint', value: '#fff' }] },
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
    raw.rewards.rewards.push({ id: 'r1', type: 'friend', emoji: '🦆' }, { id: 'x', type: 'car' }, { id: 'p2', type: 'paint' }, { id: 'h1', type: 'hat' });
    const { content, errors } = validateContent(raw, GEN);
    expect(content.rewards.map((r) => r.id)).toEqual(['r1', 'p1']);
    expect(errors).toHaveLength(4);
  });

  it('survives files that are missing or the wrong shape', () => {
    const { content, errors } = validateContent({}, GEN);
    expect(content).toEqual({ animals: [], skills: [], letters: [], rewards: [] });
    expect(errors).toHaveLength(4);
  });
});

describe('the real content files', () => {
  it('load with no errors', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const content = loadContent(GENERATOR_IDS);
    expect(spy).not.toHaveBeenCalled();
    expect(content.animals.length).toBeGreaterThanOrEqual(3);
    expect(content.letters).toHaveLength(26);
    spy.mockRestore();
  });
});
