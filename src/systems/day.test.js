import { describe, it, expect } from 'vitest';
import { chooseAnimals } from './day.js';

const hen = { id: 'hen', skill: 'count' };
const cow = { id: 'cow', skill: 'letters' };
const pig = { id: 'pig', skill: 'leftright' };

describe('chooseAnimals', () => {
  it('offers two different animals', () => {
    for (let i = 0; i < 100; i++) {
      const pair = chooseAnimals([hen, cow, pig], []);
      expect(pair).toHaveLength(2);
      expect(pair[0]).not.toBe(pair[1]);
    }
  });

  it('always includes the skill he has practised least', () => {
    const log = ['count', 'count', 'leftright', 'count', 'leftright'];
    for (let i = 0; i < 100; i++) {
      expect(chooseAnimals([hen, cow, pig], log)).toContain(cow);
    }
  });

  it('only looks at recent deliveries', () => {
    const log = [...Array(30).fill('letters'), ...Array(20).fill('count')];
    // Letters were all long ago, so letters and left/right are equally neglected now.
    const seen = new Set();
    for (let i = 0; i < 200; i++) chooseAnimals([hen, cow, pig], log).forEach((a) => seen.add(a.id));
    expect(seen.has('cow')).toBe(true);
    expect(seen.has('pig')).toBe(true);
  });

  it('returns what there is when there are two or fewer', () => {
    expect(chooseAnimals([hen, cow], [])).toEqual([hen, cow]);
    expect(chooseAnimals([hen], [])).toEqual([hen]);
    expect(chooseAnimals([], [])).toEqual([]);
  });
});
