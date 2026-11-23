// Checks that hold for every game answered by picking one thing from the table,
// run against the real content, as a beginner and with every level unlocked.

import { describe, it, expect } from 'vitest';
import { loadContent } from '../systems/content.js';
import { GENERATOR_IDS, makeRequest } from './index.js';
import { EVERYTHING_SOLID } from '../systems/tryGame.js';
import { generateColours, colourLines } from './colours.js';

const content = loadContent(GENERATOR_IDS);
const skillOf = (id) => content.skills.find((s) => s.id === id);
const solid = (ids) => Object.fromEntries(ids.map((id) => [id, { box: 3, seen: 3, correct: 3, lastSeen: 0 }]));

/** Ask a game many times and hand every request to `check`. */
function ask(skillId, mastery, check, times = 300) {
  for (let i = 0; i < times; i++) {
    const request = makeRequest(skillId, { content, mastery, hasClip: () => false, childName: '' });
    expect(request, skillId).not.toBeNull();
    check(request);
  }
}

describe.each(content.skills.filter((s) => s.answer === 'pick').map((s) => s.id))('%s', (skillId) => {
  it.each([['as a beginner', {}], ['with every level open', EVERYTHING_SOLID]])('always has one right answer on the table, %s', (_, mastery) => {
    ask(skillId, mastery, (request) => {
      const { choices, correct } = request.answer;
      expect(choices.length).toBeGreaterThanOrEqual(2);
      expect(choices.length).toBeLessThanOrEqual(4);
      const ids = choices.map((c) => c.id);
      expect(new Set(ids).size, `${request.itemId}: ${ids}`).toBe(ids.length);
      expect(ids.filter((id) => id === correct)).toHaveLength(1);
      for (const choice of choices) {
        expect(Boolean(choice.art || choice.emoji), `${request.itemId} choice ${choice.id} has a picture`).toBe(true);
        expect(choice.wrong, `${request.itemId} choice ${choice.id}`).toBeTruthy();
      }
      // The item it reports back for mastery belongs to one of its tiers.
      const tierId = request.itemId.split(':')[0];
      expect(skillOf(skillId).tiers.map((t) => t.id)).toContain(tierId);
    });
  });

  // Left and right has so few things to ask that it is allowed to repeat.
  it.skipIf(skillId === 'leftright')('does not ask the same thing twice running', () => {
    let prev = null;
    for (let i = 0; i < 60; i++) {
      const request = makeRequest(skillId, { content, mastery: EVERYTHING_SOLID, hasClip: () => false, childName: '', prevItemId: prev });
      expect(request.itemId).not.toBe(prev);
      prev = request.itemId;
    }
  });
});

describe('colours', () => {
  const skill = skillOf('colours');

  it('starts with four colours and brings in more once those are solid', () => {
    const seen = new Set();
    ask('colours', {}, (r) => seen.add(r.itemId));
    expect([...seen].sort()).toEqual(['colour:blue', 'colour:green', 'colour:red', 'colour:yellow']);

    const later = new Set();
    ask('colours', solid(['colour:red', 'colour:blue', 'colour:yellow', 'colour:green']), (r) => later.add(r.itemId.split(':')[0]));
    expect(later.has('colour2')).toBe(true);
    expect(later.has('colour3')).toBe(false);
  });

  it('shows one shape in different colours, and never the answer in the bubble', () => {
    ask('colours', EVERYTHING_SOLID, (request) => {
      const { choices, correct } = request.answer;
      expect(new Set(choices.map((c) => c.art)).size).toBe(1);
      expect(new Set(choices.map((c) => c.tint)).size).toBe(choices.length);
      expect(request.tts).toBe(`Bring me the ${correct} one!`);
      expect(request.bubble).toEqual({ emoji: '🎨' });
      expect(choices.find((c) => c.id !== correct).wrong.tts).toMatch(/^That's [a-z]+\.$/);
    });
  });

  it('lists every line it can say', () => {
    const lines = colourLines(skill);
    expect(lines).toContain('Bring me the purple one!');
    expect(lines).toContain("That's white.");
    expect(lines).toHaveLength(20);
  });

  it('has nothing to ask without colours or shapes', () => {
    expect(generateColours({ skill, content: { ...content, colours: [] } })).toBeNull();
    expect(generateColours({ skill: { ...skill, shapes: [] }, content })).toBeNull();
  });
});
