// Single source of truth for input. Scenes listen for actions, never raw keys or pointers.
//
//   TAP       touch / mouse on a registered thing
//   LEFT      ArrowLeft   moves the highlight
//   RIGHT     ArrowRight  moves the highlight
//   GO        Space/Enter taps the highlighted thing
//   PICK_1-4  1 2 3 4     taps that choice directly
//   DRAG      a finger moving a draggable thing: { id, x, y }
//   DROP      the finger lifting after a drag: { id }

export const ACTIONS = Object.freeze({
  TAP: 'TAP',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  GO: 'GO',
  PICK_1: 'PICK_1',
  PICK_2: 'PICK_2',
  PICK_3: 'PICK_3',
  PICK_4: 'PICK_4',
  DRAG: 'DRAG',
  DROP: 'DROP',
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
    /**
     * Make a game object draggable as well as tappable. A press that barely moves
     * is a TAP; one that travels is a DRAG followed by a DROP. Small fingers wobble,
     * so the scene's drag threshold decides which it is.
     */
    draggable(gameObject, id, hitArea, hitTest) {
      if (hitArea) gameObject.setInteractive(hitArea, hitTest);
      else gameObject.setInteractive();
      scene.input.dragDistanceThreshold = 14;
      scene.input.setDraggable(gameObject);
      let dragged = false;
      // Where on the thing the finger took hold, so it does not jump to the fingertip.
      let grab = { x: 0, y: 0 };
      const at = (pointer) => pointer.positionToCamera(scene.cameras.main);
      // Taken when the finger first touches, not when the drag is recognised: by
      // then the finger has already travelled, and the thing would trail behind it.
      gameObject.on('pointerdown', (pointer) => {
        dragged = false;
        const p = at(pointer);
        grab = { x: gameObject.x - p.x, y: gameObject.y - p.y };
      });
      // Once Phaser calls it a drag it is one, even if the finger lifts straight away.
      gameObject.on('dragstart', () => { dragged = true; });
      gameObject.on('drag', (pointer) => {
        const p = at(pointer);
        emit(ACTIONS.DRAG, { id, x: p.x + grab.x, y: p.y + grab.y });
      });
      gameObject.on('dragend', (pointer) => {
        if (!dragged) return;
        // The finger can lift somewhere it never reported moving to, so send where
        // it actually ended before the drop.
        const p = at(pointer);
        emit(ACTIONS.DRAG, { id, x: p.x + grab.x, y: p.y + grab.y });
        emit(ACTIONS.DROP, { id });
      });
      gameObject.on('pointerup', () => { if (!dragged) emit(ACTIONS.TAP, id); });
      return gameObject;
    },
    lock() { locked = true; },
    unlock() { locked = false; },
    get locked() { return locked; },
  };
}
