// Loads content/*.json and checks it at boot. A bad entry is logged and skipped,
// never allowed to crash the game: a typo in a JSON file should cost one item, not the evening.

import animalsJson from '../../content/animals.json';
import skillsJson from '../../content/skills.json';
import lettersJson from '../../content/letters.json';
import rewardsJson from '../../content/rewards.json';
import wordsJson from '../../content/words.json';
import { validateContent } from './validateContent.js';

export { validateContent };

/** Load, validate and report. Called once at boot. */
export function loadContent(generatorIds) {
  const { content, errors } = validateContent(
    { animals: animalsJson, skills: skillsJson, letters: lettersJson, rewards: rewardsJson, words: wordsJson },
    generatorIds,
  );
  for (const message of errors) console.error(`[content] ${message}`);
  return content;
}
