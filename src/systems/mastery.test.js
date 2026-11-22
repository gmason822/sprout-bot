import { describe, it, expect } from 'vitest';
import { recordAnswer, boxOf, isSolid, mostlySolid, activeItems, pickItem, shuffle, MAX_BOX } from './mastery.js';

const withBoxes = (boxes) => Object.fromEntries(
  Object.entries(boxes).map(([id, box]) => [id, { box, seen: 1, correct: 1, lastSeen: 0 }]),
);

describe('recordAnswer', () => {
  it('moves up one box when right on the first try', () => {
    const m = recordAnswer({}, 'count:3', true, 100);
    expect(m['count:3']).toEqual({ box: 2, seen: 1, correct: 1, lastSeen: 100 });
  });
  it('moves down one box, not back to the start, on a miss', () => {
    const m = recordAnswer(withBoxes({ a: 4 }), 'a', false);
    expect(m.a.box).toBe(3);
    expect(m.a.correct).toBe(1);
    expect(m.a.seen).toBe(2);
  });
  it('stays inside boxes 1 to 5', () => {
    expect(recordAnswer({}, 'a', false).a.box).toBe(1);
    expect(recordAnswer(withBoxes({ a: MAX_BOX }), 'a', true).a.box).toBe(MAX_BOX);
  });
  it('does not change the object it was given', () => {
    const before = withBoxes({ a: 2 });
    recordAnswer(before, 'a', true);
    expect(before.a.box).toBe(2);
  });
});

describe('solid checks', () => {
  it('treats an unseen item as box 1 but not solid', () => {
    expect(boxOf({}, 'x')).toBe(1);
    expect(isSolid({}, 'x')).toBe(false);
    expect(isSolid(withBoxes({ x: 3 }), 'x')).toBe(true);
  });
  it('needs two thirds solid', () => {
    expect(mostlySolid(['a', 'b', 'c'], withBoxes({ a: 3, b: 3, c: 1 }))).toBe(true);
    expect(mostlySolid(['a', 'b', 'c'], withBoxes({ a: 3, b: 1, c: 1 }))).toBe(false);
    expect(mostlySolid([], {})).toBe(false);
  });
});

describe('activeItems', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];
  it('starts with the first few', () => {
    expect(activeItems(order, {}, 3)).toEqual(['a', 'b', 'c']);
  });
  it('adds exactly one new item once most are solid', () => {
    expect(activeItems(order, withBoxes({ a: 3, b: 4, c: 1 }), 3)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('keeps anything he has already met', () => {
    expect(activeItems(order, withBoxes({ e: 1 }), 2)).toEqual(['a', 'b', 'e']);
  });
  it('stops when there is nothing left to add', () => {
    expect(activeItems(['a', 'b'], withBoxes({ a: 5, b: 5 }), 2)).toEqual(['a', 'b']);
  });
});

describe('pickItem', () => {
  it('returns null for an empty list', () => {
    expect(pickItem([], {})).toBeNull();
  });
  it('favours lower boxes', () => {
    const m = withBoxes({ weak: 1, strong: 5 });
    const counts = { weak: 0, strong: 0 };
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 600; i++) counts[pickItem(['weak', 'strong'], m, rng)]++;
    expect(counts.weak).toBeGreaterThan(counts.strong * 3);
  });
  it('avoids an immediate repeat when there are more than two items', () => {
    for (let i = 0; i < 100; i++) expect(pickItem(['a', 'b', 'c'], {}, Math.random, 'a')).not.toBe('a');
  });
  it('does not force alternation between two items', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) seen.add(pickItem(['left', 'right'], {}, Math.random, 'left'));
    expect(seen.has('left')).toBe(true);
  });
  it('copes with an rng that returns exactly 1', () => {
    expect(pickItem(['a', 'b'], {}, () => 1)).toBe('b');
  });
});

describe('shuffle', () => {
  it('keeps every element and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
