// Left/right requests: two identical things, "The one on the LEFT!".
// Pure functions only, no Phaser.

import { activeItems, pickItem } from '../systems/mastery.js';

const SIDES = {
  left: { say: ['on-the-left'], tts: 'The one on the left!', wrong: { say: ['that-was-left'], tts: 'That one is on the left.' } },
  right: { say: ['on-the-right'], tts: 'The one on the right!', wrong: { say: ['that-was-right'], tts: 'That one is on the right.' } },
  middle: { say: ['in-the-middle'], tts: 'The one in the middle!', wrong: { say: ['that-was-middle'], tts: 'That one is in the middle.' } },
};
// How the things are laid out on screen, whatever order the content lists them in.
const ACROSS = ['left', 'middle', 'right'];

export function generateLeftRight({ skill, mastery = {}, rng = Math.random }) {
  const tier = skill.tiers[0];
  const sides = (tier.sides ?? ['left', 'right']).filter((s) => SIDES[s]);
  if (sides.length < 2 || !skill.items?.length) return null;

  // He starts with left and right. "Middle" arrives like any new item, and from then
  // on there are three things on the table.
  const active = activeItems(sides.map((s) => `${tier.id}:${s}`), mastery, Math.min(sides.length, tier.start ?? 2));
  // No "avoid the last one" here: with two answers that would simply alternate.
  const itemId = pickItem(active, mastery, rng);
  const side = itemId.split(':')[1];
  const shown = ACROSS.filter((s) => active.includes(`${tier.id}:${s}`));
  const thing = skill.items[Math.min(skill.items.length - 1, Math.floor(rng() * skill.items.length))];

  return {
    skill: 'leftright',
    itemId,
    say: SIDES[side].say,
    tts: SIDES[side].tts,
    bubble: { art: thing },
    // Left and right each have their own sound, played with the request.
    ...(side === 'middle' ? {} : { cue: side }),
    answer: {
      kind: 'pick',
      correct: side,
      // Never shuffled: where a thing sits IS the question.
      choices: shown.map((s) => ({ id: s, art: thing, side: s, wrong: SIDES[s].wrong })),
    },
  };
}
