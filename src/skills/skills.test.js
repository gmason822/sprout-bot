import { describe, it, expect, vi } from 'vitest';
import { generateLetters, letterOrder, pickDistractors } from './letters.js';
import { generateLeftRight } from './leftright.js';
import { makeRequest, GENERATOR_IDS } from './index.js';
import { loadContent } from '../systems/content.js';

const content = loadContent(GENERATOR_IDS);
const lettersSkill = content.skills.find((s) => s.id === 'letters');
const sideSkill = content.skills.find((s) => s.id === 'leftright');
const box = (n) => ({ box: n, seen: n, correct: n, lastSeen: 0 });
const letter = (id) => content.letters.find((l) => l.id === id);

describe('letterOrder', () => {
  it('starts with the letters of his name, once each', () => {
    const { order, startCount } = letterOrder(content.letters, 'Bobby', ['A']);
    expect(order.slice(0, 3)).toEqual(['B', 'O', 'Y']);
    expect(startCount).toBe(3);
    expect(order).toHaveLength(26);
  });
  it('falls back when there is no name', () => {
    const { order, startCount } = letterOrder(content.letters, '', ['A', 'B', 'M', 'O', 'S', 'T']);
    expect(order.slice(0, 6)).toEqual(['A', 'B', 'M', 'O', 'S', 'T']);
    expect(startCount).toBe(6);
  });
  it('always starts with at least three letters', () => {
    expect(letterOrder(content.letters, 'Bo', []).startCount).toBe(3);
  });
});

describe('pickDistractors', () => {
  it('avoids lookalikes while the letter is new', () => {
    for (let i = 0; i < 100; i++) {
      const ids = pickDistractors(letter('B'), content.letters, 2, { forSound: false, easy: true }).map((l) => l.id);
      expect(ids).not.toContain('B');
      expect(ids).not.toContain('D');
      expect(ids).not.toContain('P');
    }
  });
  it('allows lookalikes once the letter is solid', () => {
    const seen = new Set();
    for (let i = 0; i < 400; i++) {
      pickDistractors(letter('B'), content.letters, 2, { forSound: false, easy: false }).forEach((l) => seen.add(l.id));
    }
    expect(seen.has('D')).toBe(true);
  });
  it('never offers a letter with the same sound in a sound request', () => {
    for (let i = 0; i < 300; i++) {
      const ids = pickDistractors(letter('C'), content.letters, 3, { forSound: true, easy: false }).map((l) => l.id);
      expect(ids).not.toContain('K');
    }
  });
});

describe('generateLetters', () => {
  const ctx = { skill: lettersSkill, content };

  it('asks for letter names from the starting set first', () => {
    for (let i = 0; i < 200; i++) {
      const r = generateLetters({ ...ctx, mastery: {} });
      expect(r.itemId.startsWith('letter-name:')).toBe(true);
      expect(lettersSkill.fallbackStart).toContain(r.answer.correct);
      expect(r.answer.kind).toBe('pick');
      expect(r.answer.choices).toHaveLength(3);
      expect(r.answer.choices.filter((c) => c.id === r.answer.correct)).toHaveLength(1);
      expect(new Set(r.answer.choices.map((c) => c.id)).size).toBe(3);
      expect(r.tts).toBe(`Bring me the box with the letter ${r.answer.correct}!`);
      // The bubble must not give the letter away.
      expect(r.bubble).toEqual({ art: 'crate' });
    }
  });

  it('puts the right answer in different positions', () => {
    const positions = new Set();
    for (let i = 0; i < 200; i++) {
      const r = generateLetters({ ...ctx, mastery: {} });
      positions.add(r.answer.choices.findIndex((c) => c.id === r.answer.correct));
    }
    expect(positions.size).toBe(3);
  });

  it('asks for a sound only when the name is solid and the sound is recorded', () => {
    const mastery = { 'letter-name:B': box(4) };
    const kinds = (hasClip) => {
      const seen = new Set();
      for (let i = 0; i < 400; i++) seen.add(generateLetters({ ...ctx, mastery, hasClip }).itemId);
      return seen;
    };
    expect(kinds(() => false).has('letter-sound:B')).toBe(false);
    const withClips = kinds((id) => id === 'sound-b');
    expect(withClips.has('letter-sound:B')).toBe(true);
    expect([...withClips].filter((id) => id.startsWith('letter-sound:'))).toEqual(['letter-sound:B']);
  });

  it('builds a sound request with no TTS and two choices', () => {
    const mastery = { 'letter-name:B': box(5) };
    let sound = null;
    for (let i = 0; i < 400 && !sound; i++) {
      const r = generateLetters({ ...ctx, mastery, hasClip: () => true });
      if (r.itemId === 'letter-sound:B') sound = r;
    }
    expect(sound.say).toEqual(['box-says', 'sound-b']);
    expect(sound.tts).toBeNull();
    expect(sound.answer.choices).toHaveLength(2);
  });

  it('says what the wrong box was', () => {
    const r = generateLetters({ ...ctx, mastery: {} });
    const wrong = r.answer.choices.find((c) => c.id !== r.answer.correct);
    expect(wrong.wrong).toEqual({ say: ['thats', `letter-${wrong.id.toLowerCase()}`], tts: `That's ${wrong.id}.` });
  });
});

