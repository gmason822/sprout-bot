import { describe, it, expect } from 'vitest';
import { makeChallenge, checkEntry } from './challenge.js';
import { progressGroups, progressSummary } from './progress.js';
import { loadContent } from '../systems/content.js';
import { GENERATOR_IDS } from '../skills/index.js';

describe('makeChallenge', () => {
  it('gives three different digits from 1 to 9 with matching words', () => {
    for (let i = 0; i < 100; i++) {
      const { digits, words } = makeChallenge();
      expect(digits).toHaveLength(3);
      expect(new Set(digits).size).toBe(3);
      digits.forEach((d) => { expect(d).toBeGreaterThanOrEqual(1); expect(d).toBeLessThanOrEqual(9); });
      expect(words).toHaveLength(3);
    }
    expect(makeChallenge(() => 0).words.every((w) => typeof w === 'string' && w.length > 2)).toBe(true);
  });
  it('is not the same every time', () => {
    const seen = new Set();
    for (let i = 0; i < 30; i++) seen.add(makeChallenge().digits.join(''));
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe('checkEntry', () => {
  it('passes only the right digits in the right order', () => {
    expect(checkEntry([7, 2, 5], [])).toBe('more');
    expect(checkEntry([7, 2, 5], [7])).toBe('more');
    expect(checkEntry([7, 2, 5], [7, 2])).toBe('more');
    expect(checkEntry([7, 2, 5], [7, 2, 5])).toBe('pass');
  });
  it('fails at the first wrong digit', () => {
    expect(checkEntry([7, 2, 5], [2])).toBe('fail');
    expect(checkEntry([7, 2, 5], [7, 5])).toBe('fail');
    expect(checkEntry([7, 2, 5], [7, 2, 9])).toBe('fail');
  });
});

describe('progressGroups', () => {
  const content = loadContent(GENERATOR_IDS);
  const rec = (box, seen = box, correct = box) => ({ box, seen, correct, lastSeen: 0 });

  it('lists every item of every skill, met or not', () => {
    const groups = progressGroups(content, {});
    expect(groups.map((g) => g.title)).toEqual(['Counting', 'Letter names', 'Letter sounds', 'Left and right']);
    expect(groups[0].items.map((i) => i.label)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(groups[1].items).toHaveLength(26);
    expect(groups[3].items.map((i) => i.label)).toEqual(['Left', 'Right']);
    expect(groups.flatMap((g) => g.items).every((i) => i.box === null && i.seen === 0)).toBe(true);
  });

  it('shows the box and counts for what he has met', () => {
    const groups = progressGroups(content, { 'count:3': rec(4, 6, 5), 'letter-sound:B': rec(2), 'side:left': rec(1, 3, 0) });
    expect(groups[0].items.find((i) => i.label === '3')).toMatchObject({ box: 4, seen: 6, correct: 5 });
    expect(groups[2].items.find((i) => i.label === 'B').box).toBe(2);
    expect(groups[3].items[0]).toMatchObject({ label: 'Left', box: 1, seen: 3, correct: 0 });
  });

  it('never hides a record it does not recognise', () => {
    const groups = progressGroups(content, { 'shape:circle': rec(2) });
    expect(groups.at(-1)).toEqual({ title: 'Other', items: [{ id: 'shape:circle', label: 'shape:circle', box: 2, seen: 2, correct: 2 }] });
  });

  it('summarises met and solid items', () => {
    const groups = progressGroups(content, { 'count:1': rec(5), 'count:2': rec(3), 'count:3': rec(1) });
    expect(progressSummary(groups)).toEqual({ met: 3, solid: 2, total: 64 });
  });
});
