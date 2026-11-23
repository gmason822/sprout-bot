// "Who says that?": an animal noise plays and he picks the animal that makes it.
// Pure functions only, no Phaser.

import { shuffle } from '../systems/mastery.js';
import { nextItem, choiceCount } from './tiers.js';

const WHO = { say: ['who-says'], tts: 'Who says that?' };
const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const thatsAnimal = (animal) => {
  const name = animal.name.toLowerCase();
  return { say: ['thats-a', `animal-${animal.id}`], tts: `That's ${article(name)} ${name}.` };
};

/**
 * The animal that makes each noise. A tier's items are noises ("moo"); each needs an
 * animal in animals.json with that `sound`, whose drawing is the thing he picks.
 */
function animalsByNoise(content) {
  const byNoise = new Map();
  for (const animal of content.animals) {
    if (animal.sound && !byNoise.has(animal.sound)) byNoise.set(animal.sound, animal);
  }
  return byNoise;
}

/** Every line this game can say, for the voice generator. */
export function whoSaysLines(skill, content) {
  const byNoise = animalsByNoise(content);
  const noises = skill.tiers.flatMap((tier) => tier.items ?? []).filter((n) => byNoise.has(n));
  return [WHO.tts, ...noises.map((n) => thatsAnimal(byNoise.get(n)).tts)];
}

export function generateWhoSays({ skill, content, mastery = {}, rng = Math.random, prevItemId = null }) {
  const byNoise = animalsByNoise(content);
  const tiers = skill.tiers.map((tier) => ({ ...tier, items: (tier.items ?? []).filter((n) => byNoise.has(n)) }));
  const next = nextItem(tiers, mastery, rng, prevItemId);
  if (!next) return null;

  const noise = next.item;
  const known = next.open.map((o) => o.item).filter((n) => n !== noise);
  const others = shuffle(known, rng).slice(0, choiceCount(next.tier) - 1);
  if (others.length === 0) return null;

  return {
    skill: 'whosays',
    itemId: next.itemId,
    ...WHO,
    // The question is the noise itself, played before the words.
    cue: noise,
    bubble: { emoji: '🔊' },
    answer: {
      kind: 'pick',
      correct: byNoise.get(noise).id,
      choices: shuffle([noise, ...others], rng).map((n) => {
        const animal = byNoise.get(n);
        // A wrong animal answers in its own voice before it is named.
        return { id: animal.id, art: animal.id, cue: n, wrong: thatsAnimal(animal) };
      }),
    },
  };
}
