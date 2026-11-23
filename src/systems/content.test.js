import { describe, it, expect, vi } from 'vitest';
import { validateContent, loadContent } from './content.js';
import { GENERATOR_IDS } from '../skills/index.js';
import { PAGES, pageOf } from './farmPages.js';

const good = () => ({
  letters: { letters: [{ id: 'B' }, { id: 'C', sameSoundAs: ['K'] }, { id: 'K', sameSoundAs: ['C'] }] },
  skills: { skills: [
    { id: 'count', answer: 'count', tiers: [{ id: 'a', min: 1, max: 5 }, { id: 'b', min: 1, max: 10, unlockAfter: 'a' }] },
    { id: 'letters', answer: 'pick', tiers: [{ id: 'letter-name' }, { id: 'letter-sound', perItemAfter: 'letter-name' }] },
  ] },
  animals: { animals: [{ id: 'hen', skill: 'count' }, { id: 'cow', skill: 'letters' }] },
  rewards: { rewards: [{ id: 'r1', type: 'friend', emoji: '🦆', day: 1 }, { id: 'p1', type: 'paint', value: '#fff', day: 3 }] },
});
const GEN = ['count', 'letters', 'leftright'];

describe('validateContent', () => {
  it('accepts good content untouched', () => {
    const { content, errors } = validateContent(good(), GEN);
    expect(errors).toEqual([]);
    expect(content.animals).toHaveLength(2);
    expect(content.skills).toHaveLength(2);
    expect(content.letters).toHaveLength(3);
    expect(content.rewards).toHaveLength(2);
  });

  it('skips a skill with no generator, and the animal that owns it', () => {
    const raw = good();
    raw.skills.skills.push({ id: 'shapes', answer: 'pick', tiers: [{ id: 't' }] });
    raw.animals.animals.push({ id: 'owl', skill: 'shapes' });
    const { content, errors } = validateContent(raw, GEN);
    expect(content.skills.map((s) => s.id)).toEqual(['count', 'letters']);
    expect(content.animals.map((a) => a.id)).toEqual(['hen', 'cow']);
    // The skill, the game the owl cannot play, and the owl left with nothing.
    expect(errors).toHaveLength(3);
  });

  it('lets an animal own a family of games, each game belonging to one animal', () => {
    const raw = good();
    raw.animals.animals = [{ id: 'hen', skills: ['count', 'letters', 'juggling'] }, { id: 'cow', skills: ['letters'] }, { id: 'pig', skill: 'count' }];
    const { content, errors } = validateContent(raw, GEN);
    // The hen keeps the two games that exist. The cow and pig only wanted games the hen has.
    expect(content.animals).toEqual([{ id: 'hen', skills: ['count', 'letters'] }]);
    expect(errors).toHaveLength(5);
    // A lone 'skill' is still read, and comes out as a family of one.
    const old = good();
    expect(validateContent(old, GEN).content.animals.map((a) => a.skills)).toEqual([['count'], ['letters']]);
  });

  it('skips a skill with a bad answer kind or a broken tier link', () => {
    const raw = good();
    raw.skills.skills[0].answer = 'draw';
    raw.skills.skills[1].tiers[1].perItemAfter = 'nope';
    const { content, errors } = validateContent(raw, GEN);
    expect(content.skills).toEqual([]);
    expect(content.animals).toEqual([]);
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });

  it('skips duplicate and malformed letters, and drops bad references', () => {
    const raw = good();
    raw.letters.letters.push({ id: 'B' }, { id: 'bb' }, { id: 'D', looksLike: ['B', '?'] });
    const { content, errors } = validateContent(raw, GEN);
    expect(content.letters.map((l) => l.id)).toEqual(['B', 'C', 'K', 'D']);
    expect(content.letters.find((l) => l.id === 'D').looksLike).toEqual(['B']);
    expect(errors).toHaveLength(3);
  });

  it('skips bad rewards', () => {
    const raw = good();
    raw.rewards.rewards.push({ id: 'r1', type: 'friend', emoji: '🦆', day: 2 }, { id: 'x', type: 'car', day: 2 }, { id: 'p2', type: 'paint', day: 2 }, { id: 'h1', type: 'hat', day: 2 }, { id: 'f2', type: 'friend', emoji: '🐑' }, { id: 'f3', type: 'friend', emoji: '🐑', day: 0 });
    const { content, errors } = validateContent(raw, GEN);
    expect(content.rewards.map((r) => r.id)).toEqual(['r1', 'p1']);
    // A duplicate, an unknown type, a paint with no colour, a hat with no picture,
    // and two friends with no usable day.
    expect(errors).toHaveLength(6);
  });

  it('checks small things and upgrades', () => {
    const raw = good();
    raw.rewards.rewards.push({ id: 'u1', type: 'upgrade', value: 'barn', day: 5 }, { id: 'u2', type: 'upgrade', day: 6 });
    raw.rewards.small = [
      { id: 'small-rock', emoji: '🪨' },
      { id: 'friend-dog', type: 'friend', emoji: '🐶', once: true },
      { id: 'paint-red', type: 'paint', value: '#f00', once: true, needs: 'barn' },
      { id: 'small-x' },                                             // nothing to draw
      { id: 'small-rock', emoji: '🪨' },                              // twice
      { id: 'thing', type: 'car', emoji: '🚗' },                      // unknown type
      { id: 'paint-loose', type: 'paint', value: '#0f0' },           // a paint that could repeat
      { id: 'hat-early', type: 'hat', emoji: '🎩', once: true, needs: 'castle' },  // needs a building that is not there
    ];
    const { content, errors } = validateContent(raw, GEN);
    expect(content.rewards.map((r) => r.id)).toEqual(['r1', 'p1', 'u1']);
    expect(content.small.map((r) => r.id)).toEqual(['small-rock', 'friend-dog', 'paint-red']);
    expect(errors).toHaveLength(6);
  });

  it('checks pages and stages', () => {
    const raw = good();
    raw.rewards.rewards.push(
      { id: 'u1', type: 'upgrade', value: 'tent', day: 5 },
      { id: 'u2', type: 'upgrade', value: 'cabin', day: 8, replaces: 'tent' },
      { id: 'u3', type: 'upgrade', value: 'coop', day: 9, page: 'animals' },
      { id: 'u4', type: 'upgrade', value: 'moonbase', day: 10, page: 'moon' },             // no such page
      { id: 'u5', type: 'upgrade', value: 'pen', day: 11, page: 'animals', replaces: 'tent' },  // the tent is on another page
      { id: 'u6', type: 'upgrade', value: 'early', day: 2, replaces: 'tent' },             // arrives before what it replaces
      { id: 'u7', type: 'upgrade', value: 'castle', day: 12, replaces: 'palace' },         // replaces nothing
    );
    raw.rewards.small = [{ id: 'friend-pig', type: 'friend', emoji: '🐖', once: true, page: 'animals' }, { id: 'small-x', emoji: '🪨', page: 'sea' }];
    const { content, errors } = validateContent(raw, GEN);
    const by = Object.fromEntries([...content.rewards, ...content.small].map((r) => [r.id, r]));
    expect(by.u2.replaces).toBe('tent');
    expect(by.u3.page).toBe('animals');
    // The thing is kept, and the bad part dropped: it lives at home and replaces nothing.
    expect(by.u4.page).toBeUndefined();
    expect(by.u5.replaces).toBeUndefined();
    expect(by.u6.replaces).toBeUndefined();
    expect(by.u7.replaces).toBeUndefined();
    expect(by['friend-pig'].page).toBe('animals');
    expect(by['small-x'].page).toBeUndefined();
    expect(errors).toHaveLength(5);
  });

  it('drops a noise the game cannot make, and keeps the thing', () => {
    const raw = good();
    raw.animals.animals[0].sound = 'cluck';
    raw.animals.animals[1].sound = 'roar';
    raw.rewards.small = [{ id: 's1', emoji: '🦆', sound: 'quack' }, { id: 's2', emoji: '🐉', sound: 'fire' }];
    const { content, errors } = validateContent(raw, GEN, ['cluck', 'quack']);
    expect(content.animals.map((a) => a.sound)).toEqual(['cluck', undefined]);
    expect(content.small.map((s) => s.sound)).toEqual(['quack', undefined]);
    expect(errors).toHaveLength(2);
    // Without a list of noises nothing is checked (the voice tools do not need one).
    expect(validateContent(raw, GEN).errors).toEqual([]);
  });

  it('skips bad words', () => {
    const raw = good();
    raw.words = { words: [{ id: 'cat', emoji: '🐱' }, { id: 'cat', emoji: '🐱' }, { id: 'Dog', emoji: '🐶' }, { id: 'sun' }] };
    const { content, errors } = validateContent(raw, GEN);
    expect(content.words.map((w) => w.id)).toEqual(['cat']);
    expect(errors).toHaveLength(3);
  });

  it('survives files that are missing or the wrong shape', () => {
    const { content, errors } = validateContent({}, GEN);
    expect(content).toEqual({ animals: [], skills: [], letters: [], rewards: [], small: [], words: [], colours: [], groups: [] });
    expect(errors).toHaveLength(4);
  });
});