describe('generateLeftRight', () => {
  it('offers two identical things, left then right', () => {
    const sides = new Set();
    for (let i = 0; i < 200; i++) {
      const r = generateLeftRight({ skill: sideSkill, mastery: {} });
      sides.add(r.answer.correct);
      expect(r.answer.choices.map((c) => c.id)).toEqual(['left', 'right']);
      expect(r.answer.choices[0].art).toBe(r.answer.choices[1].art);
      expect(sideSkill.items).toContain(r.answer.choices[0].art);
      expect(r.itemId).toBe(`side:${r.answer.correct}`);
    }
    expect(sides).toEqual(new Set(['left', 'right']));
  });

  it('does not simply alternate', () => {
    let repeats = 0;
    let prev = null;
    for (let i = 0; i < 200; i++) {
      const side = generateLeftRight({ skill: sideSkill, mastery: {} }).answer.correct;
      if (side === prev) repeats++;
      prev = side;
    }
    expect(repeats).toBeGreaterThan(40);
  });

  it('names the side he actually picked when he is wrong', () => {
    const r = generateLeftRight({ skill: sideSkill, mastery: {}, rng: () => 0 });
    expect(r.answer.correct).toBe('left');
    expect(r.tts).toBe('The one on the left!');
    expect(r.answer.choices[1].wrong.tts).toBe('That one is on the right.');
  });
});

describe('makeRequest', () => {
  const ctx = { content, mastery: {}, hasClip: () => false };

  it('builds a request for every skill an animal owns', () => {
    for (const animal of content.animals) {
      const r = makeRequest(animal.skill, ctx);
      expect(r, animal.id).not.toBeNull();
      expect(['count', 'pick']).toContain(r.answer.kind);
      // The bubble shows one picture, or a row of them.
      expect(r.bubble.art ?? r.bubble.emoji ?? r.bubble.row, animal.id).toBeTruthy();
      expect(r.answer.choices?.length ?? 2, animal.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns null for an unknown skill', () => {
    expect(makeRequest('juggling', ctx)).toBeNull();
  });

  it('refuses a request that could not be spoken', () => {
    const silent = { ...content, skills: [{ id: 'leftright', answer: 'pick', tiers: [{ id: 'side' }], items: ['barrel'] }] };
    expect(makeRequest('leftright', { ...ctx, content: silent })).not.toBeNull();
    const spy = vi.fn(() => false);
    const mastery = Object.fromEntries(content.letters.map((l) => [`letter-name:${l.id}`, box(5)]));
    // Every name is solid but no sound is recorded: only name requests may come out.
    for (let i = 0; i < 100; i++) {
      const r = makeRequest('letters', { content, mastery, hasClip: spy });
      expect(r.tts).not.toBeNull();
    }
  });
});
