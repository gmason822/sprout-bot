import { describe, it, expect } from 'vitest';
import { makeChallenge, checkEntry } from './challenge.js';
import { inHoldZone, isTapBurst } from './gate.js';
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

  const group = (groups, title) => groups.find((g) => g.title === title);

  it('shows a game whose tiers list their own items', () => {
    const made = { skills: [{ id: 'colours', answer: 'pick', tiers: [{ id: 'colour', title: 'Colours', items: ['red', 'blue'] }] }], letters: [] };
    const [only] = progressGroups(made, { 'colour:red': rec(3) });
    expect(only.title).toBe('Colours');
    expect(only.items.map((i) => [i.id, i.label, i.box])).toEqual([['colour:red', 'Red', 3], ['colour:blue', 'Blue', null]]);
  });

  it('lists every item of every game, met or not', () => {
    const groups = progressGroups(content, {});
    // The first games, in the order they are listed; newer games follow.
    expect(groups.map((g) => g.title).slice(0, 10)).toEqual([
      'Counting', 'Letter names', 'Lowercase letters', 'Letter sounds', 'Left, right and middle',
      'Finding numbers', 'How many?', 'First sounds', 'Shapes', 'Harder shapes',
    ]);
    // Every tier of every game has a group of its own (or shares one by title).
    const titles = new Set(content.skills.flatMap((s) => s.tiers.map((t) => t.title ?? t.id)));
    expect(new Set(groups.map((g) => g.title))).toEqual(titles);
    // The two counting tiers share a title and are merged, with no number twice.
    expect(group(groups, 'Counting').items.map((i) => i.label)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(group(groups, 'Letter names').items).toHaveLength(26);
    expect(group(groups, 'Lowercase letters').items[1].label).toBe('b');
    expect(group(groups, 'Left, right and middle').items.map((i) => i.label)).toEqual(['Left', 'Right', 'Middle']);
    expect(group(groups, 'Shapes').items.map((i) => i.label)).toEqual(['Circle', 'Square', 'Triangle', 'Star', 'Heart']);
    expect(groups.flatMap((g) => g.items).every((i) => i.box === null && i.seen === 0)).toBe(true);
    // No id is listed twice.
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows the box and counts for what he has met', () => {
    const groups = progressGroups(content, {
      'count:3': rec(4, 6, 5), 'letter-sound:B': rec(2), 'side:left': rec(1, 3, 0),
      'numeral:7': rec(3), 'howmany:2': rec(5), 'first-sound:S': rec(2), 'shape2:oval': rec(1),
    });
    expect(group(groups, 'Counting').items.find((i) => i.label === '3')).toMatchObject({ box: 4, seen: 6, correct: 5 });
    expect(group(groups, 'Letter sounds').items.find((i) => i.label === 'B').box).toBe(2);
    expect(group(groups, 'Left, right and middle').items[0]).toMatchObject({ label: 'Left', box: 1, seen: 3, correct: 0 });
    expect(group(groups, 'Finding numbers').items.find((i) => i.label === '7').box).toBe(3);
    expect(group(groups, 'How many?').items.find((i) => i.label === '2').box).toBe(5);
    expect(group(groups, 'First sounds').items.find((i) => i.label === 'S').box).toBe(2);
    expect(group(groups, 'Harder shapes').items.find((i) => i.label === 'Oval').box).toBe(1);
    expect(groups.some((g) => g.title === 'Other')).toBe(false);
  });

  it('never hides a record it does not recognise', () => {
    const groups = progressGroups(content, { 'old-game:thing': rec(2) });
    expect(groups.at(-1)).toEqual({ title: 'Other', items: [{ id: 'old-game:thing', label: 'old-game:thing', box: 2, seen: 2, correct: 2 }] });
  });

  it('summarises met and solid items', () => {
    const groups = progressGroups(content, { 'count:1': rec(5), 'count:2': rec(3), 'count:3': rec(1) });
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(145);
    expect(progressSummary(groups)).toEqual({ met: 3, solid: 2, total });
  });
});

describe('inHoldZone', () => {
  // The sun is drawn at (1160, 90) in a 1280 x 720 picture.
  const sunIn = (rect) => [rect.left + (1160 / 1280) * rect.width, rect.top + (90 / 720) * rect.height];

  it('covers the sun when the picture fills the screen', () => {
    const rect = { left: 0, top: 0, width: 1280, height: 720 };
    expect(inHoldZone(...sunIn(rect), rect)).toBe(true);
  });

  it('covers the sun on a wide phone, where the picture has bars at the sides', () => {
    const rect = { left: 91, top: 0, width: 732, height: 412 };
    expect(inHoldZone(...sunIn(rect), rect)).toBe(true);
    // The bar to the right of the picture counts too.
    expect(inHoldZone(905, 10, rect)).toBe(true);
  });

  it('covers the sun on a tall screen, where the bars are above and below', () => {
    const rect = { left: 0, top: 75, width: 800, height: 450 };
    expect(inHoldZone(...sunIn(rect), rect)).toBe(true);
    expect(inHoldZone(790, 5, rect)).toBe(true);
  });

  it('leaves the rest of the game alone', () => {
    const rect = { left: 91, top: 0, width: 732, height: 412 };
    expect(inHoldZone(457, 206, rect)).toBe(false);  // middle
    expect(inHoldZone(100, 20, rect)).toBe(false);   // top-left
    expect(inHoldZone(800, 380, rect)).toBe(false);  // bottom-right, the send button
    expect(inHoldZone(640, 40, rect)).toBe(false);   // top, left of the sun
  });
});

describe('isTapBurst', () => {
  it('needs five taps close together', () => {
    expect(isTapBurst([0, 300, 600, 900], 900)).toBe(false);
    expect(isTapBurst([0, 300, 600, 900, 1200], 1200)).toBe(true);
  });
  it('does not count taps that are spread out', () => {
    expect(isTapBurst([0, 1000, 2000, 3000, 4000], 4000)).toBe(false);
    expect(isTapBurst([0, 2000, 2100, 2200, 2300, 2400], 2400)).toBe(true);
  });
});
