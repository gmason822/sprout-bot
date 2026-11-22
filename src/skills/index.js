// The skill registry. Adding a skill is one generator here, one entry in
// content/skills.json and an animal in content/animals.json. Scenes never change.

import { generateCount } from './count.js';
import { generateLetters } from './letters.js';
import { generateLeftRight } from './leftright.js';
import { generateNumbers } from './numbers.js';
import { generateFirstSound } from './firstsound.js';
import { generateShapes } from './shapes.js';

const GENERATORS = {
  count: generateCount,
  letters: generateLetters,
  leftright: generateLeftRight,
  numbers: generateNumbers,
  firstsound: generateFirstSound,
  shapes: generateShapes,
};

export const GENERATOR_IDS = Object.keys(GENERATORS);

/**
 * Build the next request for a skill, or null when there is nothing it can ask.
 * `ctx` is { content, mastery, rng, hasClip, childName, prevItemId }.
 * A request with no TTS text is only usable if every one of its clips is recorded.
 */
export function makeRequest(skillId, ctx) {
  const skill = ctx.content.skills.find((s) => s.id === skillId);
  const generate = GENERATORS[skillId];
  if (!skill || !generate) return null;
  const request = generate({ ...ctx, skill });
  if (!request) return null;
  if (request.tts === null && !request.say.every((id) => ctx.hasClip?.(id))) return null;
  return request;
}
