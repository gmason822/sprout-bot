import { describe, it, expect } from 'vitest';
import {
  earnSmall, smallOnOffer, reconcileFarm, placeFromBox, moveThing, putAway, freeSpot, wearOptions, setWear, ownedUpgrades,
  previousStage, ownedBuildings, isSuperseded, boxFor,
  clampToField, isPlaceable, MAX_THINGS, FIELD,
} from './home.js';

const SMALL = [{ id: 'small-tulip', emoji: '🌷' }, { id: 'small-rock', emoji: '🪨' }];
// Everything that can be owned, the way the game passes it around: big and small together.
const REWARDS = [
  { id: 'friend-duck', type: 'friend', emoji: '🦆', once: true },
  { id: 'upgrade-fence', type: 'upgrade', value: 'fence', emoji: '🪵' },
  { id: 'paint-blue', type: 'paint', value: '#00f', once: true, needs: 'garage' },
  { id: 'paint-red', type: 'paint', value: '#f00', once: true, needs: 'garage' },
  { id: 'hat-straw', type: 'hat', emoji: '👒', once: true, needs: 'garage' },
  { id: 'deco-balloon', type: 'decoration', emoji: '🎈', once: true },
  { id: 'upgrade-barn', type: 'upgrade', value: 'barn', emoji: '🏠' },
];
const farm = (extra = {}) => ({ rewards: [], paint: null, hat: null, box: [], placed: [], ...extra });

describe('earnSmall', () => {
  it('puts one small thing on the shelf', () => {
    const f = farm();
    const item = earnSmall(f, SMALL, () => 0);
    expect(item.id).toBe('small-tulip');
    expect(f.box).toEqual(['small-tulip']);
    earnSmall(f, SMALL, () => 0.99);
    expect(f.box).toEqual(['small-tulip', 'small-rock']);
  });
  it('allows plain things to repeat', () => {
    const f = farm();
    earnSmall(f, SMALL, () => 0);
    earnSmall(f, SMALL, () => 0);
    expect(f.box).toEqual(['small-tulip', 'small-tulip']);
    expect(f.rewards).toEqual([]);
  });
  it('gives a one-off only once', () => {
    const pool = [{ id: 'friend-duck', type: 'friend', emoji: '🦆', once: true }];
    const f = farm();
    expect(earnSmall(f, pool).id).toBe('friend-duck');
    expect(f.rewards).toEqual(['friend-duck']);
    expect(f.box).toEqual(['friend-duck']);
    expect(earnSmall(f, pool)).toBeNull();
    expect(f.box).toEqual(['friend-duck']);
  });
  it('holds paints and hats back until he has the garage, then puts them straight on', () => {
    const pool = [{ id: 'paint-blue', type: 'paint', value: '#00f', once: true, needs: 'garage' }];
    const f = farm();
    expect(earnSmall(f, pool, Math.random, [])).toBeNull();
    expect(earnSmall(f, pool, Math.random, ['garage']).id).toBe('paint-blue');
    expect(f).toMatchObject({ paint: 'paint-blue', rewards: ['paint-blue'], box: [] });
  });
  it('holds a thing back until its page is open', () => {
    const pool = [{ id: 'friend-pig', type: 'friend', emoji: '🐖', once: true, page: 'animals' }, { id: 'small-rock', emoji: '🪨' }];
    expect(smallOnOffer(farm(), pool, [], ['home']).map((s) => s.id)).toEqual(['small-rock']);
    expect(smallOnOffer(farm(), pool, [], ['animals', 'home'])).toHaveLength(2);
    // With no list of pages, nothing is held back.
    expect(smallOnOffer(farm(), pool, [])).toHaveLength(2);
  });
  it('only ever offers what can be given', () => {
    const pool = [...SMALL, ...REWARDS.filter((r) => r.type !== 'upgrade')];
    const f = farm({ rewards: ['friend-duck'] });
    expect(smallOnOffer(f, pool, []).map((s) => s.id)).toEqual(['small-tulip', 'small-rock', 'deco-balloon']);
    expect(smallOnOffer(f, pool, ['garage'])).toHaveLength(6);
  });
  it('gives nothing when there is nothing to give', () => {
    const f = farm();
    expect(earnSmall(f, [])).toBeNull();
    expect(f.box).toEqual([]);
  });
  it('lets the oldest plain thing go when the farm is full, never a friend', () => {
    const f = farm({
      box: ['friend-duck'],
      placed: Array.from({ length: MAX_THINGS - 1 }, (_, i) => ({ item: i === 0 ? 'deco-balloon' : 'small-rock', x: i, y: 400 })),
    });
    earnSmall(f, SMALL, () => 0);
    expect(f.box).toEqual(['friend-duck', 'small-tulip']);
    expect(f.placed).toHaveLength(MAX_THINGS - 2);
    expect(f.placed[0].item).toBe('deco-balloon');
    expect(f.box.length + f.placed.length).toBe(MAX_THINGS);
  });
});

