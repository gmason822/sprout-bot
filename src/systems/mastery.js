// Leitner-box tracking per content item ("count:3", "letter-name:B", "side:left").
// Pure functions over a plain object { [itemId]: { box, seen, correct, lastSeen } }.

export const MAX_BOX = 5;
const SOLID_BOX = 3;
// Lower boxes come up more often.
const WEIGHTS = [5, 4, 3, 2, 1];

export function boxOf(mastery, id) {
  return mastery[id]?.box ?? 1;
}

/** An item he has never met is not solid, whatever box it would start in. */
export function isSolid(mastery, id) {
  return (mastery[id]?.box ?? 0) >= SOLID_BOX;
}

/** True when at least two thirds of `ids` are solid. */
export function mostlySolid(ids, mastery) {
  if (ids.length === 0) return false;
  const solid = ids.filter((id) => isSolid(mastery, id)).length;
  return solid * 3 >= ids.length * 2;
}

/**
 * Record one request. Only the first try counts: right on the first try moves the
 * item up a box, anything else moves it down one (never back to the start, which
 * would punish a 4-year-old's stray tap). Returns a new mastery object.
 */
export function recordAnswer(mastery, id, firstTryRight, now = Date.now()) {
  const old = mastery[id] ?? { box: 1, seen: 0, correct: 0, lastSeen: 0 };
  const box = firstTryRight ? Math.min(MAX_BOX, old.box + 1) : Math.max(1, old.box - 1);
  return {
    ...mastery,
    [id]: { box, seen: old.seen + 1, correct: old.correct + (firstTryRight ? 1 : 0), lastSeen: now },
  };
}

/**
 * Which of a skill's items are in play. The first `startCount` are always active,
 * plus anything he has already met. One new item joins only when most of the
 * active ones are solid, so new material arrives one piece at a time.
 */
export function activeItems(orderedIds, mastery, startCount) {
  const active = orderedIds.filter((id, i) => i < startCount || mastery[id]);
  if (mostlySolid(active, mastery)) {
    const next = orderedIds.find((id) => !active.includes(id));
    if (next) active.push(next);
  }
  return active;
}

/**
 * Pick the next item, favouring lower boxes. `avoidId` stops an immediate repeat,
 * but only when there are more than two items: with two (left/right), always
 * avoiding the last one would make the answer simply alternate.
 */
export function pickItem(ids, mastery, rng = Math.random, avoidId = null) {
  if (ids.length === 0) return null;
  const pool = avoidId && ids.length > 2 ? ids.filter((id) => id !== avoidId) : ids;
  const weights = pool.map((id) => WEIGHTS[boxOf(mastery, id) - 1] ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Fisher-Yates with an injectable rng, so generators stay testable. */
export function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
