import { describe, it, expect } from 'vitest';
import { allLines, lineKey, lineClipId } from './lines.js';
import { loadContent } from './content.js';
import { GENERATOR_IDS, makeRequest } from '../skills/index.js';
import { correctionLine, numberWord } from '../skills/count.js';
import { FIXED_LINES } from './phrases.js';

const content = loadContent(GENERATOR_IDS);
const lines = new Set(allLines(content));
const box = (n) => ({ box: n, seen: n, correct: n, lastSeen: 0 });

describe('allLines', () => {
  it('has every fixed phrase, each line once, sorted', () => {
    FIXED_LINES.forEach((line) => expect(lines.has(line), line).toBe(true));
    const list = allLines(content);
    expect(new Set(list).size).toBe(list.length);
    expect([...list].sort((a, b) => a.localeCompare(b))).toEqual(list);
    expect(list.length).toBeGreaterThan(200);
  });

  it('covers everything any game can ask or say back', () => {
    // Play every game many times, as a beginner and as someone who has mastered
    // everything, and check that no spoken line is missing from the list.
    const mastered = {};
    for (let n = 1; n <= 10; n++) for (const p of ['count', 'numeral', 'howmany']) mastered[`${p}:${n}`] = box(5);
    for (const l of content.letters) for (const p of ['letter-name', 'letter-lower', 'first-sound']) mastered[`${p}:${l.id}`] = box(5);
    for (const s of ['left', 'right', 'middle']) mastered[`side:${s}`] = box(5);
    for (const s of ['circle', 'square', 'triangle', 'star', 'heart']) mastered[`shape:${s}`] = box(5);
    for (const s of ['rectangle', 'oval', 'diamond']) mastered[`shape2:${s}`] = box(5);

    const missing = new Set();
    const check = (text) => { if (text !== null && !lines.has(text)) missing.add(text); };
    for (const mastery of [{}, mastered]) {
      for (const animal of content.animals) {
        for (let i = 0; i < 600; i++) {
          const request = makeRequest(animal.skill, { content, mastery, hasClip: () => false, childName: i % 2 ? 'Zoe' : '' });
          check(request.tts);
          for (const choice of request.answer.choices ?? []) check(choice.wrong.tts);
        }
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('covers counting aloud and every counting correction', () => {
    for (let n = 1; n <= 12; n++) expect(lines.has(numberWord(n)), numberWord(n)).toBe(true);
    for (let target = 1; target <= 10; target++) {
      for (let loaded = 1; loaded <= 12; loaded++) {
        if (loaded !== target) expect(lines.has(correctionLine(target, loaded).tts), `${target}/${loaded}`).toBe(true);
      }
    }
  });
});

describe('lineKey', () => {
  it('is readable, safe as a file name, and stable', () => {
    expect(lineKey('I need three apples!')).toMatch(/^i-need-three-apples-[0-9a-f]{8}$/);
    expect(lineKey('I need three apples!')).toBe(lineKey('I need three apples!'));
    expect(lineKey("That's D.")).toMatch(/^that-s-d-[0-9a-f]{8}$/);
    expect(lineClipId('Thank you!')).toBe(`lines/${lineKey('Thank you!')}`);
  });

  it('never gives two lines the same file', () => {
    const keys = allLines(content).map(lineKey);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach((key) => expect(key).toMatch(/^[a-z0-9-]+$/));
    // Lines that differ only in punctuation or case still get their own files.
    expect(lineKey('one')).not.toBe(lineKey('One.'));
  });

  it('keeps very long lines to a sensible length', () => {
    expect(lineKey('a '.repeat(200)).length).toBeLessThanOrEqual(49);
  });
});
