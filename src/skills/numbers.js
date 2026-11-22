// Number requests, answered by picking a numbered crate:
//   "Bring me the box with the number 4!"      (recognise the numeral)
//   "How many apples? Bring me that number!"   (count a picture, then find the numeral)
// Pure functions only, no Phaser.

import { activeItems, pickItem, shuffle } from '../systems/mastery.js';
import { numberWord, plural } from './count.js';

const pickFrom = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export function generateNumbers({ skill, mastery = {}, rng = Math.random, prevItemId = null }) {
  // Both kinds of question are in play from the start, each growing at its own pace.
  const pool = [];
  const tierOf = new Map();
  const activeNumbers = new Map();
  for (const tier of skill.tiers) {
    const ids = [];
    for (let n = tier.min; n <= tier.max; n++) ids.push(`${tier.id}:${n}`);
    const active = activeItems(ids, mastery, tier.start ?? ids.length);
    active.forEach((id) => tierOf.set(id, tier));
    activeNumbers.set(tier.id, active.map((id) => Number(id.split(':')[1])));
    pool.push(...active);
  }

  const itemId = pickItem(pool, mastery, rng, prevItemId);
  if (!itemId) return null;
  const tier = tierOf.get(itemId);
  const n = Number(itemId.split(':')[1]);
  const counting = tier.ask === 'count';
  if (counting && !skill.items?.length) return null;

  // Wrong answers come from the numbers he is already working with, never from
  // ones he has not met.
  const known = activeNumbers.get(tier.id).filter((k) => k !== n);
  const howMany = Math.max(2, Math.min(4, tier.choices ?? 3)) - 1;
  const others = shuffle(known, rng).slice(0, howMany);
  if (others.length === 0) return null;

  const choices = shuffle([n, ...others], rng).map((k) => ({
    id: String(k),
    art: 'crate',
    label: String(k),
    wrong: { say: ['thats', `num-${k}`], tts: `That's ${numberWord(k)}.` },
  }));
  const answer = { kind: 'pick', correct: String(n), choices };

  if (counting) {
    const thing = pickFrom(skill.items, rng);
    return {
      skill: 'numbers',
      itemId,
      say: ['how-many', `item-${plural(thing)}`, 'that-number'],
      tts: `How many ${plural(thing)}? Bring me that number!`,
      // The things to count are shown; the numeral is what he has to find.
      bubble: { art: thing, count: n },
      answer,
    };
  }
  return {
    skill: 'numbers',
    itemId,
    say: ['box-number', `num-${n}`],
    tts: `Bring me the box with the number ${numberWord(n)}!`,
    // Only the kind of thing is shown. Showing the numeral would make it shape matching.
    bubble: { art: 'crate' },
    answer,
  };
}
