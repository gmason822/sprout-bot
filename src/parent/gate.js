// The hidden way into the parent area: hold the top-right corner for three seconds,
// then tap three numbers that are written out as words.
//
// This is the one place that reads raw pointer events instead of game actions.
// It is not part of the child's game, and it has to work on every screen.

import { makeChallenge, checkEntry } from './challenge.js';

const HOLD_MS = 3000;
const GIVE_UP_MS = 20000;
// A second way in, for any device where a long press is taken over by the browser:
// five quick taps on the sun. The number words still keep a child out.
const TAPS = 5;
const TAPS_WITHIN_MS = 2500;

/** Pure. Given the times of recent taps (oldest first), have enough landed close together? */
export function isTapBurst(times, now) {
  return times.filter((t) => now - t <= TAPS_WITHIN_MS).length >= TAPS;
}

/**
 * Pure. Is (x, y) in the hold zone? The zone is measured from the game picture, not
 * the screen: on a wide phone the picture sits in the middle with bars at the sides,
 * and the sun the parent is told to hold is well inside the screen's corner. It covers
 * the sun and everything above and to the right of it, bars included.
 * `rect` is the game canvas's { left, top, width, height } on screen.
 */
export function inHoldZone(x, y, rect) {
  return x >= rect.left + rect.width * 0.84 && y <= rect.top + rect.height * 0.24;
}

function inCorner(e) {
  const canvas = document.querySelector('#game canvas');
  const rect = canvas?.getBoundingClientRect()
    ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  return inHoldZone(e.clientX, e.clientY, rect);
}

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
  let ring = null;
  let open = false;
  let taps = [];

  const stopHold = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
    ring?.remove();
    ring = null;
  };

  window.addEventListener('pointerdown', (e) => {
    if (open || !inCorner(e) || !canOpen()) return;
    stopHold();
    const now = performance.now();
    taps = [...taps.filter((t) => now - t <= TAPS_WITHIN_MS), now];
    if (isTapBurst(taps, now)) return showChallenge();
    holdTimer = setTimeout(showChallenge, HOLD_MS);
    // A ring closes in around the finger, so a parent can see the hold is counting.
    // It stays invisible for the first second, so an ordinary tap never shows it.
    ring = document.createElement('div');
    ring.className = 'parent-hold';
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    overlayRoot().appendChild(ring);
  }, true);
  window.addEventListener('pointerup', stopHold, true);
  window.addEventListener('pointercancel', stopHold, true);
  window.addEventListener('pointermove', (e) => { if (holdTimer && !inCorner(e)) stopHold(); }, true);

  function showChallenge() {
    stopHold();
    taps = [];
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
