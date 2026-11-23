// Checks that hold for every game answered by picking one thing from the table,
// run against the real content, as a beginner and with every level unlocked.

import { describe, it, expect } from 'vitest';
import { loadContent } from '../systems/content.js';
import { GENERATOR_IDS, makeRequest } from './index.js';
import { EVERYTHING_SOLID } from '../systems/tryGame.js';
import { generateColours, colourLines } from './colours.js';
import { generateSame, sameLines } from './same.js';
import { generateWhoSays, whoSaysLines } from './whosays.js';
import { generateOddOne, oddOneLines } from './oddone.js';
import { ANIMAL_CLIPS } from '../systems/animalClips.js';

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

describe('find the same one', () => {
  const skill = skillOf('same');
  const look = ({ id, wrong, ...picture }) => JSON.stringify(picture);

  it('shows the picture to find, and exactly one thing on the table looks like it', () => {
    ask('same', EVERYTHING_SOLID, (request) => {
      const matching = request.answer.choices.filter((c) => look(c) === JSON.stringify(request.bubble));
      expect(matching, request.itemId).toHaveLength(1);
      expect(matching[0].id).toBe(request.answer.correct);
      // No two things on the table look alike.
      expect(new Set(request.answer.choices.map(look)).size).toBe(request.answer.choices.length);
    });
  });

  it('starts with different things of one kind, then colours, then turned pictures', () => {
    const first = new Set();
    ask('same', {}, (r) => {
      first.add(r.itemId.split(':')[0]);
      // Near misses: everything on the table is the same kind of thing.
      const kind = content.groups.find((g) => g.id === r.itemId.split(':')[1]);
      for (const choice of r.answer.choices) expect(kind.emoji).toContain(choice.emoji);
    });
    expect([...first]).toEqual(['same']);

    const kinds = skill.tiers[0].items.map((k) => `same:${k}`);
    const second = new Set();
    ask('same', solid(kinds), (r) => second.add(r.itemId.split(':')[0]));
    expect(second.has('same-colour')).toBe(true);
    expect(second.has('same-turned')).toBe(false);
  });

  it('turns a picture four different ways', () => {
    const turned = { ...skill, tiers: [{ ...skill.tiers[2], unlockAfter: undefined }] };
    for (let i = 0; i < 50; i++) {
      const request = generateSame({ skill: turned, content });
      expect(request.answer.choices.map((c) => c.angle ?? 0).sort((a, b) => a - b)).toEqual([0, 90, 180, 270]);
      expect(new Set(request.answer.choices.map((c) => c.emoji)).size).toBe(1);
    }
  });

  it('says only two things', () => {
    expect(sameLines()).toEqual(['Find the same one!', 'That one is different.']);
  });
});

describe('who says that?', () => {
  const skill = skillOf('whosays');

  it('asks only about real recordings', () => {
    for (const noise of skill.tiers.flatMap((t) => t.items)) expect(Object.keys(ANIMAL_CLIPS), noise).toContain(noise);
  });

  it('plays a noise as the question and offers the animal that makes it', () => {
    ask('whosays', EVERYTHING_SOLID, (request) => {
      const noise = request.itemId.split(':')[1];
      expect(request.cue).toBe(noise);
      const right = content.animals.find((a) => a.id === request.answer.correct);
      expect(right.sound).toBe(noise);
      for (const choice of request.answer.choices) {
        // Each choice is an animal's drawing, and answers in its own voice if picked wrongly.
        const animal = content.animals.find((a) => a.id === choice.id);
        expect(choice.art).toBe(animal.id);
        expect(choice.cue).toBe(animal.sound);
        expect(choice.wrong.tts).toBe(`That's a ${animal.name.toLowerCase()}.`);
      }
      // The bubble gives nothing away.
      expect(request.bubble).toEqual({ emoji: '🔊' });
    });
  });

  it('leaves out a noise no animal makes, and lists what it can say', () => {
    const lines = whoSaysLines(skill, content);
    expect(lines[0]).toBe('Who says that?');
    expect(lines).toContain("That's a cow.");
    const noCow = { ...content, animals: content.animals.filter((a) => a.id !== 'cow') };
    expect(whoSaysLines(skill, noCow)).not.toContain("That's a cow.");
    for (let i = 0; i < 100; i++) {
      const request = generateWhoSays({ skill, content: noCow, mastery: EVERYTHING_SOLID });
      expect(request.cue).not.toBe('moo');
      expect(request.answer.choices.map((c) => c.id)).not.toContain('cow');
    }
  });
});

describe('odd one out', () => {
  const skill = skillOf('oddone');
  const kindOf = (emoji) => content.groups.find((g) => g.emoji.includes(emoji)).id;

  it('puts three of a kind on the table and one that is not', () => {
    ask('oddone', EVERYTHING_SOLID, (request) => {
      const kind = request.itemId.split(':')[1];
      const { choices, correct } = request.answer;
      expect(choices).toHaveLength(4);
      expect(choices.filter((c) => kindOf(c.emoji) === kind)).toHaveLength(3);
      expect(kindOf(correct)).not.toBe(kind);
      expect(request.tts).toBe('Which one does not belong?');
    });
  });

  it('starts with kinds that are far apart, then pairs close ones', () => {
    ask('oddone', {}, (r) => expect(r.itemId.split(':')[0]).toBe('odd'));
    // Once the first kinds are solid, the closer ones arrive, one at a time.
    const open = solid(skill.tiers[0].items.map((k) => `odd:${k}`));
    const arrived = new Set();
    ask('oddone', open, (r) => arrived.add(r.itemId));
    expect([...arrived].filter((id) => id.startsWith('odd2:'))).toEqual(['odd2:vegetables']);

    const pairs = new Set();
    ask('oddone', EVERYTHING_SOLID, (r) => {
      const [tier, kind] = r.itemId.split(':');
      if (tier === 'odd2') pairs.add(`${kind}/${kindOf(r.answer.correct)}`);
    }, 800);
    expect([...pairs].sort()).toEqual(['food/fruit', 'food/vegetables', 'toys/clothes', 'toys/vehicles', 'vegetables/fruit']);
  });

  it('has nothing to ask without the kinds', () => {
    expect(generateOddOne({ skill, content: { ...content, groups: [] } })).toBeNull();
    expect(oddOneLines()).toHaveLength(2);
  });
});
