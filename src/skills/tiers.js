// What the newer games share: working out which of a game's items are open to him
// and choosing the next one. A tier lists its items in `items`, opens after another
// tier with `unlockAfter`, and may bring its items in a few at a time with `start`.

import { activeItems, mostlySolid, pickItem } from '../systems/mastery.js';

/**
 * Choose what to ask next from a game's tiers.
 * Returns { itemId, tier, item, open } or null if nothing can be asked. `item` is the
 * tier's own name for the thing ("red"); `open` is every item in play, as { tier, item }.
 */
export function nextItem(tiers, mastery, rng, prevItemId) {
  const ids = [];
  const tierOf = new Map();
  let startCount = 0;
  for (const tier of tiers) {
    const items = tier.items ?? [];
    if (tier.unlockAfter) {
      const earlier = ids.filter((id) => tierOf.get(id).id === tier.unlockAfter);
      if (!mostlySolid(earlier, mastery)) continue;
    } else {
      startCount += Math.min(items.length, tier.start ?? items.length);
    }
    for (const item of items) {
      const id = `${tier.id}:${item}`;
      ids.push(id);
      tierOf.set(id, tier);
    }
  }
  if (ids.length === 0) return null;

  const active = activeItems(ids, mastery, startCount);
  const itemId = pickItem(active, mastery, rng, prevItemId);
  const split = (id) => ({ tier: tierOf.get(id), item: id.slice(id.indexOf(':') + 1) });
  return { itemId, ...split(itemId), open: active.map(split) };
}

export const pickFrom = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/** How many things go on the table for this tier: 2 to 4, three unless it says otherwise. */
export const choiceCount = (tier) => Math.max(2, Math.min(4, tier.choices ?? 3));
