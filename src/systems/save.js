// Everything that survives a restart lives in one localStorage key.
// Storage can be missing, full or blocked, so every access is wrapped and the
// game carries on from memory if saving fails.

export const SAVE_KEY = 'sproutbot.save.v1';
export const SAVE_VERSION = 1;

export const DELIVERIES_MIN = 3;
export const DELIVERIES_MAX = 10;
const SKILL_LOG_MAX = 100;
const THINGS_MAX = 400;
const LOG_MAX = 1500;
export const DAYS_MAX = 9999;

// `log` is which day gave which reward: [{ day, id }], oldest first.
const defaultFarm = () => ({ rewards: [], paint: null, hat: null, box: [], placed: [], log: [] });

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    settings: { childName: '', deliveriesPerDay: 5, volume: 0.8, ttsOnly: false },
    mastery: {},
    farm: defaultFarm(),
    days: 0,
    today: [],      // what he has delivered so far today, for the row on the farm
    skillLog: [],   // recent deliveries per skill, for choosing which animals to offer
    lastItem: {},   // last item asked per skill, so it is not asked twice running
    // His real farm, kept safe while a parent tries out other days: { days, today, farm }.
    bookmark: null,
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

  save.farm = migrateFarm(raw.farm);
  save.days = int(raw.days, 0, DAYS_MAX, 0);
  save.today = migrateToday(raw.today);

  if (isObject(raw.bookmark) && isObject(raw.bookmark.farm)) {
    save.bookmark = {
      days: int(raw.bookmark.days, 0, DAYS_MAX, 0),
      today: migrateToday(raw.bookmark.today),
      farm: migrateFarm(raw.bookmark.farm),
    };
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

function migrateFarm(raw) {
  const farm = defaultFarm();
  if (!isObject(raw)) return farm;
  const owned = Array.isArray(raw.rewards) ? raw.rewards.filter((id) => typeof id === 'string') : [];
  farm.rewards = [...new Set(owned)];
  // Only something he owns can be worn.
  for (const slot of ['paint', 'hat']) {
    if (farm.rewards.includes(raw[slot])) farm[slot] = raw[slot];
  }
  // The home farm: things waiting in the gift box, and things he has placed.
  if (Array.isArray(raw.box)) {
    farm.box = raw.box.filter((id) => typeof id === 'string').slice(0, THINGS_MAX);
  }
  if (Array.isArray(raw.placed)) {
    farm.placed = raw.placed
      .filter((p) => isObject(p) && typeof p.item === 'string' && Number.isFinite(p.x) && Number.isFinite(p.y))
      .slice(0, THINGS_MAX)
      .map((p) => ({ item: p.item, x: Math.round(p.x), y: Math.round(p.y) }));
  }
  if (Array.isArray(raw.log)) {
    farm.log = raw.log
      .filter((e) => isObject(e) && typeof e.id === 'string' && Number.isFinite(e.day))
      .slice(-LOG_MAX)
      .map((e) => ({ day: int(e.day, 0, DAYS_MAX, 0), id: e.id }));
  }
  return farm;
}

function migrateToday(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => isObject(d) && (typeof d.art === 'string' || typeof d.emoji === 'string'))
    .slice(0, DELIVERIES_MAX)
    .map((d) => ({
      // A delivery is a drawing or an emoji.
      ...(typeof d.art === 'string' ? { art: d.art } : { emoji: d.emoji.slice(0, 16) }),
      ...(typeof d.label === 'string' ? { label: d.label } : {}),
      ...(Number.isFinite(d.numeral) ? { numeral: d.numeral } : {}),
      ...(Number.isFinite(d.tint) ? { tint: d.tint } : {}),
      ...(Number.isFinite(d.angle) ? { angle: d.angle } : {}),
      ...(d.flipX === true ? { flipX: true } : {}),
    }));
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
