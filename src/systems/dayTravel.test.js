import { describe, it, expect } from 'vitest';
import { travelToDay, keepBookmark, restoreBookmark, buildingsAt } from './dayTravel.js';
import { endDay } from './day.js';
import { defaultSave, migrate } from './save.js';
import { ownedUpgrades } from './home.js';

const REWARDS = [
  { day: 1, id: 'upgrade-tent', type: 'upgrade', value: 'tent' },
  { day: 3, id: 'upgrade-garage', type: 'upgrade', value: 'garage' },
  { day: 6, id: 'upgrade-barn', type: 'upgrade', value: 'barn' },
];
const SMALL = [
  { id: 'small-tulip', emoji: 'x' },
  { id: 'friend-duck', type: 'friend', emoji: 'x', once: true },
  { id: 'paint-blue', type: 'paint', value: '#00f', once: true, needs: 'garage' },
];
const first = () => 0;      // always the first thing on offer
const last = () => 0.999;   // always the last

const things = (farm) => [...farm.box, ...farm.placed.map((p) => p.item)].sort();

describe('travelToDay', () => {
  it('going forward gives every skipped day its one reward', () => {
    const state = travelToDay(defaultSave(), 6, REWARDS, SMALL, first);
    expect(state.days).toBe(6);
    expect(ownedUpgrades(state.farm, REWARDS)).toEqual(['tent', 'garage', 'barn']);
    // Days 2, 4 and 5 were ordinary days: one small thing each.
    expect(state.farm.box).toEqual(['small-tulip', 'small-tulip', 'small-tulip']);
    expect(state.farm.log.map((e) => e.day)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('going back takes away what came after that day, and nothing else', () => {
    const state = travelToDay(defaultSave(), 2, REWARDS, SMALL, first);
    state.farm.placed.push({ item: state.farm.box.pop(), x: 300, y: 400 });
    const before = JSON.parse(JSON.stringify(state.farm));

    travelToDay(state, 6, REWARDS, SMALL, last);
    expect(state.farm.rewards).toContain('paint-blue');
    expect(state.farm.paint).toBe('paint-blue');

    travelToDay(state, 2, REWARDS, SMALL);
    expect(state.days).toBe(2);
    expect(state.farm).toEqual(before);
  });

  it('removes a placed copy when none is left on the shelf', () => {
    const state = travelToDay(defaultSave(), 2, REWARDS, SMALL, first);
    state.farm.placed.push({ item: state.farm.box.pop(), x: 300, y: 400 });
    travelToDay(state, 1, REWARDS, SMALL);
    expect(things(state.farm)).toEqual([]);
    expect(ownedUpgrades(state.farm, REWARDS)).toEqual(['tent']);
  });

  it('a one-off friend can be earned again after it is taken back', () => {
    const duck = () => 0.5;
    const state = travelToDay(defaultSave(), 2, REWARDS, SMALL, duck);
    expect(state.farm.rewards).toContain('friend-duck');
    travelToDay(state, 1, REWARDS, SMALL);
    expect(state.farm.rewards).not.toContain('friend-duck');
    expect(things(state.farm)).toEqual([]);
  });

  it('takes buildings off an older save that has no log, by their scheduled day', () => {
    const state = defaultSave();
    state.days = 7;
    state.farm.rewards = ['upgrade-tent', 'upgrade-garage', 'upgrade-barn'];
    state.farm.box = ['small-tulip'];
    travelToDay(state, 4, REWARDS, SMALL);
    expect(ownedUpgrades(state.farm, REWARDS)).toEqual(['tent', 'garage']);
    // Nothing says when the tulip arrived, so it is left alone.
    expect(state.farm.box).toEqual(['small-tulip']);
  });

  it('matches what playing the days would have given', () => {
    const played = defaultSave();
    for (let day = 0; day < 6; day++) {
      played.today = [{ art: 'apple' }];
      endDay(played, REWARDS, SMALL, first);
    }
    const jumped = travelToDay(defaultSave(), 6, REWARDS, SMALL, first);
    expect(jumped.farm).toEqual(played.farm);
    expect(jumped.days).toBe(played.days);
  });

  it('never goes below zero', () => {
    expect(travelToDay(defaultSave(), -4, REWARDS, SMALL).days).toBe(0);
  });
});

describe('the bookmark', () => {
  it('puts his real farm back exactly, however far the testing went', () => {
    const state = travelToDay(defaultSave(), 4, REWARDS, SMALL, first);
    state.farm.placed.push({ item: state.farm.box.pop(), x: 300, y: 400 });
    const real = JSON.parse(JSON.stringify({ days: state.days, today: state.today, farm: state.farm }));

    keepBookmark(state);
    travelToDay(state, 0, REWARDS, SMALL);
    keepBookmark(state);            // a second change must not overwrite the real one
    travelToDay(state, 6, REWARDS, SMALL, last);
    expect(state.bookmark.days).toBe(4);

    expect(restoreBookmark(state)).toBe(true);
    expect({ days: state.days, today: state.today, farm: state.farm }).toEqual(real);
    expect(state.bookmark).toBeNull();
    expect(restoreBookmark(state)).toBe(false);
  });

  it('survives being saved and loaded', () => {
    const state = keepBookmark(travelToDay(defaultSave(), 3, REWARDS, SMALL, first));
    travelToDay(state, 6, REWARDS, SMALL, first);
    const loaded = migrate(JSON.parse(JSON.stringify(state)));
    expect(loaded.bookmark).toEqual(state.bookmark);
    expect(loaded.farm.log).toEqual(state.farm.log);
  });
});

describe('buildingsAt', () => {
  it('lists what the schedule has given and what is next', () => {
    const at = buildingsAt(REWARDS, 4);
    expect(at.have.map((r) => r.value)).toEqual(['tent', 'garage']);
    expect(at.next.value).toBe('barn');
    expect(at.total).toBe(3);
    expect(buildingsAt(REWARDS, 9).next).toBeNull();
  });
});
