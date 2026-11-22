// The home farm: what he has earned, what is waiting in the gift box, and where he
// has put things. Pure functions over `state.farm`:
//
//   rewards  ids of the big rewards he owns (friends, hats, paints, upgrades...)
//   box      ids of things waiting to be placed, oldest first (repeats allowed)
//   placed   [{ item, x, y }] things standing on the farm
//   paint, hat   what the truck and robot are wearing

// Each placed thing is its own picture, so there is a limit to how many a phone
// can show comfortably. Past it, the oldest small thing makes room for the new one.
export const MAX_THINGS = 120;

// Where things may stand on the home farm, in game pixels.
export const FIELD = { left: 50, right: 1230, top: 315, bottom: 590 };

const PLACEABLE = ['friend', 'decoration'];

export function isPlaceable(reward) {
  return PLACEABLE.includes(reward?.type);
}

const isSmall = (id) => id.startsWith('small-');

/** Make room if the farm is full, by letting the oldest small thing go. */
function makeRoom(farm) {
  if (farm.box.length + farm.placed.length < MAX_THINGS) return;
  const waiting = farm.box.findIndex(isSmall);
  if (waiting >= 0) return void farm.box.splice(waiting, 1);
  const standing = farm.placed.findIndex((p) => isSmall(p.item));
  if (standing >= 0) farm.placed.splice(standing, 1);
}

/** After a delivery: one small thing, picked at random, goes into the gift box. */
export function earnSmall(farm, small, rng = Math.random) {
  if (!small?.length) return null;
  const item = small[Math.min(small.length - 1, Math.floor(rng() * small.length))];
  makeRoom(farm);
  farm.box.push(item.id);
  return item;
}

/**
 * Make an older save, or one from before a content change, fit today's content:
 * anything he owns that can be placed but is neither placed nor waiting goes into
 * the box, and anything that no longer exists is dropped.
 */
export function reconcileFarm(farm, rewards, small) {
  const known = new Map([...rewards, ...small].map((r) => [r.id, r]));
  farm.box = farm.box.filter((id) => known.has(id));
  farm.placed = farm.placed.filter((p) => known.has(p.item));
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

/** Take the thing at `boxIndex` out of the gift box and stand it on the farm. */
export function placeFromBox(farm, boxIndex, x, y) {
  const item = farm.box[boxIndex];
  if (item === undefined) return null;
  farm.box.splice(boxIndex, 1);
  const thing = { item, ...clampToField(x, y) };
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
 * A free spot for something new: near the middle, away from what is already there
 * if possible, so things do not land in one heap.
 */
export function freeSpot(farm, rng = Math.random) {
  let best = null;
  let bestGap = -1;
  for (let attempt = 0; attempt < 12; attempt++) {
    const spot = clampToField(280 + rng() * 620, 350 + rng() * 210);
    const gap = Math.min(...farm.placed.map((p) => Math.hypot(p.x - spot.x, p.y - spot.y)), Infinity);
    if (gap > bestGap) {
      best = spot;
      bestGap = gap;
    }
    if (gap > 110) break;
  }
  return best;
}

/**
 * Tap the paint pot or the hat stand: wear the next one he owns, and after the
 * last one go back to wearing none. `type` is 'paint' or 'hat'.
 */
export function cycleWear(farm, rewards, type) {
  const owned = rewards.filter((r) => r.type === type && farm.rewards.includes(r.id)).map((r) => r.id);
  if (owned.length === 0) return null;
  const options = [null, ...owned];
  farm[type] = options[(options.indexOf(farm[type] ?? null) + 1) % options.length];
  return farm[type];
}

/** The names of the upgrades he owns, in the order he earned them. */
export function ownedUpgrades(farm, rewards) {
  return rewards.filter((r) => r.type === 'upgrade' && farm.rewards.includes(r.id)).map((r) => r.value);
}
