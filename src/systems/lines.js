// Every line the game can say, and the name of the audio file for each one.
// The voice generator (tools/voice/) makes one file per line; audio.js looks them up.

import { skillLines } from '../skills/index.js';
import { FIXED_LINES } from './phrases.js';

/** FNV-1a, as 8 hex digits. Small, stable, and the same in every JavaScript engine. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * The file name (without .mp3) for a spoken line. The readable part is for people
 * browsing the folder; the hash keeps two different lines from ever sharing a file.
 */
export function lineKey(text) {
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '');
  return `${slug || 'line'}-${hash(text)}`;
}

/** The clip id audio.js uses for a baked line. */
export function lineClipId(text) {
  return `lines/${lineKey(text)}`;
}

/** Every line the game can say with this content, sorted, each one once. */
export function allLines(content) {
  return [...new Set([...FIXED_LINES, ...skillLines(content)])].sort((a, b) => a.localeCompare(b));
}
