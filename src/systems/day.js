// The farm day: which animals wait, how far through the day he is, and what
// arrives at sunset. Pure functions over the saved state.

import { isPlaceable, earnSmall, ownedUpgrades } from './home.js';
import { shuffle } from './mastery.js';

const RECENT = 20;

export const ANIMALS_OFFERED = 3;

/**
 * Offer three animals: one owns the skill he has practised least lately, so nothing
 * can be avoided forever; the others are random. Their order on screen is random.
 * `skillLog` is the list of skill ids he has delivered for, oldest first.
 */
export function chooseAnimals(animals, skillLog, rng = Math.random, count = ANIMALS_OFFERED) {
  if (animals.length <= count) return [...animals];

  const recent = skillLog.slice(-RECENT);
  const practised = (animal) => recent.filter((s) => s === animal.skill).length;
  const fewest = Math.min(...animals.map(practised));
  const neglected = animals.filter((a) => practised(a) === fewest);
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

  const chosen = [pick(neglected)];
  while (chosen.length < count) chosen.push(pick(animals.filter((a) => !chosen.includes(a))));
  return shuffle(chosen, rng);
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
 */
export function bigRewardFor(rewards, owned, dayNumber) {
  const due = rewards.filter((r) => r.day <= dayNumber && !owned.includes(r.id));
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
  let reward = null;
  let gift = null;
  if (delivered.length > 0) {
    reward = bigRewardFor(rewards, state.farm.rewards, dayNumber);
    if (reward) {
      state.farm.rewards.push(reward.id);
      if (reward.type === 'paint') state.farm.paint = reward.id;
      if (reward.type === 'hat') state.farm.hat = reward.id;
      // A friend or decoration waits on the shelf for him to place at home.
      if (isPlaceable(reward)) state.farm.box.push(reward.id);
    } else {
      gift = earnSmall(state.farm, small, rng, ownedUpgrades(state.farm, rewards));
    }
  }
  state.days = dayNumber;
  state.today = [];
  return { reward, gift, delivered };
}
