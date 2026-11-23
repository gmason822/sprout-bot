// The home farm: what he has earned, what is waiting in the gift box, and where he
// has put things. Pure functions over `state.farm`:
//
//   rewards  ids of the big rewards he owns (friends, hats, paints, upgrades...)
//   box      ids of things waiting to be placed, oldest first (repeats allowed)
//   placed   [{ item, x, y, page }] things standing on the farm; x and y are
//            measured within the page (see farmPages.js)
//   paint, hat   what the truck and robot are wearing

import { HOME_PAGE, pageOf, farmPages, livesOn } from './farmPages.js';

// Each placed thing is its own picture, so there is a limit to how many a phone
// can show comfortably. Past it, the oldest small thing makes room for the new one.
export const MAX_THINGS = 120;

// Where things may stand on one page of the home farm, in game pixels.
// The buildings stand along the back, so the field starts below their feet, and it
// stops short of the sides, where the arrows to the next page are.
export const FIELD = { left: 150, right: 1130, top: 378, bottom: 590 };

const PLACEABLE = ['friend', 'decoration'];

/** Can this thing stand on the farm? A small thing with no type is a plain decoration. */
export function isPlaceable(item) {
  return Boolean(item) && PLACEABLE.includes(item.type ?? 'decoration');
}

// Only plain, repeatable things are ever recycled when the farm is full.
const isSmall = (id) => id.startsWith('small-');

/** Make room if the farm is full, by letting the oldest small thing go. */
function makeRoom(farm) {
  if (farm.box.length + farm.placed.length < MAX_THINGS) return;
  const waiting = farm.box.findIndex(isSmall);
  if (waiting >= 0) return void farm.box.splice(waiting, 1);
  const standing = farm.placed.findIndex((p) => isSmall(p.item));
  if (standing >= 0) farm.placed.splice(standing, 1);
}

/**
 * Which small things could be given today. `upgrades` are the buildings he owns, and
 * `open` the pages he can drive to (left out, every page counts as open).
 */
export function smallOnOffer(farm, small, upgrades = [], open = null) {
  return small.filter((s) => {
    if (s.once && farm.rewards.includes(s.id)) return false;   // he already has it
    if (s.needs && !upgrades.includes(s.needs)) return false;  // e.g. paint before the garage
    if (open && !open.includes(pageOf(s))) return false;       // e.g. a piglet before there is anywhere for it
    return true;
  });
}

/**
 * An ordinary day's reward: one small thing, picked at random. A friend or decoration
 * goes on the shelf for him to place; a paint or hat goes straight on. Something
 * marked `once` is remembered so it is never given twice.
 */
export function earnSmall(farm, small, rng = Math.random, upgrades = [], open = null) {
  const offer = smallOnOffer(farm, small ?? [], upgrades, open);
  if (offer.length === 0) return null;
  const item = offer[Math.min(offer.length - 1, Math.floor(rng() * offer.length))];
  if (item.once) farm.rewards.push(item.id);
  if (item.type === 'paint' || item.type === 'hat') {
    farm[item.type] = item.id;
  } else {
    makeRoom(farm);
    farm.box.push(item.id);
  }
  return item;
}

/**
 * Make an older save, or one from before a content change, fit today's content:
 * anything he owns that can be placed but is neither placed nor waiting goes into
 * the box, and anything that no longer exists is dropped. Each placed thing stands
 * on its own page, where it was, or at Home while that page is not open.
 */
export function reconcileFarm(farm, rewards, small) {
  const known = new Map([...rewards, ...small].map((r) => [r.id, r]));
  const open = farmPages(farm, rewards);
  farm.box = farm.box.filter((id) => known.has(id));
  // Things placed before the field changed shape are nudged back inside it.
  farm.placed = farm.placed.filter((p) => known.has(p.item))
    .map((p) => ({ item: p.item, ...clampToField(p.x, p.y), page: livesOn(known.get(p.item), open) }));
  const accounted = new Set([...farm.box, ...farm.placed.map((p) => p.item)]);
  for (const id of farm.rewards) {
    if (isPlaceable(known.get(id)) && !accounted.has(id)) farm.box.push(id);
  }
  for (const slot of ['paint', 'hat']) {
    if (farm[slot] && !known.has(farm[slot])) farm[slot] = null;
  }
  return farm;
}

export function clampToField(x, y) {
  return {
    x: Math.round(Math.max(FIELD.left, Math.min(FIELD.right, x))),
    y: Math.round(Math.max(FIELD.top, Math.min(FIELD.bottom, y))),
  };
}