describe('reconcileFarm', () => {
  it('puts owned friends and decorations that are nowhere into the box', () => {
    const f = reconcileFarm(farm({ rewards: ['friend-duck', 'paint-blue', 'deco-balloon', 'upgrade-fence'] }), REWARDS, SMALL);
    expect(f.box).toEqual(['friend-duck', 'deco-balloon']);
  });
  it('leaves things that are already placed or waiting alone', () => {
    const f = farm({ rewards: ['friend-duck', 'deco-balloon'], box: ['deco-balloon'], placed: [{ item: 'friend-duck', x: 300, y: 400 }] });
    reconcileFarm(f, REWARDS, SMALL);
    expect(f.box).toEqual(['deco-balloon']);
    expect(f.placed).toEqual([{ item: 'friend-duck', x: 300, y: 400, page: 'home' }]);
  });
  it('nudges things back inside the field', () => {
    const f = farm({ rewards: ['friend-duck'], placed: [{ item: 'friend-duck', x: 300, y: 320 }, { item: 'small-rock', x: 5, y: 900 }] });
    reconcileFarm(f, REWARDS, SMALL);
    expect(f.placed).toEqual([{ item: 'friend-duck', x: 300, y: FIELD.top, page: 'home' }, { item: 'small-rock', x: FIELD.left, y: FIELD.bottom, page: 'home' }]);
  });
  it('moves a thing to its own page once that page is open, and home again if it closes', () => {
    const rewards = [
      { id: 'friend-pig', type: 'friend', emoji: '🐖', once: true, page: 'animals' },
      { id: 'upgrade-coop', type: 'upgrade', value: 'coop', page: 'animals' },
    ];
    const f = farm({ rewards: ['friend-pig'], placed: [{ item: 'friend-pig', x: 300, y: 400 }] });
    reconcileFarm(f, rewards, SMALL);
    expect(f.placed[0].page).toBe('home');
    f.rewards.push('upgrade-coop');
    reconcileFarm(f, rewards, SMALL);
    expect(f.placed).toEqual([{ item: 'friend-pig', x: 300, y: 400, page: 'animals' }]);
    f.rewards = ['friend-pig'];
    reconcileFarm(f, rewards, SMALL);
    expect(f.placed[0].page).toBe('home');
  });
  it('drops things that no longer exist', () => {
    const f = farm({ rewards: ['deco-windmill'], box: ['small-gone', 'small-rock'], placed: [{ item: 'gone', x: 1, y: 1 }], paint: 'paint-old', hat: 'hat-straw' });
    reconcileFarm(f, REWARDS, SMALL);
    expect(f.box).toEqual(['small-rock']);
    expect(f.placed).toEqual([]);
    expect(f.paint).toBeNull();
    expect(f.hat).toBe('hat-straw');
  });
});

