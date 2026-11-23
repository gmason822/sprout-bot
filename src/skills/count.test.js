import { describe, it, expect } from 'vitest';
import { buildCountRequest, generateCount, judgeCount, sendGlows, correctionLine, numberWord, plural } from './count.js';

const apple = { id: 'apple', plural: 'apples' };
const skill = {
  id: 'count',
  answer: 'count',
  tiers: [
    { id: 'count-1-5', min: 1, max: 5 },
    { id: 'count-1-10', min: 1, max: 10, unlockAfter: 'count-1-5' },
  ],
  items: ['apple'],
};
const solid = (ns) => Object.fromEntries(ns.map((n) => [`count:${n}`, { box: 3, seen: 3, correct: 3, lastSeen: 0 }]));

describe('buildCountRequest', () => {
  it('uses the singular for one and the plural otherwise', () => {
    const one = buildCountRequest(1, apple, 7);
    expect(one.say).toEqual(['need', 'num-1', 'item-apple']);
    expect(one.tts).toBe('I need one apple!');
    const three = buildCountRequest(3, apple, 7);
    expect(three.say).toEqual(['need', 'num-3', 'item-apples']);
    expect(three.tts).toBe('I need three apples!');
    expect(three.itemId).toBe('count:3');
    expect(three.bubble).toEqual({ art: 'apple', numeral: 3 });
    expect(three.answer).toEqual({ kind: 'count', item: 'apple', target: 3, available: 7 });
  });
});

describe('generateCount', () => {
  it('stays in 1 to 5 until those are solid', () => {
    for (let i = 0; i < 300; i++) {
      const r = generateCount({ skill, mastery: {} });
      expect(r.answer.target).toBeGreaterThanOrEqual(1);
      expect(r.answer.target).toBeLessThanOrEqual(5);
      // More things than the biggest number, so over-counting is possible.
      expect(r.answer.available).toBe(7);
    }
  });

  it('never repeats the previous number', () => {
    for (let prev = 1; prev <= 5; prev++) {
      for (let i = 0; i < 50; i++) {
        expect(generateCount({ skill, mastery: {}, prevItemId: `count:${prev}` }).itemId).not.toBe(`count:${prev}`);
      }
    }
  });

  it('brings in 6 once 1 to 5 are mostly solid, with a bigger pile', () => {
    const mastery = solid([1, 2, 3, 4]);
    const targets = new Set();
    let sixAvailable = null;
    for (let i = 0; i < 500; i++) {
      const r = generateCount({ skill, mastery });
      targets.add(r.answer.target);
      if (r.answer.target === 6) sixAvailable = r.answer.available;
    }
    expect(targets.has(6)).toBe(true);
    expect(targets.has(7)).toBe(false);
    expect(sixAvailable).toBe(12);
  });

  it('can reach both ends of the range', () => {
    expect(generateCount({ skill, mastery: {}, rng: () => 0 }).answer.target).toBe(1);
    expect(generateCount({ skill, mastery: {}, rng: () => 0.999 }).answer.target).toBe(5);
  });

  it('has nothing to ask without things to count', () => {
    expect(generateCount({ skill: { ...skill, items: [] } })).toBeNull();
  });
});

describe('judgeCount', () => {
  it('compares the load with the request', () => {
    expect(judgeCount(3, 3)).toBe('right');
    expect(judgeCount(3, 2)).toBe('few');
    expect(judgeCount(3, 0)).toBe('few');
    expect(judgeCount(3, 4)).toBe('many');
  });
});

describe('sendGlows', () => {
  it('only glows after two misses and only on the right number', () => {
    expect(sendGlows(0, 3, 3)).toBe(false);
    expect(sendGlows(1, 3, 3)).toBe(false);
    expect(sendGlows(2, 3, 3)).toBe(true);
    expect(sendGlows(2, 2, 3)).toBe(false);
    expect(sendGlows(5, 4, 3)).toBe(false);
  });
});

describe('correctionLine', () => {
  it('says there are not enough, how many are wanted, and to count again', () => {
    expect(correctionLine(3, 2)).toEqual({
      say: ['not-enough', 'need', 'num-3', 'count-again'],
      tts: 'Not enough! I need three. Count again!',
    });
    // The same line however far short he is: everything goes back either way.
    expect(correctionLine(5, 1)).toEqual(correctionLine(5, 4));
  });
  it('says there are too many', () => {
    expect(correctionLine(2, 4)).toEqual({
      say: ['too-many', 'need', 'num-2', 'count-again'],
      tts: 'Too many! I need two. Count again!',
    });
  });
});

describe('numberWord', () => {
  it('spells 1 to 12', () => {
    expect(numberWord(1)).toBe('one');
    expect(numberWord(12)).toBe('twelve');
  });
});

describe('plural', () => {
  it('handles the things on the farm', () => {
    expect(plural('apple')).toBe('apples');
    expect(plural('egg')).toBe('eggs');
    expect(plural('strawberry')).toBe('strawberries');
    expect(plural('tomato')).toBe('tomatoes');
    expect(plural('box')).toBe('boxes');
    expect(plural('peach')).toBe('peaches');
    expect(plural('toy')).toBe('toys');
  });
  it('is used in what the animals say', () => {
    const berries = { id: 'count', answer: 'count', tiers: [{ id: 't', min: 2, max: 2 }], items: ['strawberry'] };
    expect(generateCount({ skill: berries }).tts).toBe('I need two strawberries!');
  });
});