/**
 * What is waiting on one page's shelf, oldest first: [{ id, index }], where `index`
 * is the thing's place in the whole gift box. `items` is every reward, big and small,
 * and `open` the pages he can drive to.
 */
export function boxFor(farm, items, page, open) {
  const known = new Map(items.map((r) => [r.id, r]));
  return farm.box
    .map((id, index) => ({ id, index }))
    .filter(({ id }) => livesOn(known.get(id), open) === page);
}

/** Take the thing at `boxIndex` out of the gift box and stand it on a page of the farm. */
export function placeFromBox(farm, boxIndex, x, y, page = HOME_PAGE) {
  const item = farm.box[boxIndex];
  if (item === undefined) return null;
  farm.box.splice(boxIndex, 1);
  const thing = { item, ...clampToField(x, y), page };
  farm.placed.push(thing);
  return thing;
}

export function moveThing(thing, x, y) {
  Object.assign(thing, clampToField(x, y));
  return thing;
}

/** Put a placed thing back in the gift box. */
export function putAway(farm, thing) {
  const i = farm.placed.indexOf(thing);
  if (i < 0) return false;
  farm.placed.splice(i, 1);
  farm.box.push(thing.item);
  return true;
}

/**
 * A free spot on a page for something new: near the middle, away from what is
 * already there if possible, so things do not land in one heap.
 */
export function freeSpot(farm, rng = Math.random, page = HOME_PAGE) {
  const here = farm.placed.filter((p) => (p.page ?? HOME_PAGE) === page);
  let best = null;
  let bestGap = -1;
  for (let attempt = 0; attempt < 12; attempt++) {
    const spot = clampToField(260 + rng() * 560, FIELD.top + 10 + rng() * (FIELD.bottom - FIELD.top - 30));
    const gap = Math.min(...here.map((p) => Math.hypot(p.x - spot.x, p.y - spot.y)), Infinity);
    if (gap > bestGap) {
      best = spot;
      bestGap = gap;
    }
    if (gap > 110) break;
  }
  return best;
}

/**
 * Everything of one kind he can choose between: "none" first (the plain green truck,
 * or a bare head), then each one he owns. `items` is every reward, big and small;
 * `type` is 'paint' or 'hat'. Returns [null, item, item...].
 */
export function wearOptions(farm, items, type) {
  return [null, ...items.filter((r) => r.type === type && farm.rewards.includes(r.id))];
}

/** Put on the paint or hat with this id, or take it off with null. Only what he owns. */
export function setWear(farm, items, type, id) {
  if (type !== 'paint' && type !== 'hat') return false;
  if (id !== null && !wearOptions(farm, items, type).some((r) => r?.id === id)) return false;
  farm[type] = id;
  return true;
}

// Some buildings grow in stages: a reward's `replaces` names the building it is the
// next stage of (tent, cabin, farmhouse, big farmhouse). Only the best stage he owns
// is drawn.

const ownedBuildingRewards = (farm, rewards) => rewards.filter((r) => r.type === 'upgrade' && farm.rewards.includes(r.id));

/** Every stage below `value`, nearest first, whether he owns them or not. */
function stagesBelow(rewards, value) {
  const below = [];
  let stage = rewards.find((r) => r.type === 'upgrade' && r.value === value);
  // The length check stops a list that replaces itself in a circle.
  while (stage?.replaces && below.length < rewards.length) {
    below.push(stage.replaces);
    stage = rewards.find((r) => r.type === 'upgrade' && r.value === stage.replaces);
  }
  return below;
}

/** Every building he has earned, including stages that have since been replaced. */
export function ownedBuildings(farm, rewards) {
  return ownedBuildingRewards(farm, rewards).map((r) => r.value);
}

/** Has a later stage of this building already been earned? */
export function isSuperseded(farm, rewards, value) {
  return ownedBuildings(farm, rewards).some((owned) => stagesBelow(rewards, owned).includes(value));
}

/**
 * The buildings and features to draw on his farm, in the order of the reward list.
 * Of a building's stages, only the highest one he owns is kept.
 */
export function ownedUpgrades(farm, rewards) {
  return ownedBuildings(farm, rewards).filter((value) => !isSuperseded(farm, rewards, value));
}

/**
 * When a new stage arrives, which stage was standing there before? Returns null if
 * `value` is not a later stage of anything, or nothing earlier had been built.
 */
export function previousStage(farm, rewards, value) {
  const owned = ownedBuildings(farm, rewards);
  return stagesBelow(rewards, value).find((stage) => owned.includes(stage)) ?? null;
}
