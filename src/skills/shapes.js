// Shape requests: "Bring me the triangle!" from three shapes of one colour.
// Pure functions only, no Phaser.

import { activeItems, mostlySolid, pickItem, shuffle } from '../systems/mastery.js';

// All the shapes in one request share a colour, so colour is never the clue.
const COLOURS = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7, 0xec4899];
const article = (word) => (/^[aeiou]/.test(word) ? 'an' : 'a');
const pickFrom = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export function generateShapes({ skill, mastery = {}, rng = Math.random, prevItemId = null }) {
  // Tiers list the shapes in the order he meets them; a later tier waits for the earlier one.
  const ids = [];
  const tierOf = new Map();
  let startCount = 0;
  for (const tier of skill.tiers) {
    if (tier.unlockAfter) {
      const earlier = ids.filter((id) => tierOf.get(id).id === tier.unlockAfter);
      if (!mostlySolid(earlier, mastery)) continue;
    } else {
      startCount += tier.shapes.length;
    }
    for (const shape of tier.shapes) {
      const id = `${tier.id}:${shape}`;
      ids.push(id);
      tierOf.set(id, tier);
    }
  }
  if (ids.length < 2) return null;

  const active = activeItems(ids, mastery, startCount);
  const itemId = pickItem(active, mastery, rng, prevItemId);
  const shape = itemId.split(':')[1];
  const tier = tierOf.get(itemId);

  const known = active.map((id) => id.split(':')[1]).filter((s) => s !== shape);
  const howMany = Math.max(2, Math.min(4, tier.choices ?? 3)) - 1;
  const others = shuffle(known, rng).slice(0, howMany);
  if (others.length === 0) return null;

  const tint = pickFrom(COLOURS, rng);
  return {
    skill: 'shapes',
    itemId,
    say: ['bring-the', `shape-${shape}`],
    tts: `Bring me the ${shape}!`,
    // Showing any shape here could be mistaken for the answer.
    bubble: { emoji: '❓' },
    answer: {
      kind: 'pick',
      correct: shape,
      choices: shuffle([shape, ...others], rng).map((s) => ({
        id: s,
        art: `shape-${s}`,
        tint,
        wrong: { say: ['thats-a', `shape-${s}`], tts: `That's ${article(s)} ${s}.` },
      })),
    },
  };
}
