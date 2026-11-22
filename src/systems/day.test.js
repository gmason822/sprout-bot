import { describe, it, expect } from 'vitest';
import { chooseAnimals, isDayDone, nextReward, endDay, toggleWear } from './day.js';

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

const REWARDS = [
  { id: 'friend-duck', type: 'friend' },
  { id: 'paint-blue', type: 'paint', value: '#00f' },
  { id: 'hat-straw', type: 'hat' },
];
const fresh = () => ({ farm: { rewards: [], paint: null, hat: null }, days: 0, today: [{ art: 'apple' }, { art: 'crate' }] });

describe('isDayDone', () => {
  it('ends the day at the chosen number of deliveries', () => {
    expect(isDayDone([1, 2], 3)).toBe(false);
    expect(isDayDone([1, 2, 3], 3)).toBe(true);
    // A parent can shorten the day part-way through.
    expect(isDayDone([1, 2, 3, 4], 3)).toBe(true);
  });
});

describe('nextReward', () => {
  it('hands rewards out in file order', () => {
    expect(nextReward(REWARDS, []).id).toBe('friend-duck');
    expect(nextReward(REWARDS, ['friend-duck']).id).toBe('paint-blue');
  });
  it('returns null when he has them all', () => {
    expect(nextReward(REWARDS, REWARDS.map((r) => r.id))).toBeNull();
  });
});

describe('endDay', () => {
  it('banks the day and gives the next reward', () => {
    const state = fresh();
    const { reward, delivered } = endDay(state, REWARDS);
    expect(reward.id).toBe('friend-duck');
    expect(delivered).toHaveLength(2);
    expect(state.farm.rewards).toEqual(['friend-duck']);
    expect(state.days).toBe(1);
    expect(state.today).toEqual([]);
  });
  it('puts a new paint or hat straight on', () => {
    const state = fresh();
    endDay(state, REWARDS);
    endDay(state, REWARDS);
    expect(state.farm.paint).toBe('paint-blue');
    endDay(state, REWARDS);
    expect(state.farm.hat).toBe('hat-straw');
  });
  it('still ends the day when the rewards have run out', () => {
    const state = fresh();
    state.farm.rewards = REWARDS.map((r) => r.id);
    const { reward } = endDay(state, REWARDS);
    expect(reward).toBeNull();
    expect(state.days).toBe(1);
    expect(state.farm.rewards).toHaveLength(3);
  });
});

describe('toggleWear', () => {
  it('puts on and takes off something he owns', () => {
    const farm = { rewards: ['paint-blue', 'hat-straw'], paint: null, hat: null };
    expect(toggleWear(farm, REWARDS[1])).toBe(true);
    expect(farm.paint).toBe('paint-blue');
    toggleWear(farm, REWARDS[1]);
    expect(farm.paint).toBeNull();
    toggleWear(farm, REWARDS[2]);
    expect(farm.hat).toBe('hat-straw');
  });
  it('ignores things he does not own or cannot wear', () => {
    const farm = { rewards: ['friend-duck'], paint: null, hat: null };
    expect(toggleWear(farm, REWARDS[0])).toBe(false);
    expect(toggleWear(farm, REWARDS[1])).toBe(false);
    expect(farm).toEqual({ rewards: ['friend-duck'], paint: null, hat: null });
  });
});