describe('placing', () => {
  it('moves a thing from the box to the farm, inside the field', () => {
    const f = farm({ box: ['small-rock', 'friend-duck'] });
    const thing = placeFromBox(f, 1, 5000, -20);
    expect(thing).toEqual({ item: 'friend-duck', x: FIELD.right, y: FIELD.top, page: 'home' });
    expect(f.box).toEqual(['small-rock']);
    expect(f.placed).toEqual([thing]);
    expect(placeFromBox(f, 9, 0, 0)).toBeNull();
  });
  it('moves and puts away', () => {
    const f = farm({ box: ['small-rock'] });
    const thing = placeFromBox(f, 0, 400, 450, 'crops');
    moveThing(thing, 612.4, 455.6);
    expect(f.placed[0]).toEqual({ item: 'small-rock', x: 612, y: 456, page: 'crops' });
    expect(putAway(f, thing)).toBe(true);
    expect(f.placed).toEqual([]);
    expect(f.box).toEqual(['small-rock']);
    expect(putAway(f, thing)).toBe(false);
  });
  it('shows each page only its own things, and keeps their place in the box', () => {
    const items = [...SMALL, { id: 'small-corn', emoji: '🌽', page: 'crops' }, { id: 'friend-duck', type: 'friend', emoji: '🦆', page: 'pond' }];
    const f = farm({ box: ['small-rock', 'small-corn', 'friend-duck', 'small-tulip', 'small-corn'] });
    const open = ['home', 'crops'];
    expect(boxFor(f, items, 'crops', open)).toEqual([{ id: 'small-corn', index: 1 }, { id: 'small-corn', index: 4 }]);
    // The pond is not open yet, so the duck waits at home.
    expect(boxFor(f, items, 'home', open).map((e) => e.id)).toEqual(['small-rock', 'friend-duck', 'small-tulip']);
    expect(boxFor(f, items, 'pond', ['pond', 'animals', 'home'])).toEqual([{ id: 'friend-duck', index: 2 }]);
  });
  it('clamps to the field', () => {
    expect(clampToField(0, 0)).toEqual({ x: FIELD.left, y: FIELD.top });
    expect(clampToField(9999, 9999)).toEqual({ x: FIELD.right, y: FIELD.bottom });
  });
});

describe('freeSpot', () => {
  it('is always inside the field', () => {
    for (let i = 0; i < 200; i++) {
      const s = freeSpot(farm());
      expect(s.x).toBeGreaterThanOrEqual(FIELD.left);
      expect(s.x).toBeLessThanOrEqual(FIELD.right);
      expect(s.y).toBeGreaterThanOrEqual(FIELD.top);
      expect(s.y).toBeLessThanOrEqual(FIELD.bottom);
    }
  });
  it('only minds the things on the same page', () => {
    const crowd = Array.from({ length: 60 }, (_, i) => ({ item: 'small-rock', x: 260 + (i % 10) * 56, y: 390 + Math.floor(i / 10) * 36, page: 'crops' }));
    // Home is empty, so the very first try is good enough.
    let calls = 0;
    freeSpot(farm({ placed: crowd }), () => { calls++; return 0.5; }, 'home');
    expect(calls).toBe(2);
  });
  it('avoids what is already there when it can', () => {
    const f = farm({ placed: [{ item: 'small-rock', x: 600, y: 450 }] });
    let near = 0;
    for (let i = 0; i < 200; i++) {
      const s = freeSpot(f);
      if (Math.hypot(s.x - 600, s.y - 450) < 60) near++;
    }
    expect(near).toBeLessThan(5);
  });
});

describe('choosing what to wear', () => {
  it('offers none first, then everything he owns of that kind', () => {
    const f = farm({ rewards: ['paint-red', 'hat-straw', 'paint-blue'] });
    expect(wearOptions(f, REWARDS, 'paint').map((r) => r?.id ?? null)).toEqual([null, 'paint-blue', 'paint-red']);
    expect(wearOptions(f, REWARDS, 'hat').map((r) => r?.id ?? null)).toEqual([null, 'hat-straw']);
    expect(wearOptions(farm(), REWARDS, 'paint')).toEqual([null]);
  });
  it('puts on what he picks and takes it off again', () => {
    const f = farm({ rewards: ['paint-blue', 'paint-red', 'hat-straw'] });
    expect(setWear(f, REWARDS, 'paint', 'paint-red')).toBe(true);
    expect(f.paint).toBe('paint-red');
    expect(setWear(f, REWARDS, 'hat', 'hat-straw')).toBe(true);
    expect(setWear(f, REWARDS, 'paint', null)).toBe(true);
    expect(f).toMatchObject({ paint: null, hat: 'hat-straw' });
  });
  it('refuses what he does not own, or the wrong kind', () => {
    const f = farm({ rewards: ['paint-blue'] });
    expect(setWear(f, REWARDS, 'paint', 'paint-red')).toBe(false);
    expect(setWear(f, REWARDS, 'hat', 'paint-blue')).toBe(false);
    expect(setWear(f, REWARDS, 'box', null)).toBe(false);
    expect(f).toMatchObject({ paint: null, hat: null });
  });
});

