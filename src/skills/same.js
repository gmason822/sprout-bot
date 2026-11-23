// Matching requests: "Find the same one!". The bubble shows a picture and one thing
// on the table is identical to it. This is the one game where the answer is shown on
// purpose: looking closely and matching is the skill.
// Pure functions only, no Phaser.

import { shuffle } from '../systems/mastery.js';
import { nextItem, choiceCount } from './tiers.js';

const FIND = { say: ['find-same'], tts: 'Find the same one!' };
const DIFFERENT = { say: ['different'], tts: 'That one is different.' };
// A picture turned to each of these looks plainly different from the others.
const TURNS = [0, 90, 180, 270];

/** Every line this game can say, for the voice generator. */
export function sameLines() {
  return [FIND.tts, DIFFERENT.tts];
}

/**
 * Three kinds of matching, set by the tier's `match`:
 *   "kind"    different things of one kind (three fruits): item is a kind from groups.json
 *   "colour"  one shape in different colours: item is a shape
 *   "turned"  one picture turned different ways: item is the picture itself
 * Returns the pictures to choose between, the first being the one to find.
 */
function picturesFor(tier, item, content, howMany, rng) {
  if (tier.match === 'colour') {
    const tints = shuffle((content.colours ?? []).map((c) => c.tint), rng).slice(0, howMany);
    return tints.map((tint) => ({ id: `tint-${tint.toString(16)}`, art: `shape-${item}`, tint }));
  }
  if (tier.match === 'turned') {
    return shuffle(TURNS, rng).slice(0, howMany).map((angle) => ({ id: `turn-${angle}`, emoji: item, ...(angle ? { angle } : {}) }));
  }
  const group = (content.groups ?? []).find((g) => g.id === item);
  return shuffle(group?.emoji ?? [], rng).slice(0, howMany).map((emoji) => ({ id: emoji, emoji }));
}

export function generateSame({ skill, content, mastery = {}, rng = Math.random, prevItemId = null }) {
  const kinds = new Set((content.groups ?? []).map((g) => g.id));
  // A kind named in the tiers but missing from groups.json cannot be shown.
  const tiers = skill.tiers.map((tier) => (
    (tier.match ?? 'kind') === 'kind' ? { ...tier, items: (tier.items ?? []).filter((k) => kinds.has(k)) } : tier
  ));
  const next = nextItem(tiers, mastery, rng, prevItemId);
  if (!next) return null;

  const pictures = picturesFor(next.tier, next.item, content, choiceCount(next.tier), rng);
  if (pictures.length < 2) return null;
  const [target] = pictures;
  const { id, ...look } = target;

  return {
    skill: 'same',
    itemId: next.itemId,
    ...FIND,
    // The picture to match.
    bubble: look,
    answer: {
      kind: 'pick',
      correct: id,
      choices: shuffle(pictures, rng).map((picture) => ({ ...picture, wrong: DIFFERENT })),
    },
  };
}