describe('the real content files', () => {
  it('load with no errors', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const content = loadContent(GENERATOR_IDS);
    expect(spy).not.toHaveBeenCalled();
    expect(content.animals.length).toBeGreaterThanOrEqual(6);
    expect(content.words.length).toBeGreaterThan(20);
    expect(content.small.length).toBeGreaterThan(10);
    // Every big reward is a farm building, and every paint and hat is a one-off small thing.
    expect(content.rewards.length).toBeGreaterThan(10);
    expect(content.rewards.every((r) => r.type === 'upgrade')).toBe(true);
    expect(content.small.filter((r) => r.type === 'paint' || r.type === 'hat').every((r) => r.once)).toBe(true);
    expect(content.letters).toHaveLength(26);
    // The farm widens one page at a time: a page's first building never arrives
    // before the page between it and home has one.
    const firstDay = (page) => Math.min(...content.rewards.filter((r) => pageOf(r) === page).map((r) => r.day));
    const home = PAGES.indexOf('home');
    PAGES.forEach((page, i) => {
      if (i === home || firstDay(page) === Infinity) return;
      const inner = PAGES[i + Math.sign(home - i)];
      if (inner !== 'home') expect(firstDay(page), page).toBeGreaterThan(firstDay(inner));
    });
    // Day 1 builds at home.
    expect(pageOf(content.rewards.find((r) => r.day === 1))).toBe('home');
    // Most animals have a noise of their own; one without stays quiet.
    expect(content.animals.filter((a) => typeof a.sound === 'string').length).toBeGreaterThanOrEqual(5);
    spy.mockRestore();
  });
});
