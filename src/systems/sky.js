// The sky tells him how far through the farm day he is: the sun crosses it as
// deliveries are made, the last request is asked at sunset, and the day ends at
// night. Pure functions; the drawing is in src/scenes/farmBackdrop.js.
//
// Time runs from 0 (morning) to 1 (sunset) during play, and on to 2 (night).

export const SUNSET = 1;
export const NIGHT = 2;

/**
 * The time of day for the request he is about to answer. It reaches sunset exactly
 * at the last request of the day, however long the parent has made the day.
 */
export function dayTime(delivered, deliveriesPerDay) {
  const steps = Math.max(1, deliveriesPerDay - 1);
  return Math.max(0, Math.min(SUNSET, delivered / steps));
}

// What the world looks like at a few moments; everything between is blended.
const KEYS = [
  { at: 0,    top: 0x6ebcf0, bottom: 0xcdeeff, sun: 0xffd94a, cloud: 0xffffff, hill: 0x9bd67a, grass: 0x7ec850, road: 0xd9b98a },
  { at: 0.5,  top: 0x6ebcf0, bottom: 0xcdeeff, sun: 0xffd94a, cloud: 0xffffff, hill: 0x9bd67a, grass: 0x7ec850, road: 0xd9b98a },
  { at: 0.75, top: 0x7aa9e6, bottom: 0xffe0b0, sun: 0xffc233, cloud: 0xfff1dc, hill: 0xa3cf70, grass: 0x84c24c, road: 0xdcb684 },
  { at: 1,    top: 0x5a5fb0, bottom: 0xffa35c, sun: 0xff7a2f, cloud: 0xffc2a8, hill: 0x9bb060, grass: 0x8fae4a, road: 0xd6a274 },
  { at: 2,    top: 0x0b1445, bottom: 0x2c3c82, sun: 0xff5a1f, cloud: 0x4a5a94, hill: 0x2f5a4e, grass: 0x2e6a48, road: 0x6f6a78 },
];
const COLOURS = ['top', 'bottom', 'sun', 'cloud', 'hill', 'grass', 'road'];

const mix = (a, b, k) => Math.round(a + (b - a) * k);

/** Blend two 0xRRGGBB colours: k = 0 gives `a`, k = 1 gives `b`. */
export function mixColour(a, b, k) {
  return (mix(a >> 16, b >> 16, k) << 16) | (mix((a >> 8) & 255, (b >> 8) & 255, k) << 8) | mix(a & 255, b & 255, k);
}

/**
 * Everything the backdrop needs at time `t`: its colours, where the sun is, and how
 * much of the stars and moon to show (0 until sunset, 1 at night).
 */
export function skyAt(t) {
  const time = Math.max(0, Math.min(NIGHT, t));
  const next = KEYS.findIndex((key) => key.at >= time);
  const b = KEYS[Math.max(1, next)];
  const a = KEYS[Math.max(1, next) - 1];
  const k = (time - a.at) / (b.at - a.at);
  const look = Object.fromEntries(COLOURS.map((name) => [name, mixColour(a[name], b[name], k)]));

  // The sun crosses below the row of today's deliveries (it would show through the
  // row's rings) and behind the animals, and comes down on the right late in the
  // day. After sunset it sinks behind the hills.
  const day = Math.min(SUNSET, time);
  const after = time - day;
  return {
    ...look,
    sunX: Math.round(240 + 910 * day),
    sunY: Math.round(150 + 195 * day ** 2.2 + 230 * after),
    night: after,
  };
}
