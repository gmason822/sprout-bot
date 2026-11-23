// Step 1 of `npm run voice`: work out every line the game can say and what to hand
// the speech engine for each. Writes a job list for synthesize.py.
//
//   node tools/voice/lines.mjs <jobs.json>

import { readFileSync, writeFileSync } from 'node:fs';
import { validateContent } from '../../src/systems/validateContent.js';
import { GENERATOR_IDS } from '../../src/skills/index.js';
import { allLines, lineKey } from '../../src/systems/lines.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../../content/${name}.json`, import.meta.url), 'utf8'));

const { content, errors } = validateContent({
  animals: read('animals'), skills: read('skills'), letters: read('letters'), rewards: read('rewards'), words: read('words'),
  colours: read('colours'), groups: read('groups'),
}, GENERATOR_IDS);
for (const message of errors) console.error(`[content] ${message}`);

const voice = read('voice');
const lines = allLines(content);

/**
 * What the engine is asked to say for a line. A bare word ("three", said as each
 * thing is counted) is given a capital and a full stop, which makes the engine say
 * it as a complete utterance instead of trailing off.
 */
function spoken(text) {
  if (voice.say?.[text]) return voice.say[text];
  if (/^[a-z]+$/.test(text)) return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  return text;
}

for (const key of Object.keys(voice.say ?? {})) {
  if (!lines.includes(key)) console.error(`[voice] "say" has an entry for a line the game never says: "${key}"`);
}

const jobs = {
  settings: {
    voice: voice.voice, lang: voice.lang, speed: voice.speed, engineSpeed: voice.engineSpeed ?? 1,
    sentencePause: voice.sentencePause, bitrate: voice.bitrate,
  },
  lines: lines.map((text) => ({ key: lineKey(text), text, spoken: spoken(text) })),
};
writeFileSync(process.argv[2], JSON.stringify(jobs, null, 1));
console.log(`${jobs.lines.length} lines to speak`);
