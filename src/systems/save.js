// Everything that survives a restart lives in one localStorage key.
// Storage can be missing, full or blocked, so every access is wrapped and the
// game carries on from memory if saving fails.

export const SAVE_KEY = 'sproutbot.save.v1';
export const SAVE_VERSION = 1;

export const DELIVERIES_MIN = 3;
export const DELIVERIES_MAX = 10;
const SKILL_LOG_MAX = 100;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    settings: { childName: '', deliveriesPerDay: 5, volume: 0.8, ttsOnly: false },
    mastery: {},
    farm: { rewards: [], paint: null, hat: null },
    days: 0,
    today: [],      // what he has delivered so far today, for the row on the farm
    skillLog: [],   // recent deliveries per skill, for choosing which animals to offer
    lastItem: {},   // last item asked per skill, so it is not asked twice running
  };
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v, min, max, fallback) => (Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback);

/**
 * Turn whatever was stored into a save this version can use. Unknown or damaged
 * parts fall back to defaults one field at a time, so one bad value never wipes
 * his whole farm. This is also where older versions will be upgraded.
 */
export function migrate(raw) {
  const save = defaultSave();
  if (!isObject(raw)) return save;

  // Migration hook: when SAVE_VERSION becomes 2, upgrade `raw` from version 1 here.

  if (isObject(raw.settings)) {
    const s = raw.settings;
    if (typeof s.childName === 'string') save.settings.childName = s.childName.trim().slice(0, 20);
    save.settings.deliveriesPerDay = int(s.deliveriesPerDay, DELIVERIES_MIN, DELIVERIES_MAX, save.settings.deliveriesPerDay);
    if (Number.isFinite(s.volume)) save.settings.volume = Math.max(0, Math.min(1, s.volume));
    save.settings.ttsOnly = s.ttsOnly === true;
  }

  if (isObject(raw.mastery)) {
    for (const [id, r] of Object.entries(raw.mastery)) {
      if (!isObject(r) || !Number.isFinite(r.box)) continue;
      const seen = int(r.seen, 0, 1e9, 0);
      save.mastery[id] = {
        box: int(r.box, 1, 5, 1),
        seen,
        correct: int(r.correct, 0, seen, 0),
        lastSeen: Number.isFinite(r.lastSeen) ? r.lastSeen : 0,
      };
    }
  }

  if (isObject(raw.farm)) {
    const owned = Array.isArray(raw.farm.rewards) ? raw.farm.rewards.filter((id) => typeof id === 'string') : [];
    save.farm.rewards = [...new Set(owned)];
    // Only something he owns can be worn.
    for (const slot of ['paint', 'hat']) {
      if (save.farm.rewards.includes(raw.farm[slot])) save.farm[slot] = raw.farm[slot];
    }
  }

  save.days = int(raw.days, 0, 1e9, 0);

  if (Array.isArray(raw.today)) {
    save.today = raw.today
      .filter((d) => isObject(d) && typeof d.art === 'string')
      .slice(0, DELIVERIES_MAX)
      .map((d) => ({
        art: d.art,
        ...(typeof d.label === 'string' ? { label: d.label } : {}),
        ...(Number.isFinite(d.numeral) ? { numeral: d.numeral } : {}),
        ...(Number.isFinite(d.tint) ? { tint: d.tint } : {}),
      }));
  }

  if (Array.isArray(raw.skillLog)) {
    save.skillLog = raw.skillLog.filter((s) => typeof s === 'string').slice(-SKILL_LOG_MAX);
  }

  if (isObject(raw.lastItem)) {
    for (const [skill, item] of Object.entries(raw.lastItem)) {
      if (typeof item === 'string') save.lastItem[skill] = item;
    }
  }

  return save;
}

/**
 * `storage` is localStorage, or anything with getItem/setItem/removeItem, or null.
 * If it cannot be used, the last saved state is kept in memory for this session.
 */
export function createStore(storage) {
  let memory = null;

  return {
    load() {
      try {
        const text = storage.getItem(SAVE_KEY);
        if (text) return migrate(JSON.parse(text));
      } catch { /* missing, blocked or corrupt: fall through */ }
      return migrate(memory);
    },
    /** Returns false if it could only be kept in memory. */
    save(state) {
      const snapshot = { ...state, version: SAVE_VERSION, skillLog: state.skillLog.slice(-SKILL_LOG_MAX) };
      memory = JSON.parse(JSON.stringify(snapshot));
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(snapshot));
        return true;
      } catch {
        return false;
      }
    },
    reset() {
      memory = null;
      try { storage.removeItem(SAVE_KEY); } catch { /* nothing to remove */ }
    },
  };
}

/** localStorage, or null where even touching it throws (some private modes). */
export function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
