import { describe, it, expect } from 'vitest';
import { planSequence, ttsTimeoutMs, clipTimeoutMs } from './audio.js';

describe('planSequence', () => {
  const line = ['need', 'num-3', 'item-apples'];

  it('plays the clips when every one is recorded', () => {
    expect(planSequence(line, new Set(line), 'I need three apples!')).toEqual({ mode: 'clips', ids: line });
  });

  it('speaks the whole line when any clip is missing', () => {
    expect(planSequence(line, new Set(['need', 'num-3']), 'I need three apples!'))
      .toEqual({ mode: 'tts', text: 'I need three apples!' });
    expect(planSequence(line, new Set(), 'I need three apples!').mode).toBe('tts');
  });

  it('never invents speech for a line with no TTS text', () => {
    expect(planSequence(['box-says', 'sound-b'], new Set(['box-says']), null))
      .toEqual({ mode: 'clips', ids: ['box-says'] });
  });

  it('uses the computer voice for everything it can when asked to', () => {
    expect(planSequence(line, new Set(line), 'I need three apples!', true)).toEqual({ mode: 'tts', text: 'I need three apples!' });
    // A letter sound has no text to speak, so its recording still plays.
    expect(planSequence(['box-says', 'sound-b'], new Set(['box-says', 'sound-b']), null, true))
      .toEqual({ mode: 'clips', ids: ['box-says', 'sound-b'] });
  });

  it('plays the whole pre-generated line before falling back to the device voice', () => {
    const baked = 'lines/i-need-three-apples-12345678';
    expect(planSequence(line, new Set([baked]), 'I need three apples!', false, baked)).toEqual({ mode: 'clips', ids: [baked] });
    // No baked clip for this line: the device speaks it.
    expect(planSequence(line, new Set(), 'I need three apples!', false, baked)).toEqual({ mode: 'tts', text: 'I need three apples!' });
  });

  it('prefers hand-recorded clips over the generated line, unless told not to', () => {
    const baked = 'lines/x';
    const all = new Set([...line, baked]);
    expect(planSequence(line, all, 'I need three apples!', false, baked)).toEqual({ mode: 'clips', ids: line });
    expect(planSequence(line, all, 'I need three apples!', true, baked)).toEqual({ mode: 'clips', ids: [baked] });
  });

  it('speaks when there are no clips at all', () => {
    expect(planSequence([], new Set(), 'Hello')).toEqual({ mode: 'tts', text: 'Hello' });
  });
});

describe('ttsTimeoutMs', () => {
  it('allows longer for longer lines', () => {
    expect(ttsTimeoutMs('one')).toBeLessThan(ttsTimeoutMs('I need three apples!'));
    expect(ttsTimeoutMs('one')).toBeGreaterThan(1500);
  });
});

describe('clipTimeoutMs', () => {
  it('waits a little longer than the clip, or a safe default when its length is unknown', () => {
    expect(clipTimeoutMs(2)).toBe(3500);
    expect(clipTimeoutMs(NaN)).toBe(7500);
    expect(clipTimeoutMs(0)).toBe(7500);
    expect(clipTimeoutMs(Infinity)).toBe(7500);
  });
});
