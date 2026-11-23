import { describe, it, expect } from 'vitest';
import { chooseOffers, isDayDone, bigRewardFor, endDay } from './day.js';

const hen = { id: 'hen', skills: ['count'] };
const cow = { id: 'cow', skills: ['letters'] };
const pig = { id: 'pig', skills: ['leftright'] };

const owl = { id: 'owl', skills: ['numbers'] };
const rabbit = { id: 'rabbit', skills: ['firstsound'] };
const mouse = { id: 'mouse', skills: ['shapes'] };
const ALL = [hen, cow, pig, owl, rabbit, mouse];
const always = () => true;
const who = (offers) => offers.map((o) => o.animal);

describe('chooseOffers', () => {
  it('offers three different animals, each with one of its own games', () => {
    for (let i = 0; i < 200; i++) {
      const offers = chooseOffers(ALL, always, []);
      expect(offers).toHaveLength(3);
      expect(new Set(who(offers)).size).toBe(3);
      for (const offer of offers) expect(offer.animal.skills).toContain(offer.skill);
    }
  });

  it('always includes the game he has practised least', () => {
    const log = ['count', 'count', 'leftright', 'numbers', 'firstsound', 'shapes', 'shapes'];
    for (let i = 0; i < 200; i++) expect(who(chooseOffers(ALL, always, log))).toContain(cow);
  });

  it('only looks at recent deliveries', () => {
    const log = [...Array(30).fill('letters'), ...Array(5).fill('count'), ...Array(5).fill('leftright'), ...Array(5).fill('numbers'), ...Array(5).fill('firstsound')];
    // Letters were all long ago, so letters and shapes are equally neglected now.
    const first = new Set();
    for (let i = 0; i < 300; i++) {
      const offered = who(chooseOffers(ALL, always, log));
      expect(offered.includes(cow) || offered.includes(mouse)).toBe(true);
      offered.forEach((a) => first.add(a.id));
    }
    expect(first.size).toBe(6);
  });

  it('puts them in different places on screen', () => {
    const slots = new Set();
    for (let i = 0; i < 200; i++) slots.add(who(chooseOffers(ALL, always, ['count'])).indexOf(cow));
    expect(slots.has(0) && slots.has(1) && slots.has(2)).toBe(true);
  });

  it('returns what there is when there are three or fewer', () => {
    expect(who(chooseOffers([hen, cow, pig], always, [])).sort((a, b) => a.id.localeCompare(b.id))).toEqual([cow, hen, pig]);
    expect(chooseOffers([hen], always, [])).toEqual([{ animal: hen, skill: 'count' }]);
    expect(chooseOffers([], always, [])).toEqual([]);
  });

  it('can still be asked for two', () => {
    expect(chooseOffers(ALL, always, [], Math.random, 2)).toHaveLength(2);
  });

  describe('with families of games', () => {
    const numbers = { id: 'hen', skills: ['count', 'more', 'onemore'] };
    const letters = { id: 'cow', skills: ['letters', 'rhymes'] };
    const farm = [numbers, letters, pig, mouse];

    it('an animal asks for the game in its family he has practised least', () => {
      const log = ['count', 'count', 'more', 'letters', 'leftright', 'shapes', 'rhymes'];
      for (let i = 0; i < 200; i++) {
        const offers = chooseOffers(farm, always, log);
        // "onemore" has never been played, so the hen is there and that is what it asks.
        expect(offers.find((o) => o.animal === numbers)?.skill).toBe('onemore');
      }
    });

    it('gets round to every game in a family', () => {
      const asked = new Set();
      for (let i = 0; i < 300; i++) chooseOffers(farm, always, []).forEach((o) => asked.add(o.skill));
      expect([...asked].sort()).toEqual(['count', 'leftright', 'letters', 'more', 'onemore', 'rhymes', 'shapes']);
    });

    it('never offers a game that has nothing to ask, or an animal with none that does', () => {
      const ready = (skill) => !['more', 'onemore', 'letters', 'rhymes'].includes(skill);
      for (let i = 0; i < 100; i++) {
        const offers = chooseOffers(farm, ready, []);
        expect(who(offers)).not.toContain(letters);
        expect(offers.find((o) => o.animal === numbers)?.skill ?? 'count').toBe('count');
      }
    });
  });
});

