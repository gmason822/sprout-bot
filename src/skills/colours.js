// Colour requests: "Bring me the red one!" from one shape in several colours.
// Pure functions only, no Phaser.

import { shuffle } from '../systems/mastery.js';
import { nextItem, pickFrom, choiceCount } from './tiers.js';

const bringColour = (colour) => ({ say: ['bring-the', `colour-${colour}`, 'one'], tts: `Bring me the ${colour} one!` });
const thatsColour = (colour) => ({ say: ['thats', `colour-${colour}`], tts: `That's ${colour}.` });

/** Every line this game can say, for the voice generator. */
export function colourLines(skill) {
  return skill.tiers.flatMap((tier) => tier.items ?? []).flatMap((c) => [bringColour(c).tts, thatsColour(c).tts]);
}

export function generateColours({ skill, content, mastery = {}, rng = Math.random, prevItemId = null }) {
  const tintOf = new Map((content.colours ?? []).map((c) => [c.id, c.tint]));
  // A colour named in the tiers but missing from colours.json cannot be shown.
  const tiers = skill.tiers.map((tier) => ({ ...tier, items: (tier.items ?? []).filter((c) => tintOf.has(c)) }));
  const next = nextItem(tiers, mastery, rng, prevItemId);
  if (!next || !skill.shapes?.length) return null;

  const colour = next.item;
  const known = next.open.map((o) => o.item).filter((c) => c !== colour);
  const others = shuffle(known, rng).slice(0, choiceCount(next.tier) - 1);
  if (others.length === 0) return null;

  // Every choice is the same shape, so the colour is the only thing that differs.
  const art = `shape-${pickFrom(skill.shapes, rng)}`;
  return {
    skill: 'colours',
    itemId: next.itemId,
    ...bringColour(colour),
    // Any coloured thing here could be mistaken for the answer.
    bubble: { emoji: '🎨' },
    answer: {
      kind: 'pick',
      correct: colour,
      choices: shuffle([colour, ...others], rng).map((c) => ({
        id: c,
        art,
        tint: tintOf.get(c),
        wrong: thatsColour(c),
      })),
    },
  };
}
