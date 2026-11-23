// The parent area: settings and the progress view. Plain HTML over the game,
// because a parent needs to read and type, which the child's screens never ask for.

import { DELIVERIES_MIN, DELIVERIES_MAX, DAYS_MAX } from '../systems/save.js';
import { buildingsAt } from '../systems/dayTravel.js';
import { progressGroups, progressSummary } from './progress.js';
import { overlayRoot } from './gate.js';

const BOX_NOTE = ['', 'new or struggling', 'getting there', 'solid', 'strong', 'mastered'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Open the panel. `onPreview({ volume })` lets a setting be heard before saving.
 * `voiceCheck` is { lines, has(text), speak(text) }: every line the game can say, whether
 * it has a generated clip, and a way to hear it.
 * `onClose({ settings, reset, days, restore, keep })` gets the new settings (or null if
 * unchanged), `reset: true` if the parent chose to wipe everything, `days` if the farm
 * should move to that many finished days (else null), `restore: true` to put his real
 * farm back, and `keep: true` to make the farm being tested the real one.
 */
export function openParentPanel({ state, content, voiceCheck, onPreview, onClose }) {
  const draft = { ...state.settings };
  const overlay = el('div', 'parent-overlay');
  const card = el('div', 'parent-card');
  overlay.appendChild(card);

  const finish = (result) => {
    overlay.remove();
    onClose(result);
  };
  // What every way of closing reports, other than wiping everything.
  const closing = () => {
    draft.childName = draft.childName.trim();
    const changed = Object.keys(draft).some((key) => draft[key] !== state.settings[key]);
    return { settings: changed ? draft : null, reset: false, days: null, restore: false, keep: false };
  };

  card.appendChild(el('h1', '', 'Parent area'));

  // ----- settings -----
  const settings = el('section', 'parent-section');
  settings.appendChild(el('h2', '', 'Settings'));

  const nameRow = el('label', 'parent-row');
  nameRow.appendChild(el('span', 'parent-label', "Child's name"));
  const name = el('input', 'parent-input');
  name.type = 'text';
  name.maxLength = 20;
  name.autocomplete = 'off';
  name.value = draft.childName;
  name.placeholder = 'Optional';
  name.addEventListener('input', () => { draft.childName = name.value; });
  nameRow.appendChild(name);
  settings.appendChild(nameRow);
  settings.appendChild(el('p', 'parent-hint', 'Letters start with the letters in his name. It is kept on this device only.'));

  const dayRow = el('div', 'parent-row');
  dayRow.appendChild(el('span', 'parent-label', 'Deliveries in a farm day'));
  const stepper = el('div', 'parent-stepper');
  const less = el('button', 'parent-button parent-step', '−');
  const count = el('span', 'parent-count', String(draft.deliveriesPerDay));
  const more = el('button', 'parent-button parent-step', '+');
  less.type = more.type = 'button';
  const step = (by) => {
    draft.deliveriesPerDay = Math.max(DELIVERIES_MIN, Math.min(DELIVERIES_MAX, draft.deliveriesPerDay + by));
    count.textContent = String(draft.deliveriesPerDay);
  };
  less.addEventListener('click', () => step(-1));
  more.addEventListener('click', () => step(1));
  stepper.append(less, count, more);
  dayRow.appendChild(stepper);
  settings.appendChild(dayRow);
  settings.appendChild(el('p', 'parent-hint', `A day ends at sunset after this many (${DELIVERIES_MIN} to ${DELIVERIES_MAX}). Five is about 3 to 5 minutes.`));

  const volumeRow = el('label', 'parent-row');
  volumeRow.appendChild(el('span', 'parent-label', 'Volume'));
  const volume = el('input', 'parent-range');
  volume.type = 'range';
  volume.min = '0';
  volume.max = '100';
  volume.step = '5';
  volume.value = String(Math.round(draft.volume * 100));
  volume.addEventListener('input', () => { draft.volume = Number(volume.value) / 100; });
  volume.addEventListener('change', () => onPreview?.({ volume: draft.volume }));
  volumeRow.appendChild(volume);
  settings.appendChild(volumeRow);

  const voiceRow = el('label', 'parent-row');
  voiceRow.appendChild(el('span', 'parent-label', 'Use the computer voice only'));
  const voice = el('input', 'parent-check');
  voice.type = 'checkbox';
  voice.checked = draft.ttsOnly;
  voice.addEventListener('change', () => { draft.ttsOnly = voice.checked; });
  voiceRow.appendChild(voice);
  settings.appendChild(voiceRow);
  settings.appendChild(el('p', 'parent-hint', 'Off: recorded clips are used wherever they exist. Letter sounds always use recordings.'));
  card.appendChild(settings);

  // ----- farm day -----
  let days = state.days;
  const travel = el('section', 'parent-section');
  travel.appendChild(el('h2', '', 'Farm day'));
  const travelRow = el('div', 'parent-row');
  travelRow.appendChild(el('span', 'parent-label', 'Farm days finished'));
  const dayStepper = el('div', 'parent-stepper');
  const earlier = el('button', 'parent-button parent-step', '−');
  const dayInput = el('input', 'parent-input parent-number');
  const later = el('button', 'parent-button parent-step', '+');
  earlier.type = later.type = 'button';
  dayInput.type = 'number';
  dayInput.min = '0';
  dayInput.max = String(DAYS_MAX);
  dayInput.inputMode = 'numeric';
  const forecast = el('p', 'parent-hint');
  const setDays = (value, typed = false) => {
    days = Number.isFinite(value) ? Math.max(0, Math.min(DAYS_MAX, Math.round(value))) : state.days;
    // Leave the box alone while it is being typed in, or the cursor jumps.
    if (!typed) dayInput.value = String(days);
    const { have, next, total } = buildingsAt(content.rewards, days);
    forecast.textContent =
      (days === state.days ? 'Now: ' : `At ${days}: `) +
      (have.length === 0 ? 'an empty field' : `${have.length} of ${total} buildings (${have.map((r) => r.name).join(', ')})`) + '. ' +
      (next
        ? `Next is the ${next.name}, built at the end of day ${next.day}: set this to ${next.day - 1} and play one day to watch it go up.`
        : 'Every building is built.');
  };
  earlier.addEventListener('click', () => setDays(days - 1));
  later.addEventListener('click', () => setDays(days + 1));
  dayInput.addEventListener('input', () => setDays(dayInput.valueAsNumber, true));
  dayInput.addEventListener('blur', () => setDays(days));
  setDays(days);
  dayStepper.append(earlier, dayInput, later);
  travelRow.appendChild(dayStepper);
  travel.append(travelRow, forecast);
  travel.appendChild(el('p', 'parent-hint',
    'For testing. Going forward gives every skipped day its reward; going back takes away what was earned after that day. ' +
    'The first change keeps a copy of his real farm, so you can always return to it. It takes effect when you press Done.'));
  if (state.bookmark) {
    const testing = el('div', 'parent-confirm parent-testing');
    testing.appendChild(el('p', '',
      `You are testing. His real farm (${state.bookmark.days} ${state.bookmark.days === 1 ? 'day' : 'days'} finished) is kept safe.`));
    const back = el('button', 'parent-button', 'Return to his real farm');
    const keep = el('button', 'parent-button parent-quiet', 'Keep this farm instead');
    back.type = keep.type = 'button';
    back.addEventListener('click', () => finish({ ...closing(), restore: true }));
    keep.addEventListener('click', () => finish({ ...closing(), keep: true }));
    testing.append(back, keep);
    travel.appendChild(testing);
  }
  card.appendChild(travel);

  // ----- progress -----
  const progress = el('section', 'parent-section');
  progress.appendChild(el('h2', '', 'Progress'));
  const groups = progressGroups(content, state.mastery);
  const { met, solid, total } = progressSummary(groups);
  const rewards = state.farm.rewards.length;
  progress.appendChild(el('p', 'parent-hint',
    `${state.days} farm ${state.days === 1 ? 'day' : 'days'} finished, ${rewards} ${rewards === 1 ? 'reward' : 'rewards'} earned. ` +
    `${met} of ${total} items met, ${solid} solid.`));

  const legend = el('p', 'parent-legend');
  legend.appendChild(el('span', 'parent-dot parent-box-none'));
  legend.appendChild(el('span', '', 'not met yet'));
  for (let box = 1; box <= 5; box++) {
    legend.appendChild(el('span', `parent-dot parent-box-${box}`));
    legend.appendChild(el('span', '', BOX_NOTE[box]));
  }
  progress.appendChild(legend);

  for (const group of groups) {
    progress.appendChild(el('h3', '', group.title));
    const chips = el('div', 'parent-chips');
    for (const item of group.items) {
      const chip = el('span', 'parent-chip');
      chip.appendChild(el('span', `parent-dot parent-box-${item.box ?? 'none'}`));
      chip.appendChild(el('span', '', item.label));
      chip.title = item.box === null
        ? 'Not met yet'
        : `Asked ${item.seen} ${item.seen === 1 ? 'time' : 'times'}, right first time ${item.correct}`;
      chips.appendChild(chip);
    }
    progress.appendChild(chips);
  }
  progress.appendChild(el('p', 'parent-hint',
    'Only the first try at each request counts. Left and right has two answers, so half of all guesses are right: read it as a trend.'));
  card.appendChild(progress);

  // ----- voice check -----
  if (voiceCheck?.lines?.length) {
    const section = el('section', 'parent-section');
    section.appendChild(el('h2', '', 'Voice check'));
    const missing = voiceCheck.lines.filter((line) => !voiceCheck.has(line)).length;
    section.appendChild(el('p', 'parent-hint',
      `Every line the game can say (${voiceCheck.lines.length}). Tap one to hear it. ` +
      (missing === 0
        ? 'All of them use the generated voice.'
        : `${missing} have no generated clip yet and use this device's own voice; they are marked with a dot.`) +
      ' If one sounds wrong, note its exact words: it can be respelled for the speech engine in content/voice.json.'));
    const details = el('details', 'parent-details');
    details.appendChild(el('summary', '', 'Show all lines'));
    const list = el('div', 'parent-lines');
    // Built only when opened: a few hundred buttons are not worth making every time.
    details.addEventListener('toggle', () => {
      if (!details.open || list.childElementCount > 0) return;
      for (const line of voiceCheck.lines) {
        const button = el('button', `parent-line${voiceCheck.has(line) ? '' : ' parent-line-device'}`, line);
        button.type = 'button';
        button.addEventListener('click', () => voiceCheck.speak(line));
        list.appendChild(button);
      }
    });
    details.appendChild(list);
    section.appendChild(details);
    card.appendChild(section);
  }

  // ----- reset -----
  const danger = el('section', 'parent-section');
  danger.appendChild(el('h2', '', 'Start again'));
  const reset = el('button', 'parent-button parent-danger', 'Reset everything…');
  reset.type = 'button';
  const confirm = el('div', 'parent-confirm');
  confirm.hidden = true;
  confirm.appendChild(el('p', '', 'This wipes his farm, rewards, progress and these settings on this device. It cannot be undone.'));
  const yes = el('button', 'parent-button parent-danger', 'Yes, wipe it all');
  const no = el('button', 'parent-button parent-quiet', 'Keep everything');
  yes.type = no.type = 'button';
  confirm.append(yes, no);
  reset.addEventListener('click', () => { confirm.hidden = false; reset.hidden = true; });
  no.addEventListener('click', () => { confirm.hidden = true; reset.hidden = false; });
  yes.addEventListener('click', () => finish({ settings: null, reset: true, days: null, restore: false, keep: false }));
  danger.append(reset, confirm);
  card.appendChild(danger);

  // ----- done -----
  const done = el('button', 'parent-button parent-done', 'Done');
  done.type = 'button';
  done.addEventListener('click', () => finish({ ...closing(), days: days === state.days ? null : days }));
  card.appendChild(done);

  overlayRoot().appendChild(overlay);
  return overlay;
}
