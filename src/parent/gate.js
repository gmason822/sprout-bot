// The hidden way into the parent area: hold the top-right corner for three seconds,
// then tap three numbers that are written out as words.
//
// This is the one place that reads raw pointer events instead of game actions.
// It is not part of the child's game, and it has to work on every screen.

import { makeChallenge, checkEntry } from './challenge.js';

const HOLD_MS = 3000;
const GIVE_UP_MS = 20000;
// The corner is the top-right 12% by 18% of the screen, where the sun is drawn.
const inCorner = (e) => e.clientX > window.innerWidth * 0.88 && e.clientY < window.innerHeight * 0.18;

/** Overlays must live inside whatever is fullscreen, or they would not be visible. */
export function overlayRoot() {
  return document.fullscreenElement ?? document.body;
}

/**
 * `canOpen()` says whether the game is ready for it. `onOpen()` is called when the
 * number challenge appears (pause the game), `onPass()` when it is solved, and
 * `onCancel()` when it is failed, cancelled or left alone.
 */
export function installParentGate({ canOpen, onOpen, onPass, onCancel }) {
  let holdTimer = null;
  let open = false;

  const stopHold = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
  };

  window.addEventListener('pointerdown', (e) => {
    if (open || !inCorner(e) || !canOpen()) return;
    stopHold();
    holdTimer = setTimeout(showChallenge, HOLD_MS);
  }, true);
  window.addEventListener('pointerup', stopHold, true);
  window.addEventListener('pointercancel', stopHold, true);
  window.addEventListener('pointermove', (e) => { if (holdTimer && !inCorner(e)) stopHold(); }, true);

  function showChallenge() {
    stopHold();
    open = true;
    onOpen();

    const { digits, words } = makeChallenge();
    const entered = [];
    const overlay = document.createElement('div');
    overlay.className = 'parent-overlay';
    overlay.innerHTML = `
      <div class="parent-card parent-gate">
        <h1>Grown-ups only</h1>
        <p>Tap these numbers in order:</p>
        <p class="parent-words"></p>
        <div class="parent-keypad"></div>
        <button type="button" class="parent-button parent-quiet" data-cancel>Back to the game</button>
      </div>`;
    overlay.querySelector('.parent-words').textContent = words.join(',  ');

    const close = (passed) => {
      clearTimeout(giveUp);
      overlay.remove();
      open = false;
      if (passed) onPass();
      else onCancel();
    };
    // A screen left open by a resting palm closes itself.
    const giveUp = setTimeout(() => close(false), GIVE_UP_MS);

    const keypad = overlay.querySelector('.parent-keypad');
    for (let n = 1; n <= 9; n++) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'parent-key';
      key.textContent = String(n);
      key.addEventListener('click', () => {
        entered.push(n);
        key.classList.add('parent-key-used');
        const result = checkEntry(digits, entered);
        if (result !== 'more') close(result === 'pass');
      });
      keypad.appendChild(key);
    }
    overlay.querySelector('[data-cancel]').addEventListener('click', () => close(false));
    overlayRoot().appendChild(overlay);
  }
}
