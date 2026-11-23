// Odd one out: "Which one does not belong?" Three things of one kind and one of another.
// Pure functions only, no Phaser.

import { shuffle } from '../systems/mastery.js';
import { nextItem, pickFrom, choiceCount } from './tiers.js';

const WHICH = { say: ['which-not-belong'], tts: 'Which one does not belong?' };
const BELONGS = { say: ['that-belongs'], tts: 'That one belongs with the others.' };

/** Every line this game can say, for the voice generator. */
export function oddOneLines() {
  return [WHICH.tts, BELONGS.tts];
}

/**
 * A tier's items are kinds from groups.json: the kind there are three of. The odd one
 * comes from one of the kinds listed for it in the tier's `against`, or, without that,
 * from any other kind in the tier. Kinds that are far apart (animals and vehicles) make
 * an easy tier; close ones (fruit and vegetables) a hard one.
 */
export function generateOddOne({ skill, content, mastery = {}, rng = Math.random, prevItemId = null }) {
  const picturesOf = new Map((content.groups ?? []).map((g) => [g.id, g.emoji]));
  const tiers = skill.tiers.map((tier) => ({ ...tier, items: (tier.items ?? []).filter((k) => picturesOf.has(k)) }));
  const next = nextItem(tiers, mastery, rng, prevItemId);
  if (!next) return null;

  const kind = next.item;
  const against = (next.tier.against?.[kind] ?? next.tier.items.filter((k) => k !== kind)).filter((k) => k !== kind && picturesOf.has(k));
  if (against.length === 0) return null;

  const alike = shuffle(picturesOf.get(kind), rng).slice(0, choiceCount(next.tier) - 1);
  const odd = pickFrom(picturesOf.get(pickFrom(against, rng)), rng);
  if (alike.length < 2) return null;

  return {
    skill: 'oddone',
    itemId: next.itemId,
    ...WHICH,
    bubble: { emoji: '🤔' },
    answer: {
      kind: 'pick',
      correct: odd,
      choices: shuffle([odd, ...alike], rng).map((emoji) => ({ id: emoji, emoji, wrong: BELONGS })),
    },
  };
}