const REWARDS = [
  { id: 'upgrade-tent', type: 'upgrade', value: 'tent', day: 1 },
  { id: 'upgrade-garage', type: 'upgrade', value: 'garage', day: 3 },
  { id: 'upgrade-barn', type: 'upgrade', value: 'barn', day: 4 },
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
    expect(bigRewardFor(REWARDS, [], 1).id).toBe('upgrade-tent');
    expect(bigRewardFor(REWARDS, ['upgrade-tent'], 2)).toBeNull();
    expect(bigRewardFor(REWARDS, ['upgrade-tent'], 3).id).toBe('upgrade-garage');
    expect(bigRewardFor(REWARDS, ['upgrade-tent', 'upgrade-garage'], 4).id).toBe('upgrade-barn');
  });
  it('gives nothing big once he has them all', () => {
    expect(bigRewardFor(REWARDS, REWARDS.map((r) => r.id), 99)).toBeNull();
  });
  it('catches up one at a time if some were missed', () => {
    // An older save on day 10 that only has the tent: the earliest one owed comes first.
    expect(bigRewardFor(REWARDS, ['upgrade-tent'], 10).id).toBe('upgrade-garage');
    expect(bigRewardFor(REWARDS, ['upgrade-tent', 'upgrade-garage'], 11).id).toBe('upgrade-barn');
  });
  it('does not depend on the order of the file', () => {
    expect(bigRewardFor([...REWARDS].reverse(), [], 5).id).toBe('upgrade-tent');
  });
});

describe('endDay', () => {
  it('gives the farm building on its day, and nothing else', () => {
    const state = fresh();
    const { reward, gift, delivered } = endDay(state, REWARDS, SMALL);
    expect(reward.id).toBe('upgrade-tent');
    expect(gift).toBeNull();
    expect(delivered).toHaveLength(2);
    expect(state.farm.rewards).toEqual(['upgrade-tent']);
    // A building is part of the farm, not something to place.
    expect(state.farm.box).toEqual([]);
    expect(state.days).toBe(1);
    expect(state.today).toEqual([]);
  });

  it('gives exactly one small thing on an in-between day', () => {
    const state = fresh(1);
    state.farm.rewards = ['upgrade-tent'];
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
      expect(Boolean(reward) && Boolean(gift)).toBe(false);
      expect(state.farm.box.length + state.farm.rewards.length - before).toBe(1);
    }
    expect(given).toEqual(['big', 'small', 'big', 'big', 'small', 'small', 'small']);
  });

  it('only gives paint once he has the garage', () => {
    const paint = [{ id: 'paint-blue', type: 'paint', value: '#00f', once: true, needs: 'garage' }];
    const before = fresh(1);
    before.farm.rewards = ['upgrade-tent'];
    expect(endDay(before, REWARDS, paint)).toMatchObject({ reward: null, gift: null });

    const after = fresh(4);
    after.farm.rewards = REWARDS.map((r) => r.id);
    expect(endDay(after, REWARDS, paint).gift.id).toBe('paint-blue');
    expect(after.farm.paint).toBe('paint-blue');
    expect(after.farm.box).toEqual([]);
  });

  it('gives a small thing when the buildings have run out', () => {
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
    expect(state.farm.rewards).toEqual([]);
  });

  it('still ends the day with no small things in the content', () => {
    const state = fresh(1);
    state.farm.rewards = ['upgrade-tent'];
    expect(endDay(state, REWARDS)).toMatchObject({ reward: null, gift: null });
    expect(state.days).toBe(2);
  });
});
