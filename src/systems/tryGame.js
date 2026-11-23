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

/** The animals to offer: only the game being tried, if there is one and it can ask something. */
export function animalsToOffer(trying, ready) {
  if (!trying) return null;
  const only = ready.filter((animal) => animal.skill === trying.skill);
  return only.length > 0 ? only : null;
}

/** What to call each game in the parent's list: its animal, and what it teaches. */
export function gameList(content) {
  return content.animals.map((animal) => {
    const skill = content.skills.find((s) => s.id === animal.skill);
    return { skill: animal.skill, label: `${animal.name}: ${skill?.title ?? skill?.tiers?.[0]?.title ?? animal.skill}` };
  });
}
