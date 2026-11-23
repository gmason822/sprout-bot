// The skill registry. Adding a skill is one generator here, one entry in
// content/skills.json and an animal in content/animals.json. Scenes never change.

import { generateCount, countLines } from './count.js';
import { generateLetters, letterLines } from './letters.js';
import { generateLeftRight, leftRightLines } from './leftright.js';
import { generateNumbers, numberLines } from './numbers.js';
import { generateFirstSound, firstSoundLines } from './firstsound.js';
import { generateShapes, shapeLines } from './shapes.js';
import { generateColours, colourLines } from './colours.js';
import { generateSame, sameLines } from './same.js';
import { generateWhoSays, whoSaysLines } from './whosays.js';
import { generateOddOne, oddOneLines } from './oddone.js';
import { generatePattern, patternLines } from './pattern.js';

const GENERATORS = {
  count: generateCount,
  letters: generateLetters,
  leftright: generateLeftRight,
  numbers: generateNumbers,
  firstsound: generateFirstSound,
  shapes: generateShapes,
  colours: generateColours,
  same: generateSame,
  whosays: generateWhoSays,
  oddone: generateOddOne,
  pattern: generatePattern,
};

export const GENERATOR_IDS = Object.keys(GENERATORS);

// Each skill also lists every line it can say, so the whole voice can be made ahead of time.
const LINES = {
  count: countLines,
  letters: letterLines,
  leftright: leftRightLines,
  numbers: numberLines,
  firstsound: firstSoundLines,
  shapes: shapeLines,
  colours: colourLines,
  same: sameLines,
  whosays: whoSaysLines,
  oddone: oddOneLines,
  pattern: patternLines,
};

/** Every line the skills in this content can say. */
export function skillLines(content) {
  return content.skills.flatMap((skill) => LINES[skill.id]?.(skill, content) ?? []);
}

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
