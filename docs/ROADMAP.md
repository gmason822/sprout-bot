# Sprout Bot — Roadmap

Each milestone ends with something playable. **Playtest with him after every milestone** and adjust before moving on.

## Milestone 0 — Redesign (done)
- Design, brief, audio list and content files rewritten around the helper-robot loop.

## Milestone 1 — Fun test
The only question this milestone answers: does he want to do it again?
- Vite + Phaser 3 project scaffold, `npm run dev` / `build` / `test`.
- One animal (the hen) and counting requests only, 1–5, hardcoded.
- Tap things into the truck while the voice counts, green ▶ sends it, too-few / too-many corrections, delivery celebration, then the next request.
- `input.js` (actions, locked during animations) and `audio.js` (clip sequence with a speechSynthesis fallback).
- Real truck, robot and animal art and a few sounds from the start (drawn and synthesized for this project rather than taken from Kenney).
- The "Milestone 1" clips in `docs/AUDIO.md` recorded if possible; TTS covers the rest.
- Landscape and fullscreen, working on the Samsung phone over `vite --host`.

**Done when:** after one demo he plays by himself and asks to play again.

## Milestone 2 — Request engine and three skills
Built, waiting for its playtest:
- `content.js` loads and validates `content/*.json` (pure, with Vitest tests).
- Skill registry and generators for `count`, `letters` and `leftright` (pure, tested).
- `mastery.js` (pure, tested), brought forward from Milestone 4 because the generators choose items by box. It lives in memory only until Milestone 3 saves it.
- Request scene handles both answer kinds (`count` and `pick`) from request objects only.
- Farm hub with two animals waiting; he picks who to help.

Still to do:
- Record the letter-name and letter-sound clips. Letter-sound requests stay switched off until `sound-<letter>.mp3` exists, because they have no TTS fallback.
- HTTPS static hosting and PWA install, so it runs offline from the home screen and the phone can reach it. Agree the host first.

## Milestone 3 — Farm day
- `day.js`: deliveries per day, which animals are offered, sunset.
- Deliveries stay visible on the farm during the day.
- Sunset scene with the next reward from `content/rewards.json`; paint and hats can be put on.
- `save.js` with tests; the farm, rewards and mastery survive a restart.

## Milestone 4 — Parent area
- Parent gate (corner hold, then the number words).
- Settings: child name, deliveries per day, volume, TTS-only mode, reset.
- Progress view showing mastery dots.

## Milestone 5 — Button box
- Build the Pico box (`hardware/`).
- Highlight + pick mapping for every request type, tested on PC and Android.

## Ideas for later
- More skills: first sounds, one more / one less, colors, shapes, big/small, adding with objects, simple words.
- More animals and places (orchard, pond, pumpkin patch).
- Free play on the farm between requests.
- Optional driving stretches where he steers the truck himself.
- His own drawings scanned in as farm decorations.
