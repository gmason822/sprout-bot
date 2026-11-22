// Loads content/*.json and checks it at boot. A bad entry is logged and skipped,
// never allowed to crash the game: a typo in a JSON file should cost one item, not the evening.

import animalsJson from '../../content/animals.json';
import skillsJson from '../../content/skills.json';
import lettersJson from '../../content/letters.json';
import rewardsJson from '../../content/rewards.json';
import wordsJson from '../../content/words.json';

const ANSWER_KINDS = ['count', 'pick'];
const REWARD_TYPES = ['friend', 'paint', 'hat', 'decoration', 'upgrade'];

/**
 * Pure. `raw` is the parsed JSON files; `generatorIds` are the skills the code can generate.
 * Returns the usable content plus a list of human-readable problems.
 */
export function validateContent(raw, generatorIds) {
  const errors = [];
  const bad = (msg) => { errors.push(msg); return false; };
  const list = (value, file) => (Array.isArray(value) ? value : (bad(`${file}: expected a list`), []));

  // Letters first: skills and other letters refer to them.
  const seenLetters = new Set();
  const letters = list(raw.letters?.letters, 'letters.json').filter((l) => {
    if (typeof l?.id !== 'string' || !/^[A-Z]$/.test(l.id)) return bad(`letters.json: "${l?.id}" is not a single capital letter`);
    if (seenLetters.has(l.id)) return bad(`letters.json: letter ${l.id} appears twice`);
    seenLetters.add(l.id);
    return true;
  }).map((l) => {
    const refs = (key) => (l[key] ?? []).filter((other) => {
      if (seenLetters.has(other) || raw.letters.letters.some((x) => x?.id === other)) return true;
      return bad(`letters.json: ${l.id}.${key} points at unknown letter "${other}"`);
    });
    return { ...l, sameSoundAs: refs('sameSoundAs'), looksLike: refs('looksLike') };
  });

  const seenSkills = new Set();
  const skills = list(raw.skills?.skills, 'skills.json').filter((s) => {
    const where = `skills.json: skill "${s?.id}"`;
    if (typeof s?.id !== 'string' || !s.id) return bad('skills.json: a skill has no id');
    if (seenSkills.has(s.id)) return bad(`${where} appears twice`);
    if (!generatorIds.includes(s.id)) return bad(`${where} has no generator in src/skills/`);
    if (!ANSWER_KINDS.includes(s.answer)) return bad(`${where} has unknown answer kind "${s.answer}"`);
    if (!Array.isArray(s.tiers) || s.tiers.length === 0) return bad(`${where} has no tiers`);
    const tierIds = s.tiers.map((t) => t?.id);
    if (tierIds.some((id) => typeof id !== 'string' || !id)) return bad(`${where} has a tier with no id`);
    if (new Set(tierIds).size !== tierIds.length) return bad(`${where} has two tiers with the same id`);
    for (const t of s.tiers) {
      for (const key of ['unlockAfter', 'perItemAfter']) {
        if (t[key] !== undefined && (!tierIds.includes(t[key]) || t[key] === t.id)) {
          return bad(`${where} tier "${t.id}" ${key} points at unknown tier "${t[key]}"`);
        }
      }
    }
    seenSkills.add(s.id);
    return true;
  });

  const seenAnimals = new Set();
  const animals = list(raw.animals?.animals, 'animals.json').filter((a) => {
    if (typeof a?.id !== 'string' || !a.id) return bad('animals.json: an animal has no id');
    if (seenAnimals.has(a.id)) return bad(`animals.json: animal "${a.id}" appears twice`);
    if (!seenSkills.has(a.skill)) return bad(`animals.json: animal "${a.id}" owns unknown or unusable skill "${a.skill}"`);
    seenAnimals.add(a.id);
    return true;
  });

  const seenRewards = new Set();
  const rewards = list(raw.rewards?.rewards, 'rewards.json').filter((r) => {
    if (typeof r?.id !== 'string' || !r.id) return bad('rewards.json: a reward has no id');
    if (seenRewards.has(r.id)) return bad(`rewards.json: reward "${r.id}" appears twice`);
    if (!REWARD_TYPES.includes(r.type)) return bad(`rewards.json: reward "${r.id}" has unknown type "${r.type}"`);
    if (r.type === 'paint' && !r.value) return bad(`rewards.json: paint "${r.id}" has no value`);
    if (r.type === 'upgrade' && !r.value) return bad(`rewards.json: upgrade "${r.id}" does not say which upgrade it is`);
    if (r.type !== 'paint' && !r.emoji) return bad(`rewards.json: reward "${r.id}" has no emoji to draw it with`);
    if (!Number.isInteger(r.day) || r.day < 1) return bad(`rewards.json: reward "${r.id}" needs a "day" (1 or more) to arrive on`);
    seenRewards.add(r.id);
    return true;
  });

  // Small things: one of these on any day with no big reward. Optional.
  const small = (Array.isArray(raw.rewards?.small) ? raw.rewards.small : []).filter((r) => {
    if (typeof r?.id !== 'string' || !r.id.startsWith('small-')) return bad(`rewards.json: small thing "${r?.id}" must have an id starting with "small-"`);
    if (seenRewards.has(r.id)) return bad(`rewards.json: "${r.id}" appears twice`);
    if (!r.emoji) return bad(`rewards.json: small thing "${r.id}" has no emoji to draw it with`);
    seenRewards.add(r.id);
    return true;
  });

  // Words are optional: a content set with none simply has fewer first-sound pictures.
  const seenWords = new Set();
  const words = (Array.isArray(raw.words?.words) ? raw.words.words : []).filter((w) => {
    if (typeof w?.id !== 'string' || !/^[a-z][a-z-]*$/.test(w.id)) return bad(`words.json: "${w?.id}" is not a lowercase word`);
    if (seenWords.has(w.id)) return bad(`words.json: word "${w.id}" appears twice`);
    if (typeof w.emoji !== 'string' || !w.emoji) return bad(`words.json: word "${w.id}" has no emoji`);
    seenWords.add(w.id);
    return true;
  });

  return { content: { animals, skills, letters, rewards, small, words }, errors };
}

/** Load, validate and report. Called once at boot. */
export function loadContent(generatorIds) {
  const { content, errors } = validateContent(
    { animals: animalsJson, skills: skillsJson, letters: lettersJson, rewards: rewardsJson, words: wordsJson },
    generatorIds,
  );
  for (const message of errors) console.error(`[content] ${message}`);
  return content;
}
