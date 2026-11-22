import { describe, it, expect } from 'vitest';
import { generateNumbers } from './numbers.js';
import { generateFirstSound, wordsByLetter } from './firstsound.js';
import { generateShapes } from './shapes.js';
import { generateLetters } from './letters.js';
import { generateLeftRight } from './leftright.js';
import { GENERATOR_IDS } from './index.js';
import { loadContent } from '../systems/content.js';

const content = loadContent(GENERATOR_IDS);
const skill = (id) => content.skills.find((s) => s.id === id);
const box = (n) => ({ box: n, seen: n, correct: n, lastSeen: 0 });
const many = (fn, n = 400) => Array.from({ length: n }, fn);

describe('generateNumbers', () => {
  const run = (mastery = {}) => generateNumbers({ skill: skill('numbers'), mastery });

  it('asks both kinds of question, with 1 to 5 at the start', () => {
    const kinds = new Set();
    for (const r of many(run)) {
      const [kind, n] = r.itemId.split(':');
      kinds.add(kind);
      expect(Number(n)).toBeGreaterThanOrEqual(1);
      expect(Number(n)).toBeLessThanOrEqual(5);
      expect(r.answer.correct).toBe(n);
      expect(r.answer.choices).toHaveLength(3);
      expect(new Set(r.answer.choices.map((c) => c.id)).size).toBe(3);
      expect(r.answer.choices.filter((c) => c.id === n)).toHaveLength(1);
      // Wrong answers are numbers he is already working with.
      r.answer.choices.forEach((c) => expect(Number(c.id)).toBeLessThanOrEqual(5));
    }
    expect(kinds).toEqual(new Set(['numeral', 'howmany']));
  });

  it('never shows the numeral when asking him to find it', () => {
    const r = many(run).find((x) => x.itemId.startsWith('numeral:'));
    expect(r.bubble).toEqual({ art: 'crate' });
    expect(r.tts).toMatch(/^Bring me the box with the number \w+!$/);
  });

  it('shows the right number of things to count', () => {
    const r = many(run).find((x) => x.itemId.startsWith('howmany:'));
    expect(r.bubble.count).toBe(Number(r.answer.correct));
    expect(skill('numbers').items).toContain(r.bubble.art);
    expect(r.tts).toMatch(/^How many \w+s\? Bring me that number!$/);
    expect(many(run, 600).map((x) => x.tts).filter((t) => t.includes('strawberrys') || t.includes('tomatos'))).toEqual([]);
  });

  it('brings in 6 once 1 to 5 are going well', () => {
    const mastery = Object.fromEntries([1, 2, 3, 4].map((n) => [`numeral:${n}`, box(4)]));
    const asked = new Set(many(() => run(mastery).itemId, 800));
    expect(asked.has('numeral:6')).toBe(true);
    expect(asked.has('numeral:7')).toBe(false);
    expect(asked.has('howmany:6')).toBe(false);
  });

  it('says which number he brought by mistake', () => {
    const r = run();
    const wrong = r.answer.choices.find((c) => c.id !== r.answer.correct);
    expect(wrong.wrong.say).toEqual(['thats', `num-${wrong.id}`]);
  });
});

