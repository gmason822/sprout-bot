// Repaints the truck. The truck is one SVG; a paint reward swaps its body colours
// before the picture is made, so every paint is just a colour in rewards.json.

// The colours the truck is drawn with in public/assets/art/truck.svg.
const CAB = '#4caf50';
const HOOD = '#43a047';
const OUTLINE = '#1b5e20';

const RAINBOW = ['#ef4444', '#f59e0b', '#fde047', '#22c55e', '#3b82f6', '#a855f7'];

/** Darken a #rrggbb colour by `amount` (0 to 1). */
export function darken(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const part = (shift) => Math.round(((n >> shift) & 255) * (1 - amount)).toString(16).padStart(2, '0');
  return `#${part(16)}${part(8)}${part(0)}`;
}

/**
 * Return the truck SVG painted with `value`: a #rrggbb colour, or "rainbow".
 * Width and height are set so the browser draws it at that many pixels.
 * An unusable value leaves the truck its normal green.
 */
export function paintTruckSvg(svg, value, width, height) {
  let out = svg.replace('<svg ', `<svg width="${width}" height="${height}" `);
  if (value === 'rainbow') {
    const stops = RAINBOW.map((c, i) => `<stop offset="${Math.round((i / (RAINBOW.length - 1)) * 100)}%" stop-color="${c}"/>`).join('');
    const defs = `<defs><linearGradient id="paint" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>`;
    out = out.replace(/(<svg [^>]*>)/, `$1${defs}`);
    return out.replaceAll(CAB, 'url(#paint)').replaceAll(HOOD, 'url(#paint)').replaceAll(OUTLINE, '#4c1d95');
  }
  if (!/^#[0-9a-f]{6}$/i.test(value ?? '')) return out;
  return out.replaceAll(CAB, value).replaceAll(HOOD, darken(value, 0.12)).replaceAll(OUTLINE, darken(value, 0.55));
}
