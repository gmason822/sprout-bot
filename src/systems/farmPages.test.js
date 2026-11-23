import { describe, it, expect } from 'vitest';
import { PAGES, HOME_PAGE, PAGE_WIDTH, pageOf, pageX, openPages, farmPages, neighbour, livesOn, directionTo } from './farmPages.js';

describe('the pages', () => {
  it('has Home in the middle', () => {
    expect(PAGES[(PAGES.length - 1) / 2]).toBe(HOME_PAGE);
  });
  it('lays them side by side', () => {
    expect(pageX(PAGES[0])).toBe(0);
    expect(pageX('home')).toBe(PAGES.indexOf('home') * PAGE_WIDTH);
    expect(pageX('crops') - pageX('home')).toBe(PAGE_WIDTH);
    expect(pageX(undefined)).toBe(pageX('home'));
  });
  it('puts anything unsaid, or misspelt, at Home', () => {
    expect(pageOf({ page: 'crops' })).toBe('crops');
    expect(pageOf({})).toBe('home');
    expect(pageOf({ page: 'moon' })).toBe('home');
    expect(pageOf(undefined)).toBe('home');
  });
});

describe('openPages', () => {
  it('is Home alone on an empty farm', () => {
    expect(openPages([])).toEqual(['home']);
    expect(openPages(['home'])).toEqual(['home']);
  });
  it('opens a page once something is built on it', () => {
    expect(openPages(['home', 'crops'])).toEqual(['home', 'crops']);
    expect(openPages(['animals', 'crops', 'home'])).toEqual(['animals', 'home', 'crops']);
    expect(openPages(PAGES)).toEqual(PAGES);
  });
  it('cannot reach a page beyond an empty one', () => {
    expect(openPages(['pond'])).toEqual(['home']);
    expect(openPages(['pond', 'yard', 'crops'])).toEqual(['home', 'crops', 'yard']);
  });
});

describe('farmPages', () => {
  const rewards = [
    { id: 'upgrade-tent', type: 'upgrade', value: 'tent' },
    { id: 'upgrade-garden', type: 'upgrade', value: 'garden', page: 'crops' },
    { id: 'upgrade-coop', type: 'upgrade', value: 'coop', page: 'animals' },
    { id: 'friend-duck', type: 'friend', page: 'animals' },
  ];
  it('counts only buildings he owns', () => {
    expect(farmPages({ rewards: [] }, rewards)).toEqual(['home']);
    expect(farmPages({ rewards: ['upgrade-tent', 'upgrade-garden'] }, rewards)).toEqual(['home', 'crops']);
    // A friend is not a building: it does not open its page.
    expect(farmPages({ rewards: ['friend-duck'] }, rewards)).toEqual(['home']);
  });
});

describe('neighbour and directionTo', () => {
  const open = ['animals', 'home', 'crops'];
  it('finds the page next door', () => {
    expect(neighbour('home', -1, open)).toBe('animals');
    expect(neighbour('home', 1, open)).toBe('crops');
  });
  it('stops at the last open page', () => {
    expect(neighbour('crops', 1, open)).toBeNull();
    expect(neighbour('animals', -1, open)).toBeNull();
    expect(neighbour('pond', -1, PAGES)).toBeNull();
    expect(neighbour('home', 1, ['home'])).toBeNull();
  });
  it('knows which way a page lies', () => {
    expect(directionTo('home', 'pond')).toBe(-1);
    expect(directionTo('home', 'yard')).toBe(1);
    expect(directionTo('crops', 'crops')).toBe(0);
  });
});

describe('livesOn', () => {
  it('keeps a thing at Home until its own page opens', () => {
    const duck = { id: 'friend-duck', page: 'pond' };
    expect(livesOn(duck, ['home'])).toBe('home');
    expect(livesOn(duck, PAGES)).toBe('pond');
    expect(livesOn({ id: 'small-rock' }, PAGES)).toBe('home');
  });
});
