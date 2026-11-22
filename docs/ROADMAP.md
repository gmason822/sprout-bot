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

- Hosted on GitHub Pages at https://gmason822.github.io/sprout-bot/, published on every push to `main`.
- Installable and offline (vite-plugin-pwa): the whole game, including any recorded clips, is cached on the device.

Still to do:
- Record the letter-name and letter-sound clips. Letter-sound requests stay switched off until `sound-<letter>.mp3` exists, because they have no TTS fallback.
- Install it on the phone and playtest.

## Milestone 3 — Farm day
Built, waiting for its playtest:
- `day.js`: deliveries per day, which animals are offered, sunset, wearing paint and hats (pure, tested).
- A row at the top of the farm shows today's deliveries, with empty rings for the ones still to come.
- Sunset scene: the day is counted back, the next reward from `content/rewards.json` arrives, the robot sleeps, and a sun button starts a new day.
- Rewards live on the farm: friends and decorations stand around and wiggle when tapped; tapping a hat or paint pot puts it on or takes it off.
- `save.js` with tests; the farm, rewards, mastery and the day so far survive a restart.

## Milestone 4 — Parent area
Built, waiting for its playtest:
- Parent gate: hold the sun for 3 seconds (or tap it five times quickly), then tap three numbers written as words.
- Settings: child name, deliveries per day, volume, computer-voice-only mode, reset everything.
- Progress view: every counting number, letter name, letter sound and side as a coloured dot.

## More games (after Milestone 4)
Built, waiting for its playtest. Replay value was thin with three games, so there are now six, and the first three go further:
- **Owl, numbers:** "Bring me the box with the number 4" and "How many eggs? Bring me that number" (he counts a picture, then finds the numeral).
- **Rabbit, first sounds:** a picture and its word; he picks the letter it starts with. Works with the computer voice because the whole word is spoken.
- **Mouse, shapes:** "Bring me the triangle" from three shapes in one colour; harder shapes arrive later.
- **Cow** now also asks for lowercase letters, one letter at a time, once he knows that capital.
- **Pig** adds "the one in the middle", with three things on the table, once left and right are going well.
- **Hen** has strawberries and tomatoes to count as well.

## Home farm (free play)
Built, waiting for its playtest:
- A home farm on its own screen, reached by the house button on the animals screen. It starts as bare grass.
- Every delivery earns one small thing (a flower, a vegetable, a bug); every finished day earns a big one.
- Things wait on a shelf. He taps one to put it on the farm and drags it wherever he likes; dragging it back onto the shelf puts it away.
- Farm upgrades arrive as big rewards and become part of the farm itself: fence, barn, pond, apple tree, path, windmill, silo, rainbow.
- The paint pot and hat buttons on the shelf change what the truck and robot wear.
- After a sunset whose reward belongs on the farm, the new day starts at home.

## Long-term
- **Button box.** Not needed while he plays by touch. The firmware is in `hardware/`, and the game already answers to its keys (arrows move a highlight, Space picks, 1 to 4 pick directly), so building the box later needs no game changes beyond testing.

## Ideas for later
- More skills: first sounds, one more / one less, colors, shapes, big/small, adding with objects, simple words.
- More animals and places (orchard, pond, pumpkin patch).
- Free play on the farm between requests.
- Optional driving stretches where he steers the truck himself.
- His own drawings scanned in as farm decorations.
