import { describe, it, expect } from 'vitest';
import { keyToAction, moveFocus, ACTIONS } from './input.js';

describe('keyToAction', () => {
  it('maps the button box keys', () => {
    expect(keyToAction('ArrowLeft')).toBe(ACTIONS.LEFT);
    expect(keyToAction('ArrowRight')).toBe(ACTIONS.RIGHT);
    expect(keyToAction('Space')).toBe(ACTIONS.GO);
    expect(keyToAction('Enter')).toBe(ACTIONS.GO);
    expect(keyToAction('Digit1')).toBe(ACTIONS.PICK_1);
    expect(keyToAction('Digit4')).toBe(ACTIONS.PICK_4);
  });
  it('ignores everything else', () => {
    expect(keyToAction('KeyA')).toBeNull();
    expect(keyToAction('Escape')).toBeNull();
  });
});

describe('moveFocus', () => {
  it('starts at the near end when nothing is highlighted', () => {
    expect(moveFocus(-1, 1, 5)).toBe(0);
    expect(moveFocus(-1, -1, 5)).toBe(4);
  });
  it('moves one step and stops at the ends', () => {
    expect(moveFocus(2, 1, 5)).toBe(3);
    expect(moveFocus(2, -1, 5)).toBe(1);
    expect(moveFocus(4, 1, 5)).toBe(4);
    expect(moveFocus(0, -1, 5)).toBe(0);
  });
  it('recovers when the list shrank under the highlight', () => {
    expect(moveFocus(6, -1, 3)).toBe(2);
    expect(moveFocus(6, 1, 3)).toBe(0);
  });
  it('has nothing to highlight in an empty list', () => {
    expect(moveFocus(0, 1, 0)).toBe(-1);
  });
});
