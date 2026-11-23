import { describe, it, expect } from 'vitest';
import { dayTime, skyAt, mixColour, SUNSET, NIGHT } from './sky.js';

describe('dayTime', () => {
  it('starts in the morning and reaches sunset at the last request of the day', () => {
    for (const perDay of [3, 5, 10]) {
      expect(dayTime(0, perDay)).toBe(0);
      expect(dayTime(perDay - 1, perDay)).toBe(SUNSET);
      // The day can be shortened part-way through; it never goes past sunset.
      expect(dayTime(perDay + 3, perDay)).toBe(SUNSET);
    }
  });

  it('moves on with every delivery', () => {
    const times = [0, 1, 2, 3, 4].map((n) => dayTime(n, 5));
    expect(times).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('copes with a one-delivery day', () => {
    expect(dayTime(0, 1)).toBe(0);
  });
});

describe('mixColour', () => {
  it('blends each channel', () => {
    expect(mixColour(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixColour(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixColour(0x102030, 0x304050, 0.5)).toBe(0x203040);
  });
});

describe('skyAt', () => {
  it('moves the sun left to right, and lower as the day ends', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map(skyAt);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].sunX).toBeGreaterThan(steps[i - 1].sunX);
      expect(steps[i].sunY).toBeGreaterThan(steps[i - 1].sunY);
    }
    // At sunset it is still above the hills; by night it has gone behind them.
    expect(skyAt(SUNSET).sunY).toBeLessThan(360);
    expect(skyAt(NIGHT).sunY).toBeGreaterThan(500);
  });

  it('keeps a blue sky for the first half of the day, then turns', () => {
    expect(skyAt(0.3).top).toBe(skyAt(0).top);
    expect(skyAt(SUNSET).bottom).not.toBe(skyAt(0).bottom);
  });

  it('shows stars only after sunset', () => {
    expect(skyAt(0.9).night).toBe(0);
    expect(skyAt(SUNSET).night).toBe(0);
    expect(skyAt(1.5).night).toBeCloseTo(0.5);
    expect(skyAt(NIGHT).night).toBe(1);
    expect(skyAt(7).night).toBe(1);
  });
});
