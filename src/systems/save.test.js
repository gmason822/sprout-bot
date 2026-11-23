import { describe, it, expect } from 'vitest';
import { createStore, migrate, defaultSave, SAVE_KEY } from './save.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}
const brokenStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('full'); },
  removeItem() { throw new Error('blocked'); },
};

describe('migrate', () => {
  it('gives defaults for nothing or nonsense', () => {
    for (const raw of [null, undefined, 7, 'x', [], {}]) expect(migrate(raw)).toEqual(defaultSave());
  });

  it('keeps a good save as it is', () => {
    const good = {
      ...defaultSave(),
      settings: { childName: 'Sam', deliveriesPerDay: 7, volume: 0.5, ttsOnly: true },
      mastery: { 'count:3': { box: 4, seen: 6, correct: 5, lastSeen: 123 } },
      farm: { rewards: ['friend-duck', 'paint-blue'], paint: 'paint-blue', hat: null, box: ['small-tulip', 'small-tulip'], placed: [{ item: 'friend-duck', x: 400, y: 450 }], log: [{ day: 1, id: 'friend-duck' }, { day: 2, id: 'small-tulip' }] },
      days: 3,
      today: [{ art: 'apple', numeral: 3 }, { art: 'crate', label: 'B' }, { art: 'shape-star', tint: 0xef4444 }, { emoji: '🚗', angle: 90, flipX: true }],
      skillLog: ['count', 'letters'],
      lastItem: { count: 'count:3' },
    };
    expect(migrate(JSON.parse(JSON.stringify(good)))).toEqual(good);
  });

  it('repairs bad fields one at a time and keeps the rest', () => {
    const save = migrate({
      settings: { childName: 42, deliveriesPerDay: 99, volume: 'loud', ttsOnly: 'yes' },
      mastery: { ok: { box: 9, seen: 2, correct: 5 }, junk: 'no', alsoJunk: { box: 'x' } },
      farm: { rewards: ['a', 'a', 3], paint: 'not-owned', hat: 'a', box: ['x', 7], placed: [{ item: 'x', x: 10.6, y: 20 }, { item: 'y' }, 'junk'], log: [{ day: 2.2, id: 'x' }, { day: 'soon', id: 'y' }, 'junk'] },
      days: -4,
      bookmark: 'yesterday',
      today: [{ art: 'apple' }, { nope: 1 }, 'x'],
      skillLog: ['count', 5],
      lastItem: { count: 'count:2', bad: 9 },
    });
    expect(save.settings).toEqual({ childName: '', deliveriesPerDay: 10, volume: 0.8, ttsOnly: false });
    expect(save.mastery).toEqual({ ok: { box: 5, seen: 2, correct: 2, lastSeen: 0 } });
    expect(save.farm).toEqual({ rewards: ['a'], paint: null, hat: 'a', box: ['x'], placed: [{ item: 'x', x: 11, y: 20 }], log: [{ day: 2, id: 'x' }] });
    expect(save.bookmark).toBeNull();
    expect(save.days).toBe(0);
    expect(save.today).toEqual([{ art: 'apple' }]);
    expect(save.skillLog).toEqual(['count']);
    expect(save.lastItem).toEqual({ count: 'count:2' });
  });

  it('keeps the day length within 3 to 10', () => {
    expect(migrate({ settings: { deliveriesPerDay: 1 } }).settings.deliveriesPerDay).toBe(3);
    expect(migrate({ settings: { deliveriesPerDay: 6.4 } }).settings.deliveriesPerDay).toBe(6);
  });

  it('trims a long name', () => {
    expect(migrate({ settings: { childName: `  ${'x'.repeat(50)} ` } }).settings.childName).toHaveLength(20);
  });
});

describe('createStore', () => {
  it('round-trips through storage', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    const state = store.load();
    state.days = 2;
    state.farm.rewards.push('friend-duck');
    expect(store.save(state)).toBe(true);
    expect(JSON.parse(storage.data[SAVE_KEY]).days).toBe(2);
    expect(createStore(storage).load().farm.rewards).toEqual(['friend-duck']);
  });

  it('starts fresh when the stored text is corrupt', () => {
    const store = createStore(fakeStorage({ [SAVE_KEY]: '{not json' }));
    expect(store.load()).toEqual(defaultSave());
  });

  it('falls back to memory when storage throws', () => {
    const store = createStore(brokenStorage);
    const state = store.load();
    expect(state).toEqual(defaultSave());
    state.days = 5;
    expect(store.save(state)).toBe(false);
    expect(store.load().days).toBe(5);
  });

  it('works with no storage at all', () => {
    const store = createStore(null);
    const state = store.load();
    state.days = 1;
    expect(store.save(state)).toBe(false);
    expect(store.load().days).toBe(1);
  });

  it('does not let later changes leak into the memory copy', () => {
    const store = createStore(null);
    const state = store.load();
    store.save(state);
    state.farm.rewards.push('sneaky');
    expect(store.load().farm.rewards).toEqual([]);
  });

  it('caps the skill log', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    const state = store.load();
    state.skillLog = Array(250).fill('count');
    store.save(state);
    expect(store.load().skillLog).toHaveLength(100);
  });

  it('reset clears everything', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    const state = store.load();
    state.days = 9;
    store.save(state);
    store.reset();
    expect(store.load()).toEqual(defaultSave());
    expect(SAVE_KEY in storage.data).toBe(false);
  });
});
