// Which animals wait at the farm. Milestone 3 adds the rest of the farm day here.

const RECENT = 20;

/**
 * Pure. Offer two animals: one owns the skill he has practised least lately,
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
