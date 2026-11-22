// Left/right requests: two identical things, "The one on the LEFT!".
// Pure functions only, no Phaser.

import { pickItem } from '../systems/mastery.js';

const SIDES = {
  left: { say: ['on-the-left'], tts: 'The one on the left!', wrong: { say: ['that-was-left'], tts: 'That one is on the left.' } },
  right: { say: ['on-the-right'], tts: 'The one on the right!', wrong: { say: ['that-was-right'], tts: 'That one is on the right.' } },
};

export function generateLeftRight({ skill, mastery = {}, rng = Math.random }) {
  const tier = skill.tiers[0];
  const sides = (tier.sides ?? ['left', 'right']).filter((s) => SIDES[s]);
  if (sides.length < 2 || !skill.items?.length) return null;

  // No "avoid the last one" here: with two answers that would simply alternate.
  const itemId = pickItem(sides.map((s) => `${tier.id}:${s}`), mastery, rng);
  const side = itemId.split(':')[1];
  const thing = skill.items[Math.min(skill.items.length - 1, Math.floor(rng() * skill.items.length))];

  return {
    skill: 'leftright',
    itemId,
    say: SIDES[side].say,
    tts: SIDES[side].tts,
    bubble: { art: thing },
    // Each side has its own sound, played with the request.
    cue: side,
    answer: {
      kind: 'pick',
      correct: side,
      // Never shuffled: where a thing sits IS the question.
      choices: ['left', 'right'].map((s) => ({ id: s, art: thing, side: s, wrong: SIDES[s].wrong })),
    },
  };
}
