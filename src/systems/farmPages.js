// The home farm is one wide place made of pages, side by side, with Home in the
// middle. The truck drives from one to the next. A page only exists once something
// has been built on it, so the farm gets wider as he plays. Pure, with no imports.

// Left to right, as they lie on the ground.
export const PAGES = ['pond', 'animals', 'home', 'crops', 'yard'];
export const HOME_PAGE = 'home';
// One page fills the screen.
export const PAGE_WIDTH = 1280;

export const isPage = (id) => PAGES.includes(id);

/** The page a building or small thing belongs on. Anything unsaid lives at Home. */
export const pageOf = (item) => (isPage(item?.page) ? item.page : HOME_PAGE);

/** Where a page starts in the wide world, in game pixels. An unknown page is Home. */
export const pageX = (page) => PAGES.indexOf(isPage(page) ? page : HOME_PAGE) * PAGE_WIDTH;

/**
 * The pages he can drive to, left to right: Home, and each page outwards from it
 * that has something built on it. A page beyond an empty one cannot be reached, so
 * it does not count until the one before it opens. `built` is the pages that have a
 * building.
 */
export function openPages(built) {
  const has = new Set(built);
  const home = PAGES.indexOf(HOME_PAGE);
  let first = home;
  let last = home;
  while (first > 0 && has.has(PAGES[first - 1])) first--;
  while (last < PAGES.length - 1 && has.has(PAGES[last + 1])) last++;
  return PAGES.slice(first, last + 1);
}

/** The pages open on this farm. `rewards` is the list of big rewards. */
export function farmPages(farm, rewards) {
  return openPages(rewards.filter((r) => r.type === 'upgrade' && farm.rewards.includes(r.id)).map(pageOf));
}

/** The page next door: `dir` is -1 for left, 1 for right. Null if there is none yet. */
export function neighbour(page, dir, open) {
  const next = PAGES[PAGES.indexOf(page) + dir];
  return next !== undefined && open.includes(next) ? next : null;
}

/**
 * Where a thing is kept: its own page once that page is open, and Home until then,
 * so nothing he owns is ever out of reach.
 */
export function livesOn(item, open) {
  const page = pageOf(item);
  return open.includes(page) ? page : HOME_PAGE;
}

/** Which way to drive from `from` to reach `to`: -1, 0 or 1. */
export function directionTo(from, to) {
  return Math.sign(PAGES.indexOf(to) - PAGES.indexOf(from));
}
