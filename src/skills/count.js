// Counting requests: "I need 3 apples!". Pure functions only, no Phaser.

import { activeItems, mostlySolid, pickItem } from '../systems/mastery.js';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
// Things shown beyond the tier's biggest number, so over-counting is possible;
// otherwise "tap them all" would be a winning strategy for the biggest number.
const EXTRA = 2;

export function numberWord(n) {
  return WORDS[n] ?? String(n);
}

/** The plural of a thing to count: apples, strawberries, tomatoes, boxes. */
export function plural(word) {
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(o|s|x|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

/** Build the request for one number of one thing. `item` is { id, plural }. */
export function buildCountRequest(target, item, available) {
  const one = target === 1;
  return {
    skill: 'count',
    itemId: `count:${target}`,
    say: ['need', `num-${target}`, one ? `item-${item.id}` : `item-${item.plural}`],
    tts: `I need ${numberWord(target)} ${one ? item.id : item.plural}!`,
    // The numeral is shown: it cannot be matched by shape, so he still has to count.
    bubble: { art: item.id, numeral: target },
    answer: { kind: 'count', item: item.id, target, available },
  };
}

/** Generator: choose the next number from mastery and build its request. */
export function generateCount({ skill, mastery = {}, rng = Math.random, prevItemId = null }) {
  if (!skill.items?.length) return null;

  // Tiers list the numbers in the order he meets them. A tier behind `unlockAfter`
  // contributes nothing until the earlier tier is mostly solid.
  const tierOf = new Map();
  let startCount = 0;
  for (const tier of skill.tiers) {
    if (tier.unlockAfter) {
      const earlier = [...tierOf].filter(([, t]) => t.id === tier.unlockAfter).map(([id]) => id);
      if (!mostlySolid(earlier, mastery)) continue;
    }
    for (let n = tier.min; n <= tier.max; n++) {
      const id = `count:${n}`;
      if (tierOf.has(id)) continue;
      tierOf.set(id, tier);
      if (!tier.unlockAfter) startCount++;
    }
  }
  const candidates = [...tierOf.keys()];
  if (candidates.length === 0) return null;

  const itemId = pickItem(activeItems(candidates, mastery, startCount), mastery, rng, prevItemId);
  const target = Number(itemId.split(':')[1]);
  const thing = skill.items[Math.min(skill.items.length - 1, Math.floor(rng() * skill.items.length))];
  return buildCountRequest(target, { id: thing, plural: plural(thing) }, tierOf.get(itemId).max + EXTRA);
}

/** How a sent truck compares with what was asked for. */
export function judgeCount(target, loaded) {
  if (loaded === target) return 'right';
  return loaded < target ? 'few' : 'many';
}

/**
 * After two misses the send button glows, but only while the truck holds
 * the right number, so the hint still makes him count.
 */
export function sendGlows(misses, loaded, target) {
  return misses >= 2 && loaded === target;
}

/** What the animal says after a wrong delivery. */
export function correctionLine(target, loaded) {
  if (loaded > target) {
    return { say: ['too-many'], tts: 'Too many! Take one out.' };
  }
  const oneShort = target - loaded === 1;
  return {
    say: ['need', `num-${target}`, oneShort ? 'one-more' : 'more'],
    tts: `I need ${numberWord(target)}. ${oneShort ? 'One more!' : 'More!'}`,
  };
}
