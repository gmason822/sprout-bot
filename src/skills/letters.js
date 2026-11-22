// Letter requests: "Bring me the box with the letter B!" and "...the box that says /b/!".
// Pure functions only, no Phaser.

import { activeItems, boxOf, isSolid, pickItem, shuffle } from '../systems/mastery.js';

const MIN_START = 3;

/**
 * The order he meets letters in: the letters of his name first (the ones a
 * 4-year-old cares about most), then the fallback set, then the rest.
 */
export function letterOrder(letters, childName = '', fallbackStart = []) {
  const ids = letters.map((l) => l.id);
  const fromName = [...new Set(childName.toUpperCase().split('').filter((c) => ids.includes(c)))];
  const start = fromName.length > 0 ? fromName : fallbackStart.filter((c) => ids.includes(c));
  const order = [...start, ...ids.filter((c) => !start.includes(c))];
  return { order, startCount: Math.min(order.length, Math.max(start.length, MIN_START)) };
}

/**
 * Wrong choices for one letter. While the letter is new they look nothing like it
 * (B with M, not B with D); once it is solid, lookalikes are allowed. For a sound
 * request, a letter that makes the same sound (C and K) is never offered.
 */
export function pickDistractors(letter, letters, howMany, { forSound, easy }, rng = Math.random) {
  const banned = new Set([letter.id]);
  if (forSound) {
    for (const other of letters) {
      if (letter.sameSoundAs?.includes(other.id) || other.sameSoundAs?.includes(letter.id)) banned.add(other.id);
    }
  }
  const lookalike = (other) => letter.looksLike?.includes(other.id) || other.looksLike?.includes(letter.id);
  const allowed = letters.filter((l) => !banned.has(l.id));
  const plain = allowed.filter((l) => !lookalike(l));
  const pool = easy && plain.length >= howMany ? plain : allowed;
  return shuffle(pool, rng).slice(0, howMany);
}

function nameRequest(letter) {
  return {
    say: ['box-letter', `letter-${letter.id.toLowerCase()}`],
    tts: `Bring me the box with the letter ${letter.id}!`,
  };
}

function soundRequest(letter) {
  // No TTS: speechSynthesis cannot say a bare letter sound.
  return { say: ['box-says', `sound-${letter.id.toLowerCase()}`], tts: null };
}

/** Generator: choose the next letter (by name or by sound) and build its request. */
export function generateLetters({ skill, content, mastery = {}, rng = Math.random, hasClip = () => false, childName = '', prevItemId = null }) {
  const letters = content.letters;
  if (letters.length < 2) return null;
  const byId = new Map(letters.map((l) => [l.id, l]));
  const tier = (ask) => skill.tiers.find((t) => t.ask === ask);
  const nameTier = tier('name');
  const soundTier = tier('sound');
  if (!nameTier) return null;

  const { order, startCount } = letterOrder(letters, childName, skill.fallbackStart ?? []);
  const nameIds = activeItems(order.map((id) => `${nameTier.id}:${id}`), mastery, startCount);

  // A letter's sound is asked only once he reliably knows its name, and only if
  // the sound has been recorded.
  const soundIds = soundTier
    ? order
      .filter((id) => isSolid(mastery, `${nameTier.id}:${id}`) && hasClip(`sound-${id.toLowerCase()}`))
      .map((id) => `${soundTier.id}:${id}`)
    : [];

  const itemId = pickItem([...nameIds, ...soundIds], mastery, rng, prevItemId);
  if (!itemId) return null;
  const [tierId, letterId] = itemId.split(':');
  const letter = byId.get(letterId);
  const forSound = soundTier && tierId === soundTier.id;
  const usedTier = forSound ? soundTier : nameTier;

  const howMany = Math.max(2, Math.min(4, usedTier.choices ?? 2)) - 1;
  const easy = boxOf(mastery, itemId) <= 2;
  const others = pickDistractors(letter, letters, howMany, { forSound, easy }, rng);
  if (others.length === 0) return null;

  const choices = shuffle([letter, ...others], rng).map((l) => ({
    id: l.id,
    art: 'crate',
    label: l.id,
    // Said when he brings this one by mistake, before the request is repeated.
    wrong: { say: ['thats', `letter-${l.id.toLowerCase()}`], tts: `That's ${l.id}.` },
  }));

  return {
    skill: 'letters',
    itemId,
    ...(forSound ? soundRequest(letter) : nameRequest(letter)),
    // Only the kind of thing is shown. Showing the letter would make it shape matching.
    bubble: { art: 'crate' },
    answer: { kind: 'pick', correct: letter.id, choices },
  };
}
