// Checks the parsed content/*.json files. Pure, and it imports only another pure
// module, so that both the game and the command-line tools (tools/voice/) can use it.

import { PAGES } from './farmPages.js';

const ANSWER_KINDS = ['count', 'pick'];
const REWARD_TYPES = ['friend', 'paint', 'hat', 'decoration', 'upgrade'];

/**
 * Pure. `raw` is the parsed JSON files; `generatorIds` are the skills the code can generate;
 * `soundNames` are the noises the game can make (left out, sounds are not checked).
 * Returns the usable content plus a list of human-readable problems.
 */
export function validateContent(raw, generatorIds, soundNames = null) {
  const errors = [];
  const bad = (msg) => { errors.push(msg); return false; };
  const list = (value, file) => (Array.isArray(value) ? value : (bad(`${file}: expected a list`), []));
  // A noise the game cannot make is dropped, and the thing itself is kept: it just stays quiet.
  const checkSound = (file) => (item) => {
    if (item.sound === undefined || !soundNames || soundNames.includes(item.sound)) return item;
    bad(`${file}: "${item.id}" has unknown sound "${item.sound}"`);
    const { sound, ...quiet } = item;
    return quiet;
  };
  // A page that does not exist is dropped, and the thing lives at Home.
  const checkPage = (item) => {
    if (item.page === undefined || PAGES.includes(item.page)) return item;
    bad(`rewards.json: "${item.id}" is on unknown page "${item.page}"`);
    const { page, ...atHome } = item;
    return atHome;
  };

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
  const ownedSkills = new Map();
  const animals = list(raw.animals?.animals, 'animals.json').filter((a) => {
    if (typeof a?.id !== 'string' || !a.id) return bad('animals.json: an animal has no id');
    if (seenAnimals.has(a.id)) return bad(`animals.json: animal "${a.id}" appears twice`);
    seenAnimals.add(a.id);
    return true;
  }).map(checkSound('animals.json')).map((a) => {
    // An animal owns a family of games ('skills'; a lone 'skill' is still read). A game
    // it cannot play is dropped, and a game belongs to the first animal that lists it.
    const { skill, ...rest } = a;
    const wanted = Array.isArray(a.skills) ? a.skills : (skill === undefined ? [] : [skill]);
    const skillsOwned = wanted.filter((id) => {
      if (!seenSkills.has(id)) return bad(`animals.json: animal "${a.id}" owns unknown or unusable skill "${id}"`);
      if (ownedSkills.has(id)) return bad(`animals.json: skill "${id}" is owned by "${ownedSkills.get(id)}" and "${a.id}"`);
      ownedSkills.set(id, a.id);
      return true;
    });
    return { ...rest, skills: skillsOwned };
  }).filter((a) => a.skills.length > 0 || bad(`animals.json: animal "${a.id}" has no game it can play`));

  const seenRewards = new Set();
  const rewards = list(raw.rewards?.rewards, 'rewards.json').filter((r) => {
    if (typeof r?.id !== 'string' || !r.id) return bad('rewards.json: a reward has no id');
    if (seenRewards.has(r.id)) return bad(`rewards.json: reward "${r.id}" appears twice`);
    if (!REWARD_TYPES.includes(r.type)) return bad(`rewards.json: reward "${r.id}" has unknown type "${r.type}"`);
    if (r.type === 'paint' && !r.value) return bad(`rewards.json: paint "${r.id}" has no value`);
    if (r.type === 'upgrade' && !r.value) return bad(`rewards.json: upgrade "${r.id}" does not say which upgrade it is`);
    // A building is drawn by code; anything else needs an emoji, apart from paint.
    if (r.type !== 'paint' && r.type !== 'upgrade' && !r.emoji) return bad(`rewards.json: reward "${r.id}" has no emoji to draw it with`);
    if (!Number.isInteger(r.day) || r.day < 1) return bad(`rewards.json: reward "${r.id}" needs a "day" (1 or more) to arrive on`);
    seenRewards.add(r.id);
    return true;
  }).map(checkPage).map((r, _, all) => {
    // A stage must follow the building it replaces, on the same page: otherwise the
    // older one would never come down, or would come down somewhere else.
    if (r.replaces === undefined) return r;
    const older = all.find((o) => o.type === 'upgrade' && o.value === r.replaces);
    const why = !older ? 'is not a building in "rewards"'
      : older.day >= r.day ? 'does not arrive before it'
        : (older.page ?? 'home') !== (r.page ?? 'home') ? 'is on another page' : null;
    if (!why) return r;
    bad(`rewards.json: reward "${r.id}" replaces "${r.replaces}", which ${why}`);
    const { replaces, ...alone } = r;
    return alone;
  });

  // Small things: the reward on any day with no big one. Optional.
  const buildings = new Set(rewards.filter((r) => r.type === 'upgrade').map((r) => r.value));
  const small = (Array.isArray(raw.rewards?.small) ? raw.rewards.small : []).filter((r) => {
    const where = `rewards.json: small thing "${r?.id}"`;
    if (typeof r?.id !== 'string' || !r.id) return bad('rewards.json: a small thing has no id');
    if (seenRewards.has(r.id)) return bad(`rewards.json: "${r.id}" appears twice`);
    const type = r.type ?? 'decoration';
    if (!['friend', 'decoration', 'paint', 'hat'].includes(type)) return bad(`${where} has unknown type "${r.type}"`);
    if (type === 'paint' && !r.value) return bad(`${where} is a paint with no value`);
    if (type !== 'paint' && !r.emoji) return bad(`${where} has no emoji to draw it with`);
    // A paint or hat given twice would be a wasted day, so those must be one-offs.
    if ((type === 'paint' || type === 'hat') && r.once !== true) return bad(`${where} must be marked "once": true`);
    if (r.needs !== undefined && !buildings.has(r.needs)) return bad(`${where} needs "${r.needs}", which is not a building in "rewards"`);
    seenRewards.add(r.id);
    return true;
  }).map(checkSound('rewards.json')).map(checkPage);

  // Words are optional: a content set with none simply has fewer first-sound pictures.
  const seenWords = new Set();
  const words = (Array.isArray(raw.words?.words) ? raw.words.words : []).filter((w) => {
    if (typeof w?.id !== 'string' || !/^[a-z][a-z-]*$/.test(w.id)) return bad(`words.json: "${w?.id}" is not a lowercase word`);
    if (seenWords.has(w.id)) return bad(`words.json: word "${w.id}" appears twice`);
    if (typeof w.emoji !== 'string' || !w.emoji) return bad(`words.json: word "${w.id}" has no emoji`);
    seenWords.add(w.id);
    return true;
  });

  // Colours are optional: without them the colour games have nothing to ask.
  const seenColours = new Set();
  const colours = (Array.isArray(raw.colours?.colours) ? raw.colours.colours : []).filter((c) => {
    if (typeof c?.id !== 'string' || !/^[a-z]+$/.test(c.id)) return bad(`colours.json: "${c?.id}" is not a lowercase colour name`);
    if (seenColours.has(c.id)) return bad(`colours.json: colour "${c.id}" appears twice`);
    if (!/^#[0-9a-f]{6}$/i.test(c.hex ?? '')) return bad(`colours.json: colour "${c.id}" needs a hex like "#ff0000"`);
    seenColours.add(c.id);
    return true;
  }).map((c) => ({ ...c, tint: parseInt(c.hex.slice(1), 16) }));

  // Kinds of thing, as pictures. No picture may be in two kinds, or "odd one out"
  // could have two right answers.
  const seenGroups = new Set();
  const seenPictures = new Set();
  const groups = (Array.isArray(raw.groups?.groups) ? raw.groups.groups : []).filter((g) => {
    if (typeof g?.id !== 'string' || !/^[a-z]+$/.test(g.id)) return bad(`groups.json: "${g?.id}" is not a lowercase name`);
    if (seenGroups.has(g.id)) return bad(`groups.json: kind "${g.id}" appears twice`);
    const pictures = Array.isArray(g.emoji) ? g.emoji.filter((e) => typeof e === 'string' && e) : [];
    if (new Set(pictures).size !== pictures.length) return bad(`groups.json: kind "${g.id}" has the same picture twice`);
    if (pictures.length < 4) return bad(`groups.json: kind "${g.id}" needs at least four pictures`);
    const shared = pictures.find((e) => seenPictures.has(e));
    if (shared) return bad(`groups.json: ${shared} is in "${g.id}" and in another kind`);
    pictures.forEach((e) => seenPictures.add(e));
    seenGroups.add(g.id);
    return true;
  });

  return { content: { animals, skills, letters, rewards, small, words, colours, groups }, errors };
}
