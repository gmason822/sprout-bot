// Turns the mastery records into something a parent can read: one group per kind
// of item, every item shown, with its Leitner box (or null if he has not met it).

const SIDE_LABEL = { left: 'Left', right: 'Right' };

function entry(mastery, id, label) {
  const r = mastery[id];
  return { id, label, box: r?.box ?? null, seen: r?.seen ?? 0, correct: r?.correct ?? 0 };
}

/**
 * Pure. Groups are built from the skills in the content, so a new skill that uses
 * numbers, letters or sides shows up without changes here. Anything else he has a
 * record for is listed under "Other" rather than hidden.
 */
export function progressGroups(content, mastery) {
  const groups = [];
  const used = new Set();
  const add = (title, items) => {
    items.forEach((i) => used.add(i.id));
    if (items.length > 0) groups.push({ title, items });
  };

  for (const skill of content.skills) {
    if (skill.answer === 'count') {
      const numbers = new Set();
      for (const t of skill.tiers) {
        for (let n = t.min; n <= t.max; n++) numbers.add(n);
      }
      add('Counting', [...numbers].sort((a, b) => a - b).map((n) => entry(mastery, `count:${n}`, String(n))));
      continue;
    }
    for (const tier of skill.tiers) {
      if (tier.ask) {
        add(tier.ask === 'sound' ? 'Letter sounds' : 'Letter names',
          content.letters.map((l) => entry(mastery, `${tier.id}:${l.id}`, l.id)));
      } else if (tier.sides) {
        add('Left and right', tier.sides.map((s) => entry(mastery, `${tier.id}:${s}`, SIDE_LABEL[s] ?? s)));
      }
    }
  }

  add('Other', Object.keys(mastery).filter((id) => !used.has(id)).sort().map((id) => entry(mastery, id, id)));
  return groups;
}

/** How many items he has met, and how many are solid (box 3 or higher). */
export function progressSummary(groups) {
  const items = groups.flatMap((g) => g.items);
  return {
    met: items.filter((i) => i.box !== null).length,
    solid: items.filter((i) => (i.box ?? 0) >= 3).length,
    total: items.length,
  };
}
