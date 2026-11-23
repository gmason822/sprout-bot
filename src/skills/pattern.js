// Pattern requests: a row of pictures that repeats, with one place empty.
// "What comes next?" (the empty place is at the end) and "What is missing?" (it is
// in the middle). Pure functions only, no Phaser.

import { shuffle } from '../systems/mastery.js';
import { nextItem, choiceCount } from './tiers.js';

const NEXT = { say: ['what-next'], tts: 'What comes next?' };
const MISSING = { say: ['what-missing'], tts: 'What is missing?' };
const LOOK = { say: ['look-pattern'], tts: 'Not that one. Look at the pattern.' };

/** Every line this game can say, for the voice generator. */
export function patternLines() {
  return [NEXT.tts, MISSING.tts, LOOK.tts];
}

/**
 * `count` different pictures made from one material:
 *   "things"   different things (an apple, a carrot)
 *   "colours"  one shape in different colours
 *   "shapes"   different shapes in one colour
 */
function pictures(material, count, skill, content, rng) {
  const tints = shuffle((content.colours ?? []).map((c) => c.tint), rng);
  const shapes = shuffle(skill.shapes ?? [], rng);
  if (material === 'colours') {
    if (shapes.length === 0) return [];
    return tints.slice(0, count).map((tint) => ({ art: `shape-${shapes[0]}`, tint }));
  }
  if (material === 'shapes') {
    return shapes.slice(0, count).map((shape) => ({ art: `shape-${shape}`, ...(tints.length ? { tint: tints[0] } : {}) }));
  }
  return shuffle(skill.items ?? [], rng).slice(0, count).map((art) => ({ art }));
}

/**
 * A tier's items name a pattern and what it is made of: "AAB-colours" is two of one
 * colour then one of another, over and over. The row starts anywhere in the pattern,
 * so the answer is not always its first picture, and always shows at least two whole
 * repeats, which is what makes it a pattern rather than a guess.
 */
export function generatePattern({ skill, content, mastery = {}, rng = Math.random, prevItemId = null }) {
  const next = nextItem(skill.tiers, mastery, rng, prevItemId);
  if (!next) return null;

  const [form, material = 'things'] = next.item.split('-');
  const unit = form.split('');
  const letters = [...new Set(unit)];
  const howMany = Math.max(choiceCount(next.tier), letters.length);
  const made = pictures(material, howMany, skill, content, rng);
  if (made.length < letters.length || unit.length < 2) return null;

  const pictureOf = new Map(letters.map((letter, i) => [letter, made[i]]));
  const start = Math.floor(rng() * unit.length);
  const at = (i) => unit[(start + i) % unit.length];

  // Two whole repeats, plus one more picture for the shortest pattern.
  const shown = unit.length * 2 + (unit.length === 2 && rng() < 0.5 ? 1 : 0);
  const total = shown + 1;
  // In the middle means with at least two pictures on either side.
  const gap = next.tier.gap === 'middle' ? 2 + Math.floor(rng() * (total - 4)) : total - 1;
  const row = [];
  for (let i = 0; i < total; i++) {
    row.push(i === gap ? null : { ...pictureOf.get(at(i)), note: letters.indexOf(at(i)) + 1 });
  }

  // Every picture in the pattern is on the table, plus outsiders if there is room.
  const choices = letters.map((letter) => ({ id: letter, ...pictureOf.get(letter), wrong: LOOK }));
  made.slice(letters.length).forEach((picture, i) => choices.push({ id: `X${i + 1}`, ...picture, wrong: LOOK }));

  return {
    skill: 'pattern',
    itemId: next.itemId,
    ...(next.tier.gap === 'middle' ? MISSING : NEXT),
    bubble: { row },
    answer: { kind: 'pick', correct: at(gap), choices: shuffle(choices, rng) },
  };
}

