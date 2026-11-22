// First-sound requests: a picture and its word, "Bear. What letter does bear start with?"
// He has to hear the first sound of the word himself, which works with the computer
// voice because the whole word is spoken, never a bare letter sound.
// Pure functions only, no Phaser.

import { activeItems, boxOf, pickItem, shuffle } from '../systems/mastery.js';
import { letterOrder, pickDistractors } from './letters.js';

const pickFrom = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
const capital = (word) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Every picture word, grouped by the letter it starts with. Words come from each
 * letter's own example and from words.json. A word marked `firstSound: false` is
 * left out (fox for X, tree with its "tr").
 */
export function wordsByLetter(content) {
  const byLetter = new Map();
  const seen = new Set();
  const add = (letter, id, emoji) => {
    if (!letter || !id || !emoji || seen.has(id)) return;
    seen.add(id);
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push({ id, emoji });
  };
  for (const l of content.letters) {
    if (l.firstSound !== false) add(l.id, l.example, l.emoji);
  }
  for (const w of content.words ?? []) {
    if (w.firstSound !== false) add(w.id.charAt(0).toUpperCase(), w.id, w.emoji);
  }
  return byLetter;
}

export function generateFirstSound({ skill, content, mastery = {}, rng = Math.random, childName = '', prevItemId = null }) {
  const tier = skill.tiers[0];
  const letters = content.letters;
  const byLetter = wordsByLetter(content);
  const { order } = letterOrder(letters, childName, skill.fallbackStart ?? []);
  const usable = order.filter((id) => byLetter.has(id));
  if (usable.length < 2) return null;

  const active = activeItems(usable.map((id) => `${tier.id}:${id}`), mastery, Math.min(usable.length, tier.start ?? 6));
  const itemId = pickItem(active, mastery, rng, prevItemId);
  const letter = letters.find((l) => l.id === itemId.split(':')[1]);
  const word = pickFrom(byLetter.get(letter.id), rng);

  // A letter with the same sound (C and K) is never a wrong choice here.
  const howMany = Math.max(2, Math.min(4, tier.choices ?? 3)) - 1;
  const others = pickDistractors(letter, letters, howMany, { forSound: true, easy: boxOf(mastery, itemId) <= 2 }, rng);
  if (others.length === 0) return null;

  return {
    skill: 'firstsound',
    itemId,
    say: [`word-${word.id}`, 'what-starts'],
    tts: `${capital(word.id)}. What letter does ${word.id} start with?`,
    // The picture of the word. The letter itself is never shown.
    bubble: { emoji: word.emoji },
    answer: {
      kind: 'pick',
      correct: letter.id,
      choices: shuffle([letter, ...others], rng).map((l) => ({
        id: l.id,
        art: 'crate',
        label: l.id,
        wrong: { say: ['thats', `letter-${l.id.toLowerCase()}`], tts: `That's ${l.id}.` },
      })),
    },
  };
}
