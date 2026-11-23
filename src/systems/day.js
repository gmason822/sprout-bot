// The farm day: which animals wait, how far through the day he is, and what
// arrives at sunset. Pure functions over the saved state.

import { isPlaceable, earnSmall, ownedBuildings, isSuperseded } from './home.js';
import { farmPages } from './farmPages.js';
import { shuffle } from './mastery.js';

const RECENT = 20;
// One entry per finished day. Years of play still fit, and the save stays small.
export const LOG_MAX = 1500;

export const ANIMALS_OFFERED = 3;

/**
 * Offer three animals, each asking for one of its own games. The game he has
 * practised least lately is always among them, so nothing can be avoided forever;
 * the other animals are random, and each asks for the least-practised game in its
 * family. Their order on screen is random.
 * `ready` says which games have something to ask right now. `skillLog` is the list
 * of games he has delivered for, oldest first. Returns [{ animal, skill }].
 */
export function chooseOffers(animals, ready, skillLog, rng = Math.random, count = ANIMALS_OFFERED) {
  const recent = skillLog.slice(-RECENT);
  const practised = (skill) => recent.filter((s) => s === skill).length;
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  /** The least-practised of an animal's games; a tie is settled at random. */
  const gameFor = (animal) => {
    const fewest = Math.min(...animal.playable.map(practised));
    return pick(animal.playable.filter((skill) => practised(skill) === fewest));
  };

  const able = animals
    .map((animal) => ({ animal, playable: animal.skills.filter((skill) => ready(skill)) }))
    .filter((entry) => entry.playable.length > 0);
  if (able.length === 0) return [];

  // The most neglected game of all, and the animal that owns it, come first.
  const fewest = Math.min(...able.flatMap((entry) => entry.playable.map(practised)));
  const first = pick(able.filter((entry) => entry.playable.some((skill) => practised(skill) === fewest)));
  const offers = [{ animal: first.animal, skill: pick(first.playable.filter((skill) => practised(skill) === fewest)) }];

  let others = able.filter((entry) => entry !== first);
  while (offers.length < count && others.length > 0) {
    const next = pick(others);
    offers.push({ animal: next.animal, skill: gameFor(next) });
    others = others.filter((entry) => entry !== next);
  }
  return shuffle(offers, rng);
}

/** The day ends when he has made the number of deliveries the parent chose. */
export function isDayDone(today, deliveriesPerDay) {
  return today.length >= deliveriesPerDay;
}

/**
 * The big reward due on farm day `dayNumber` (1 = his first finished day), or null
 * if this is an ordinary day. Each big reward names the day it arrives on. If one was
 * missed (the schedule was edited, or an old save is further on), the earliest one
 * still owed is given, so he catches up one day at a time and never gets two at once.
 * An early stage of a building is never owed once he has a later stage of it: a tent
 * would not be put up beside his cabin.
 */
export function bigRewardFor(rewards, owned, dayNumber) {
  const farm = { rewards: owned };
  const due = rewards.filter((r) => r.day <= dayNumber && !owned.includes(r.id)
    && !(r.type === 'upgrade' && isSuperseded(farm, rewards, r.value)));
  if (due.length === 0) return null;
  return due.reduce((first, r) => (r.day < first.day ? r : first));
}

/**
 * Sunset is the only time anything is given out, and it is always exactly one thing:
 * the big reward (a farm building) if today is one of its set days, otherwise one
 * small thing (a cosmetic). A day with no deliveries gives nothing.
 * Changes `state` in place and returns { reward, gift, delivered }: `reward` is a big
 * one, `gift` a small one, and at most one of them is set.
 */
export function endDay(state, rewards, small = [], rng = Math.random) {
  const delivered = state.today;
  const dayNumber = state.days + 1;
  const { reward, gift } = delivered.length > 0
    ? giveDayReward(state.farm, dayNumber, rewards, small, rng)
    : { reward: null, gift: null };
  state.days = dayNumber;
  state.today = [];
  return { reward, gift, delivered };
}

/**
 * Give farm day `dayNumber` its one reward, and note in the farm's log which day it
 * came on, so the parent's day control can take it back again.
 * Returns { reward, gift }: a big one or a small one, never both.
 */
export function giveDayReward(farm, dayNumber, rewards, small = [], rng = Math.random) {
  const reward = bigRewardFor(rewards, farm.rewards, dayNumber);
  let gift = null;
  if (reward) {
    farm.rewards.push(reward.id);
    if (reward.type === 'paint') farm.paint = reward.id;
    if (reward.type === 'hat') farm.hat = reward.id;
    // A friend or decoration waits on the shelf for him to place at home.
    if (isPlaceable(reward)) farm.box.push(reward.id);
  } else {
    gift = earnSmall(farm, small, rng, ownedBuildings(farm, rewards), farmPages(farm, rewards));
  }
  const given = reward ?? gift;
  if (given) {
    farm.log = [...(farm.log ?? []), { day: dayNumber, id: given.id }].slice(-LOG_MAX);
  }
  return { reward, gift };
}
