// The second step of the parent gate: three numbers written out as words.
// A child who cannot read cannot pass it, however long he holds the corner.

import { shuffle } from '../systems/mastery.js';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Three different digits from 1 to 9, with their words. Different every time. */
export function makeChallenge(rng = Math.random, length = 3) {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng).slice(0, length);
  return { digits, words: digits.map((d) => WORDS[d]) };
}

/** 'pass' when all are entered in order, 'fail' at the first wrong one, otherwise 'more'. */
export function checkEntry(digits, entered) {
  for (let i = 0; i < entered.length; i++) {
    if (entered[i] !== digits[i]) return 'fail';
  }
  return entered.length >= digits.length ? 'pass' : 'more';
}
