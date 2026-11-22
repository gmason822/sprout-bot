// The farm day: which animals wait, how far through the day he is, and what
// arrives at sunset. Pure functions over the saved state.

const RECENT = 20;

/**
 * Offer two animals: one owns the skill he has practised least lately,
 * so nothing can be avoided forever; the other is random. Left/right order is random.
 * `skillLog` is the list of skill ids he has delivered for, oldest first.
 */
export function chooseAnimals(animals, skillLog, rng = Math.random) {
  if (animals.length <= 2) return [...animals];

  const recent = skillLog.slice(-RECENT);
  const practised = (animal) => recent.filter((s) => s === animal.skill).length;
  const fewest = Math.min(...animals.map(practised));
  const neglected = animals.filter((a) => practised(a) === fewest);
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

  const first = pick(neglected);
  const second = pick(animals.filter((a) => a !== first));
  return rng() < 0.5 ? [first, second] : [second, first];
}

/** The day ends when he has made the number of deliveries the parent chose. */
export function isDayDone(today, deliveriesPerDay) {
  return today.length >= deliveriesPerDay;
}

/** The next reward in file order that he does not own yet, or null when he has them all. */
export function nextReward(rewards, owned) {
  return rewards.find((r) => !owned.includes(r.id)) ?? null;
}

/**
 * Sunset: bank the day and hand over the next reward. A new paint or hat goes
 * straight on, so the reward is something he sees rather than something in a list.
 * Changes `state` in place and returns { reward, delivered }.
 */
export function endDay(state, rewards) {
  const delivered = state.today;
  const reward = nextReward(rewards, state.farm.rewards);
  if (reward) {
    state.farm.rewards.push(reward.id);
    if (reward.type === 'paint') state.farm.paint = reward.id;
    if (reward.type === 'hat') state.farm.hat = reward.id;
  }
  state.days += 1;
  state.today = [];
  return { reward, delivered };
}

/** Tap a paint or hat he owns to put it on; tap the one he is wearing to take it off. */
export function toggleWear(farm, reward) {
  const slot = reward.type === 'paint' ? 'paint' : reward.type === 'hat' ? 'hat' : null;
  if (!slot || !farm.rewards.includes(reward.id)) return false;
  farm[slot] = farm[slot] === reward.id ? null : reward.id;
  return true;
}
