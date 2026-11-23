import { describe, it, expect } from 'vitest';
import { EVERYTHING_SOLID, masteryFor, animalsToOffer, gameList } from './tryGame.js';
import { isSolid, boxOf, activeItems } from './mastery.js';
import { loadContent } from './content.js';
import { GENERATOR_IDS, makeRequest } from '../skills/index.js';

describe('trying a game', () => {
  it('can pretend he is solid on everything, to bring every level into play', () => {
    expect(isSolid(EVERYTHING_SOLID, 'anything:at-all')).toBe(true);
    expect(boxOf(EVERYTHING_SOLID, 'count:9')).toBe(3);
    expect(activeItems(['a', 'b', 'c', 'd'], EVERYTHING_SOLID, 1)).toEqual(['a', 'b', 'c', 'd']);
    const mine = { 'count:1': { box: 1 } };
    expect(masteryFor(null, mine)).toBe(mine);
    expect(masteryFor({ skill: 'count', allLevels: false }, mine)).toBe(mine);
    expect(masteryFor({ skill: 'count', allLevels: true }, mine)).toBe(EVERYTHING_SOLID);
  });

  it('offers only the chosen game, or everything if it has nothing to ask', () => {
    const ready = [{ id: 'hen', skill: 'count' }, { id: 'cow', skill: 'letters' }];
    expect(animalsToOffer(null, ready)).toBeNull();
    expect(animalsToOffer({ skill: 'letters' }, ready)).toEqual([ready[1]]);
    expect(animalsToOffer({ skill: 'gone' }, ready)).toBeNull();
  });

  it('lists every game by its animal and what it teaches', () => {
    const content = loadContent(GENERATOR_IDS);
    const list = gameList(content);
    expect(list).toHaveLength(content.animals.length);
    expect(list.find((g) => g.skill === 'count').label).toBe('Hen: Counting');
    for (const game of list) expect(game.label).not.toMatch(/undefined/);
  });

  it('every game can ask something with every level unlocked', () => {
    const content = loadContent(GENERATOR_IDS);
    for (const animal of content.animals) {
      for (let i = 0; i < 50; i++) {
        const request = makeRequest(animal.skill, { content, mastery: EVERYTHING_SOLID, hasClip: () => false, childName: '' });
        expect(request, animal.skill).not.toBeNull();
      }
    }
  });
});

describe('remembering the game being tried', () => {
  const fake = () => {
    const data = new Map();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
  };

  it('keeps it for the sitting, and forgets it when told to', async () => {
    const { loadTrying, saveTrying } = await import('./tryGame.js');
    const storage = fake();
    expect(loadTrying(storage)).toBeNull();
    saveTrying({ skill: 'shapes', allLevels: true }, storage);
    expect(loadTrying(storage)).toEqual({ skill: 'shapes', allLevels: true });
    saveTrying(null, storage);
    expect(loadTrying(storage)).toBeNull();
  });

  it('ignores nonsense and missing storage', async () => {
    const { loadTrying, saveTrying } = await import('./tryGame.js');
    const storage = fake();
    storage.setItem('sproutbot.try', '{"skill":7}');
    expect(loadTrying(storage)).toBeNull();
    storage.setItem('sproutbot.try', 'not json');
    expect(loadTrying(storage)).toBeNull();
    expect(loadTrying(null)).toBeNull();
    expect(saveTrying({ skill: 'count', allLevels: false }, null)).toBe(false);
  });
});
