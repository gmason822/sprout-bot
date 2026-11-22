// Single source of truth for input. Scenes listen for actions, never raw keys or pointers.
//
//   TAP       touch / mouse on a registered thing
//   LEFT      ArrowLeft   moves the highlight
//   RIGHT     ArrowRight  moves the highlight
//   GO        Space/Enter taps the highlighted thing
//   PICK_1-4  1 2 3 4     taps that choice directly

export const ACTIONS = Object.freeze({
  TAP: 'TAP',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  GO: 'GO',
  PICK_1: 'PICK_1',
  PICK_2: 'PICK_2',
  PICK_3: 'PICK_3',
  PICK_4: 'PICK_4',
});

const KEY_MAP = {
  ArrowLeft: ACTIONS.LEFT,
  ArrowRight: ACTIONS.RIGHT,
  Space: ACTIONS.GO,
  Enter: ACTIONS.GO,
  NumpadEnter: ACTIONS.GO,
  Digit1: ACTIONS.PICK_1,
  Digit2: ACTIONS.PICK_2,
  Digit3: ACTIONS.PICK_3,
  Digit4: ACTIONS.PICK_4,
  Numpad1: ACTIONS.PICK_1,
  Numpad2: ACTIONS.PICK_2,
  Numpad3: ACTIONS.PICK_3,
  Numpad4: ACTIONS.PICK_4,
};

/** Pure: KeyboardEvent.code → action name, or null. */
export function keyToAction(code) {
  return KEY_MAP[code] ?? null;
}

/**
 * Pure: move a highlight along `count` things. -1 means nothing is highlighted yet.
 * It stops at the ends instead of wrapping, so LEFT never jumps to the far right.
 */
export function moveFocus(index, dir, count) {
  if (count <= 0) return -1;
  if (index < 0 || index >= count) return dir < 0 ? count - 1 : 0;
  return Math.max(0, Math.min(count - 1, index + dir));
}

// While the parent area is open nothing may reach the game: typing a name must not
// pick answers. This is one switch for every scene.
let suspended = false;
export function setInputSuspended(on) {
  suspended = Boolean(on);
}

/**
 * Wire a Phaser scene's pointer and keyboard to actions.
 * While locked nothing is emitted, which is how mashing during an animation
 * or a spoken request is ignored (no time-based debounce).
 */
export function createInput(scene) {
  const listeners = new Map();
  let locked = false;

  const emit = (action, payload) => {
    if (locked || suspended) return;
    for (const fn of listeners.get(action) ?? []) fn(payload);
  };

  const onKey = (event) => {
    // A held button must not repeat: one press, one action.
    if (event.repeat || suspended) return;
    const action = keyToAction(event.code);
    if (!action) return;
    event.preventDefault();
    emit(action);
  };
  // Listen on the window, not Phaser's keyboard plugin: Phaser 3.90 re-emits earlier
  // key events when several land in one frame, which is exactly what mashing two
  // buttons does. One native event must be one action.
  window.addEventListener('keydown', onKey);
  scene.events.once('shutdown', () => window.removeEventListener('keydown', onKey));

  return {
    on(action, fn) {
      if (!listeners.has(action)) listeners.set(action, []);
      listeners.get(action).push(fn);
    },
    /** Make a game object tappable. `hitArea` is a Phaser geom in the object's local space. */
    tappable(gameObject, id, hitArea, hitTest) {
      if (hitArea) gameObject.setInteractive(hitArea, hitTest);
      else gameObject.setInteractive();
      gameObject.on('pointerdown', () => emit(ACTIONS.TAP, id));
      return gameObject;
    },
    lock() { locked = true; },
    unlock() { locked = false; },
    get locked() { return locked; },
  };
}
