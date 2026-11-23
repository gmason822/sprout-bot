// The parent's day control: move the farm to any day, to test what arrives when.
// Going forward gives each skipped day its reward, exactly as playing would. Going
// back takes away whatever was earned after that day. Pure functions over the save.

import { giveDayReward } from './day.js';
import { isPlaceable } from './home.js';

const copy = (value) => JSON.parse(JSON.stringify(value));

/** Take one reward back off the farm, as if its day had not happened yet. */
function takeBack(farm, item) {
  if (!item) return;
  if (item.type === 'paint' || item.type === 'hat') {
    if (farm[item.type] === item.id) farm[item.type] = null;
  } else if (isPlaceable(item)) {
    // The newest copy goes: one still on the shelf if there is one, else one he placed.
    const waiting = farm.box.lastIndexOf(item.id);
    if (waiting >= 0) {
      farm.box.splice(waiting, 1);
    } else {
      const standing = farm.placed.findLastIndex((p) => p.item === item.id);
      if (standing >= 0) farm.placed.splice(standing, 1);
    }
  }
  // Plain small things repeat and are not in the owned list; everything else is.
  const owned = farm.rewards.indexOf(item.id);
  if (owned >= 0) farm.rewards.splice(owned, 1);
}

/**
 * Move the save to `target` finished days. Changes `state` in place.
 * Buildings earned before the log existed have no entry, so those fall back to the
 * day the schedule gives them.
 */
export function travelToDay(state, target, rewards, small = [], rng = Math.random) {
  const farm = state.farm;
  const known = new Map([...rewards, ...small].map((r) => [r.id, r]));
  const to = Math.max(0, Math.round(target));
  farm.log = farm.log ?? [];

  if (to < state.days) {
    const later = farm.log.filter((entry) => entry.day > to);
    farm.log = farm.log.filter((entry) => entry.day <= to);
    // Newest first, so a paint he is wearing comes off before the garage it needs.
    for (const entry of later.reverse()) takeBack(farm, known.get(entry.id));
    const logged = new Set(farm.log.map((entry) => entry.id));
    for (const reward of rewards) {
      if (reward.type === 'upgrade' && reward.day > to && !logged.has(reward.id)) takeBack(farm, reward);
    }
  }
  for (let day = state.days + 1; day <= to; day++) {
    giveDayReward(farm, day, rewards, small, rng);
  }
  state.days = to;
  return state;
}

/**
 * Keep his real farm safe before the first change. A bookmark that already exists
 * is left alone: it is the real one, and what is on screen now is a test.
 */
export function keepBookmark(state) {
  if (!state.bookmark) state.bookmark = copy({ days: state.days, today: state.today, farm: state.farm });
  return state;
}

/** Put his real farm back exactly as it was, placed things and all. */
export function restoreBookmark(state) {
  if (!state.bookmark) return false;
  const { days, today, farm } = copy(state.bookmark);
  Object.assign(state, { days, today, farm, bookmark: null });
  return true;
}

/** For the parent's hint: the buildings the schedule has given by `days`, and the next one. */
export function buildingsAt(rewards, days) {
  const buildings = rewards.filter((r) => r.type === 'upgrade').sort((a, b) => a.day - b.day);
  return {
    have: buildings.filter((r) => r.day <= days),
    next: buildings.find((r) => r.day > days) ?? null,
    total: buildings.length,
  };
}
