import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { darken, paintTruckSvg } from './paint.js';

const truck = readFileSync(new URL('../../public/assets/art/truck.svg', import.meta.url), 'utf8');

describe('darken', () => {
  it('darkens each channel', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(darken('#3b82f6', 0)).toBe('#3b82f6');
    expect(darken('#102030', 1)).toBe('#000000');
  });
  it('leaves anything that is not a colour alone', () => {
    expect(darken('rainbow', 0.5)).toBe('rainbow');
  });
});

describe('paintTruckSvg', () => {
  it('still finds the colours the truck is drawn with', () => {
    // If truck.svg is redrawn with other greens, painting would silently do nothing.
    expect(truck).toContain('#4caf50');
    expect(truck).toContain('#43a047');
    expect(truck).toContain('#1b5e20');
  });

  it('repaints the body and sets the size', () => {
    const blue = paintTruckSvg(truck, '#3b82f6', 880, 480);
    expect(blue).toContain('width="880" height="480"');
    expect(blue).toContain('#3b82f6');
    expect(blue).not.toContain('#4caf50');
    expect(blue).not.toContain('#43a047');
    expect(blue).not.toContain('#1b5e20');
    // Wheels, robot and bed keep their own colours.
    expect(blue).toContain('#263238');
    expect(blue).toContain('#b9793f');
  });

  it('paints a rainbow with a gradient', () => {
    const rainbow = paintTruckSvg(truck, 'rainbow', 880, 480);
    expect(rainbow).toContain('<linearGradient id="paint"');
    expect(rainbow).toContain('url(#paint)');
    expect(rainbow).not.toContain('#4caf50');
  });

  it('leaves the truck green for a value it cannot use', () => {
    for (const value of ['', 'blue', null, undefined, '#12']) {
      expect(paintTruckSvg(truck, value, 880, 480)).toContain('#4caf50');
    }
  });
});
