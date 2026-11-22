import { describe, it, expect } from 'vitest';
import {
  earnSmall, reconcileFarm, placeFromBox, moveThing, putAway, freeSpot, cycleWear, ownedUpgrades,
  clampToField, isPlaceable, MAX_THINGS, FIELD,
} from './home.js';

const SMALL = [{ id: 'small-tulip', emoji: '🌷' }, { id: 'small-rock', emoji: '🪨' }];
const REWARDS = [
  { id: 'friend-duck', type: 'friend', emoji: '🦆' },
  { id: 'upgrade-fence', type: 'upgrade', value: 'fence', emoji: '🪵' },
  { id: 'paint-blue', type: 'paint', value: '#00f' },
  { id: 'paint-red', type: 'paint', value: '#f00' },
  { id: 'hat-straw', type: 'hat', emoji: '👒' },
  { id: 'deco-balloon', type: 'decoration', emoji: '🎈' },
  { id: 'upgrade-barn', type: 'upgrade', value: 'barn', emoji: '🏠' },
];
const farm = (extra = {}) => ({ rewards: [], paint: null, hat: null, box: [], placed: [], ...extra });

describe('earnSmall', () => {
  it('puts one small thing in the gift box', () => {
    const f = farm();
    const item = earnSmall(f, SMALL, () => 0);
    expect(item.id).toBe('small-tulip');
    expect(f.box).toEqual(['small-tulip']);
    earnSmall(f, SMALL, () => 0.99);
    expect(f.box).toEqual(['small-tulip', 'small-rock']);
  });
  it('allows repeats', () => {
    const f = farm();
    earnSmall(f, SMALL, () => 0);
    earnSmall(f, SMALL, () => 0);
    expect(f.box).toEqual(['small-tulip', 'small-tulip']);
  });
  it('gives nothing when there is nothing to give', () => {
    const f = farm();
    expect(earnSmall(f, [])).toBeNull();
    expect(f.box).toEqual([]);
  });
  it('lets the oldest small thing go when the farm is full, never a friend', () => {
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
    expect(f.placed).toHaveLength(1);
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
    expect(thing).toEqual({ item: 'friend-duck', x: FIELD.right, y: FIELD.top });
    expect(f.box).toEqual(['small-rock']);
    expect(f.placed).toEqual([thing]);
    expect(placeFromBox(f, 9, 0, 0)).toBeNull();
  });
  it('moves and puts away', () => {
    const f = farm({ box: ['small-rock'] });
    const thing = placeFromBox(f, 0, 400, 400);
    moveThing(thing, 612.4, 455.6);
    expect(f.placed[0]).toEqual({ item: 'small-rock', x: 612, y: 456 });
    expect(putAway(f, thing)).toBe(true);
    expect(f.placed).toEqual([]);
    expect(f.box).toEqual(['small-rock']);
    expect(putAway(f, thing)).toBe(false);
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

describe('cycleWear', () => {
  it('goes through the paints he owns, then back to none', () => {
    const f = farm({ rewards: ['paint-blue', 'paint-red', 'hat-straw'] });
    expect(cycleWear(f, REWARDS, 'paint')).toBe('paint-blue');
    expect(cycleWear(f, REWARDS, 'paint')).toBe('paint-red');
    expect(cycleWear(f, REWARDS, 'paint')).toBeNull();
    expect(cycleWear(f, REWARDS, 'paint')).toBe('paint-blue');
    expect(f.hat).toBeNull();
    expect(cycleWear(f, REWARDS, 'hat')).toBe('hat-straw');
  });
  it('does nothing when he owns none', () => {
    const f = farm();
    expect(cycleWear(f, REWARDS, 'hat')).toBeNull();
    expect(f.hat).toBeNull();
  });
});

describe('ownedUpgrades and isPlaceable', () => {
  it('lists upgrades in the order of the reward list', () => {
    expect(ownedUpgrades(farm({ rewards: ['upgrade-barn', 'friend-duck', 'upgrade-fence'] }), REWARDS)).toEqual(['fence', 'barn']);
  });
  it('knows what can be placed', () => {
    expect(REWARDS.filter(isPlaceable).map((r) => r.id)).toEqual(['friend-duck', 'deco-balloon']);
    expect(isPlaceable(undefined)).toBe(false);
  });
});