describe('wordsByLetter', () => {
  const byLetter = wordsByLetter(content);
  it('groups picture words by their first letter', () => {
    expect(byLetter.get('B').map((w) => w.id)).toEqual(expect.arrayContaining(['bear', 'bus', 'bed']));
    expect(byLetter.get('S').map((w) => w.id)).toEqual(expect.arrayContaining(['sun', 'star']));
  });
  it('leaves out words whose first sound is not clean', () => {
    expect(byLetter.has('X')).toBe(false);
    expect((byLetter.get('T') ?? []).map((w) => w.id)).not.toContain('tree');
  });
  it('lists no word twice', () => {
    const all = [...byLetter.values()].flat().map((w) => w.id);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('generateFirstSound', () => {
  const run = (extra = {}) => generateFirstSound({ skill: skill('firstsound'), content, mastery: {}, ...extra });

  it('shows a picture and asks for its first letter', () => {
    for (const r of many(run, 200)) {
      const letter = r.itemId.split(':')[1];
      expect(skill('firstsound').fallbackStart).toContain(letter);
      expect(r.answer.correct).toBe(letter);
      expect(r.bubble.emoji).toBeTruthy();
      const word = r.say[0].replace('word-', '');
      expect(word.charAt(0).toUpperCase()).toBe(letter);
      expect(r.tts).toBe(`${word.charAt(0).toUpperCase()}${word.slice(1)}. What letter does ${word} start with?`);
      expect(r.answer.choices).toHaveLength(3);
      expect(r.answer.choices.filter((c) => c.id === letter)).toHaveLength(1);
    }
  });

  it('starts with the letters of his name when it is set', () => {
    const asked = new Set(many(() => run({ childName: 'Max' }).answer.correct, 200));
    expect(asked.has('M')).toBe(true);
    expect(asked.has('A')).toBe(true);
    // X has no usable picture word, so it is skipped rather than asked.
    expect(asked.has('X')).toBe(false);
  });

  it('never offers a letter that makes the same sound', () => {
    const mastery = { 'first-sound:C': box(1) };
    for (const r of many(() => generateFirstSound({ skill: skill('firstsound'), content, mastery, childName: 'C' }), 300)) {
      if (r.answer.correct === 'C') expect(r.answer.choices.map((c) => c.id)).not.toContain('K');
    }
  });
});

describe('generateShapes', () => {
  const run = (mastery = {}) => generateShapes({ skill: skill('shapes'), mastery });

  it('asks for one of the first five shapes, all in one colour', () => {
    const first = skill('shapes').tiers[0].shapes;
    for (const r of many(run, 200)) {
      expect(first).toContain(r.answer.correct);
      expect(r.itemId).toBe(`shape:${r.answer.correct}`);
      expect(r.answer.choices).toHaveLength(3);
      expect(new Set(r.answer.choices.map((c) => c.id)).size).toBe(3);
      expect(new Set(r.answer.choices.map((c) => c.tint)).size).toBe(1);
      r.answer.choices.forEach((c) => expect(c.art).toBe(`shape-${c.id}`));
      expect(r.tts).toBe(`Bring me the ${r.answer.correct}!`);
      // The bubble must not look like an answer.
      expect(r.bubble.art).toBeUndefined();
    }
  });

  it('brings in harder shapes once the first ones are solid', () => {
    const mastery = Object.fromEntries(skill('shapes').tiers[0].shapes.map((s) => [`shape:${s}`, box(4)]));
    const asked = new Set(many(() => run(mastery).itemId, 600));
    expect([...asked].some((id) => id.startsWith('shape2:'))).toBe(true);
    expect(many(run, 300).some((r) => r.itemId.startsWith('shape2:'))).toBe(false);
  });

  it('uses "an" before a vowel', () => {
    const mastery = Object.fromEntries([...skill('shapes').tiers[0].shapes.map((s) => [`shape:${s}`, box(5)]), ['shape2:rectangle', box(5)], ['shape2:oval', box(1)]]);
    const lines = new Set(many(() => run(mastery), 600).flatMap((r) => r.answer.choices.map((c) => c.wrong.tts)));
    expect(lines.has("That's an oval.")).toBe(true);
    expect(lines.has("That's a square.")).toBe(true);
  });
});

describe('lowercase letters', () => {
  const run = (mastery, hasClip = () => false) => generateLetters({ skill: skill('letters'), content, mastery, hasClip });

  it('are asked only for letters whose capital he knows', () => {
    const asked = new Set(many(() => run({ 'letter-name:B': box(4) }).itemId));
    expect(asked.has('letter-lower:B')).toBe(true);
    expect([...asked].filter((id) => id.startsWith('letter-lower:'))).toEqual(['letter-lower:B']);
    expect(many(() => run({}).itemId, 200).some((id) => id.startsWith('letter-lower:'))).toBe(false);
  });

  it('show lowercase boxes and say "little letter"', () => {
    const r = many(() => run({ 'letter-name:B': box(5) })).find((x) => x.itemId === 'letter-lower:B');
    expect(r.tts).toBe('Bring me the box with the little letter B!');
    expect(r.answer.correct).toBe('B');
    r.answer.choices.forEach((c) => expect(c.label).toBe(c.id.toLowerCase()));
  });
});

describe('the middle one', () => {
  const run = (mastery) => generateLeftRight({ skill: skill('leftright'), mastery });

  it('is not offered at first', () => {
    for (const r of many(() => run({}), 200)) {
      expect(r.answer.choices.map((c) => c.id)).toEqual(['left', 'right']);
      expect(r.cue).toBe(r.answer.correct);
    }
  });

  it('arrives once left and right are going well, with three things in a row', () => {
    const mastery = { 'side:left': box(4), 'side:right': box(3) };
    const sides = new Set();
    for (const r of many(() => run(mastery))) {
      sides.add(r.answer.correct);
      expect(r.answer.choices.map((c) => c.id)).toEqual(['left', 'middle', 'right']);
      if (r.answer.correct === 'middle') {
        expect(r.tts).toBe('The one in the middle!');
        expect(r.cue).toBeUndefined();
      }
    }
    expect(sides).toEqual(new Set(['left', 'right', 'middle']));
  });
});