describe('ownedUpgrades and isPlaceable', () => {
  const STAGE_OF = { cabin: 'tent', farmhouse: 'cabin', bighouse: 'farmhouse' };
  const BUILDINGS = ['tent', 'fence', 'cabin', 'barn', 'farmhouse', 'bighouse']
    .map((v) => ({ id: `upgrade-${v}`, type: 'upgrade', value: v, ...(STAGE_OF[v] ? { replaces: STAGE_OF[v] } : {}) }));
  const owning = (...values) => farm({ rewards: values.map((v) => `upgrade-${v}`) });

  it('lists what he owns in the order of the reward list', () => {
    expect(ownedUpgrades(owning('barn', 'fence'), BUILDINGS)).toEqual(['fence', 'barn']);
    expect(ownedUpgrades(farm(), BUILDINGS)).toEqual([]);
  });
  it('draws only the best stage of the home', () => {
    expect(ownedUpgrades(owning('tent'), BUILDINGS)).toEqual(['tent']);
    expect(ownedUpgrades(owning('tent', 'fence', 'cabin'), BUILDINGS)).toEqual(['fence', 'cabin']);
    expect(ownedUpgrades(owning('tent', 'cabin', 'barn', 'farmhouse', 'bighouse'), BUILDINGS)).toEqual(['barn', 'bighouse']);
    // A later stage without the earlier ones still shows.
    expect(ownedUpgrades(owning('farmhouse'), BUILDINGS)).toEqual(['farmhouse']);
    // A stage is hidden even when the one between was never earned.
    expect(ownedUpgrades(owning('tent', 'farmhouse'), BUILDINGS)).toEqual(['farmhouse']);
  });
  it('still counts a replaced stage as earned', () => {
    expect(ownedBuildings(owning('tent', 'cabin'), BUILDINGS)).toEqual(['tent', 'cabin']);
    expect(isSuperseded(owning('tent', 'cabin'), BUILDINGS, 'tent')).toBe(true);
    expect(isSuperseded(owning('tent', 'cabin'), BUILDINGS, 'cabin')).toBe(false);
    expect(isSuperseded(owning('tent'), BUILDINGS, 'tent')).toBe(false);
  });
  it('does not hang on stages that replace each other in a circle', () => {
    const loop = [{ id: 'upgrade-a', type: 'upgrade', value: 'a', replaces: 'b' }, { id: 'upgrade-b', type: 'upgrade', value: 'b', replaces: 'a' }];
    // The content check refuses such a list; this only has to come back.
    expect(() => ownedUpgrades(farm({ rewards: ['upgrade-a'] }), loop)).not.toThrow();
  });
  it('knows which stage was standing before a new one', () => {
    expect(previousStage(owning('tent', 'cabin'), BUILDINGS, 'cabin')).toBe('tent');
    expect(previousStage(owning('tent', 'cabin', 'farmhouse'), BUILDINGS, 'farmhouse')).toBe('cabin');
    expect(previousStage(owning('tent'), BUILDINGS, 'tent')).toBeNull();
    expect(previousStage(owning('farmhouse'), BUILDINGS, 'farmhouse')).toBeNull();
    expect(previousStage(owning('tent', 'barn'), BUILDINGS, 'barn')).toBeNull();
  });
  it('knows what can stand on the farm', () => {
    expect(REWARDS.filter(isPlaceable).map((r) => r.id)).toEqual(['friend-duck', 'deco-balloon']);
    // A plain small thing has no type and is a decoration.
    expect(isPlaceable({ id: 'small-tulip', emoji: '🌷' })).toBe(true);
    expect(isPlaceable(undefined)).toBe(false);
  });
});
