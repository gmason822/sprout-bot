// Turns the mastery records into something a parent can read: one group per tier
// of each game, every item shown, with its Leitner box (or null if he has not met it).

const capital = (word) => word.charAt(0).toUpperCase() + word.slice(1);

function entry(mastery, id, label) {
  const r = mastery[id];
  return { id, label, box: r?.box ?? null, seen: r?.seen ?? 0, correct: r?.correct ?? 0 };
}

/** The items one tier can ask about, as [id, label] pairs. */
function tierItems(skill, tier, content) {
  if (tier.min !== undefined && tier.max !== undefined) {
    // The counting game keys its numbers as "count:3" whichever tier they came from.
    const prefix = skill.answer === 'count' ? 'count' : tier.id;
    const out = [];
    for (let n = tier.min; n <= tier.max; n++) out.push([`${prefix}:${n}`, String(n)]);
    return out;
  }
  // The general way for a game to say what a tier asks about.
  if (tier.items) return tier.items.map((item) => [`${tier.id}:${item}`, capital(item)]);
  if (tier.sides) return tier.sides.map((s) => [`${tier.id}:${s}`, capital(s)]);
  if (tier.shapes) return tier.shapes.map((s) => [`${tier.id}:${s}`, capital(s)]);
  if (skill.source === 'letters.json') {
    return content.letters.map((l) => [`${tier.id}:${l.id}`, tier.case === 'lower' ? l.id.toLowerCase() : l.id]);
  }
  return [];
}

/**
 * Pure. Groups come straight from the tiers in skills.json and are labelled by each
 * tier's `title`, so a new game shows up here without any change. Tiers that share
 * a title are merged. Anything else he has a record for is listed under "Other"
 * rather than hidden.
 */
export function progressGroups(content, mastery) {
  const groups = [];
  const used = new Set();

  for (const skill of content.skills) {
    for (const tier of skill.tiers) {
      const title = tier.title ?? tier.id;
      let group = groups.find((g) => g.title === title);
      for (const [id, label] of tierItems(skill, tier, content)) {
        if (used.has(id)) continue;
        used.add(id);
        if (!group) {
          group = { title, items: [] };
          groups.push(group);
        }
        group.items.push(entry(mastery, id, label));
      }
    }
  }

  const other = Object.keys(mastery).filter((id) => !used.has(id)).sort().map((id) => entry(mastery, id, id));
  if (other.length > 0) groups.push({ title: 'Other', items: other });
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
