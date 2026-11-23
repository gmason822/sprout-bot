// "Try a game": the parent's way to play one chosen game over and over, for testing.
// The choice is kept only until the game is closed (session storage, not his save),
// so it cannot be left on by accident, and while it is on nothing he does is recorded.
//
// The choice is { skill, allLevels } or null.

const KEY = 'sproutbot.try';

/** The game being tried in this sitting, or null. */
export function loadTrying(storage = sessionStore()) {
  try {
    const raw = JSON.parse(storage.getItem(KEY));
    return typeof raw?.skill === 'string' ? { skill: raw.skill, allLevels: raw.allLevels === true } : null;
  } catch {
    return null;
  }
}

/** Choose a game to try, or null to go back to all of them. */
export function saveTrying(trying, storage = sessionStore()) {
  try {
    if (trying) storage.setItem(KEY, JSON.stringify(trying));
    else storage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

function sessionStore() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const SOLID = Object.freeze({ box: 3, seen: 3, correct: 3, lastSeen: 0 });

/**
 * A pretend record in which he is solid on everything, so every level of a game is
 * in play at once. Read-only: nothing is ever written to it.
 */
export const EVERYTHING_SOLID = new Proxy({}, {
  get: (_, id) => (typeof id === 'string' ? SOLID : undefined),
});

/** The mastery record a game should be generated from: his own, unless a test wants every level. */
export function masteryFor(trying, mastery) {
  return trying?.allLevels ? EVERYTHING_SOLID : mastery;
}

/**
 * What to offer while a game is being tried: only that game, asked by the animal that
 * owns it. Null if nothing is being tried, or the game has nothing to ask.
 * `ready` says which games can ask something right now.
 */
export function offerToTry(trying, animals, ready) {
  if (!trying || !ready(trying.skill)) return null;
  const animal = animals.find((a) => a.skills.includes(trying.skill));
  return animal ? [{ animal, skill: trying.skill }] : null;
}

/** What to call each game in the parent's list: its animal, and what it teaches. */
export function gameList(content) {
  return content.animals.flatMap((animal) => animal.skills.map((id) => {
    const skill = content.skills.find((s) => s.id === id);
    return { skill: id, label: `${animal.name}: ${skill?.title ?? skill?.tiers?.[0]?.title ?? id}` };
  }));
}
