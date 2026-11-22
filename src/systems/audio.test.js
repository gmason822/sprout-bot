import { describe, it, expect } from 'vitest';
import { planSequence, ttsTimeoutMs } from './audio.js';

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
