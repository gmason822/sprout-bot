import { describe, it, expect } from 'vitest';
import { chooseAnimals, isDayDone, bigRewardFor, endDay } from './day.js';

const hen = { id: 'hen', skill: 'count' };
const cow = { id: 'cow', skill: 'letters' };
const pig = { id: 'pig', skill: 'leftright' };

const owl = { id: 'owl', skill: 'numbers' };
const rabbit = { id: 'rabbit', skill: 'firstsound' };
const mouse = { id: 'mouse', skill: 'shapes' };
const ALL = [hen, cow, pig, owl, rabbit, mouse];

describe('chooseAnimals', () => {
  it('offers three different animals', () => {
    for (let i = 0; i < 200; i++) {
      const offered = chooseAnimals(ALL, []);
      expect(offered).toHaveLength(3);
      expect(new Set(offered).size).toBe(3);
    }
  });

  it('always includes the skill he has practised least', () => {
    const log = ['count', 'count', 'leftright', 'numbers', 'firstsound', 'shapes', 'shapes'];
    for (let i = 0; i < 200; i++) expect(chooseAnimals(ALL, log)).toContain(cow);
  });

  it('only looks at recent deliveries', () => {
    const log = [...Array(30).fill('letters'), ...Array(5).fill('count'), ...Array(5).fill('leftright'), ...Array(5).fill('numbers'), ...Array(5).fill('firstsound')];
    // Letters were all long ago, so letters and shapes are equally neglected now.
    const first = new Set();
    for (let i = 0; i < 300; i++) {
      const offered = chooseAnimals(ALL, log);
      expect(offered.includes(cow) || offered.includes(mouse)).toBe(true);
      offered.forEach((a) => first.add(a.id));
    }
    expect(first.size).toBe(6);
  });

  it('puts them in different places on screen', () => {
    const slots = new Set();
    for (let i = 0; i < 200; i++) slots.add(chooseAnimals(ALL, ['count']).indexOf(cow));
    expect(slots.has(0) && slots.has(1) && slots.has(2)).toBe(true);
  });

  it('returns what there is when there are three or fewer', () => {
    expect(chooseAnimals([hen, cow, pig], [])).toEqual([hen, cow, pig]);
    expect(chooseAnimals([hen], [])).toEqual([hen]);
    expect(chooseAnimals([], [])).toEqual([]);
  });

  it('can still be asked for two', () => {
    expect(chooseAnimals(ALL, [], Math.random, 2)).toHaveLength(2);
  });
});

const REWARDS = [
  { id: 'friend-duck', type: 'friend', day: 1 },
  { id: 'paint-blue', type: 'paint', value: '#00f', day: 3 },
  { id: 'hat-straw', type: 'hat', day: 4 },
];
const SMALL = [{ id: 'small-tulip', emoji: '🌷' }, { id: 'small-rock', emoji: '🪨' }];
const fresh = (days = 0) => ({
  farm: { rewards: [], paint: null, hat: null, box: [], placed: [] },
  days,
  today: [{ art: 'apple' }, { art: 'crate' }],
});

describe('isDayDone', () => {
  it('ends the day at the chosen number of deliveries', () => {
    expect(isDayDone([1, 2], 3)).toBe(false);
    expect(isDayDone([1, 2, 3], 3)).toBe(true);
    // A parent can shorten the day part-way through.
    expect(isDayDone([1, 2, 3, 4], 3)).toBe(true);
  });
});

describe('bigRewardFor', () => {
  it('gives each big reward on its set day', () => {
    expect(bigRewardFor(REWARDS, [], 1).id).toBe('friend-duck');
    expect(bigRewardFor(REWARDS, ['friend-duck'], 2)).toBeNull();
    expect(bigRewardFor(REWARDS, ['friend-duck'], 3).id).toBe('paint-blue');
    expect(bigRewardFor(REWARDS, ['friend-duck', 'paint-blue'], 4).id).toBe('hat-straw');
  });
  it('gives nothing big once he has them all', () => {
    expect(bigRewardFor(REWARDS, REWARDS.map((r) => r.id), 99)).toBeNull();
  });
  it('catches up one at a time if some were missed', () => {
    // An older save on day 10 that only has the duck: the earliest one owed comes first.
    expect(bigRewardFor(REWARDS, ['friend-duck'], 10).id).toBe('paint-blue');
    expect(bigRewardFor(REWARDS, ['friend-duck', 'paint-blue'], 11).id).toBe('hat-straw');
  });
  it('does not depend on the order of the file', () => {
    expect(bigRewardFor([...REWARDS].reverse(), [], 5).id).toBe('friend-duck');
  });
});

describe('endDay', () => {
  it('gives the big reward on its day, and nothing else', () => {
    const state = fresh();
    const { reward, gift, delivered } = endDay(state, REWARDS, SMALL);
    expect(reward.id).toBe('friend-duck');
    expect(gift).toBeNull();
    expect(delivered).toHaveLength(2);
    expect(state.farm.rewards).toEqual(['friend-duck']);
    // A friend waits on the shelf for him to place at home.
    expect(state.farm.box).toEqual(['friend-duck']);
    expect(state.days).toBe(1);
    expect(state.today).toEqual([]);
  });

  it('gives exactly one small thing on an in-between day', () => {
    const state = fresh(1);
    state.farm.rewards = ['friend-duck'];
    const { reward, gift } = endDay(state, REWARDS, SMALL, () => 0);
    expect(reward).toBeNull();
    expect(gift.id).toBe('small-tulip');
    expect(state.farm.box).toEqual(['small-tulip']);
    expect(state.days).toBe(2);
  });

  it('gives one reward a day across a week', () => {
    const state = fresh();
    const given = [];
    for (let day = 1; day <= 7; day++) {
      state.today = [{ art: 'apple' }];
      const before = state.farm.box.length + state.farm.rewards.length;
      const { reward, gift } = endDay(state, REWARDS, SMALL);
      given.push(reward ? 'big' : gift ? 'small' : 'none');
      // Never both, and never more than one new thing.
      expect(Boolean(reward) && Boolean(gift)).toBe(false);
      expect(state.farm.box.length + state.farm.rewards.length - before).toBeLessThanOrEqual(2);
    }
    expect(given).toEqual(['big', 'small', 'big', 'big', 'small', 'small', 'small']);
  });

  it('puts a new paint or hat straight on, and not on the shelf', () => {
    const state = fresh(2);
    state.farm.rewards = ['friend-duck'];
    endDay(state, REWARDS, SMALL);
    expect(state.farm.paint).toBe('paint-blue');
    state.today = [{ art: 'apple' }];
    endDay(state, REWARDS, SMALL);
    expect(state.farm.hat).toBe('hat-straw');
    expect(state.farm.box).toEqual([]);
  });

  it('gives a small thing when the big rewards have run out', () => {
    const state = fresh(50);
    state.farm.rewards = REWARDS.map((r) => r.id);
    const { reward, gift } = endDay(state, REWARDS, SMALL);
    expect(reward).toBeNull();
    expect(gift).not.toBeNull();
    expect(state.days).toBe(51);
  });

  it('gives nothing for a day with no deliveries', () => {
    const state = { ...fresh(), today: [] };
    expect(endDay(state, REWARDS, SMALL)).toMatchObject({ reward: null, gift: null });
    expect(state.farm.box).toEqual([]);
  });

  it('still ends the day with no small things in the content', () => {
    const state = fresh(1);
    state.farm.rewards = ['friend-duck'];
    expect(endDay(state, REWARDS)).toMatchObject({ reward: null, gift: null });
    expect(state.days).toBe(2);
  });
});
