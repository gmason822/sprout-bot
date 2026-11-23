# Sprout Bot — Roadmap

Each milestone ends with something playable. **Playtest with him after every milestone** and adjust before moving on.

## Milestone 0 — Redesign (done)
- Design, brief, audio list and content files rewritten around the helper-robot loop.

## Milestone 1 — Fun test
The only question this milestone answers: does he want to do it again?
- Vite + Phaser 3 project scaffold, `npm run dev` / `build` / `test`.
- One animal (the hen) and counting requests only, 1–5, hardcoded.
- Tap things into the truck while the voice counts, tapping the truck sends it, a wrong count goes back to the pile to be counted again, delivery celebration, then the next request.
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
- Animals screen with animals waiting (three at a time since the home-farm update); he picks who to help.

- Hosted on GitHub Pages at https://gmason822.github.io/sprout-bot/, published on every push to `main`.
- Installable and offline (vite-plugin-pwa): the whole game, including any recorded clips, is cached on the device.

Still to do:
- Record the letter-name and letter-sound clips. Letter-sound requests stay switched off until `sound-<letter>.mp3` exists, because they have no TTS fallback.
- Install it on the phone and playtest.

## Milestone 3 — Farm day
Built, waiting for its playtest:
- `day.js`: deliveries per day, which animals are offered, sunset, wearing paint and hats (pure, tested).
- A row at the top of the farm shows today's deliveries, with empty rings for the ones still to come.
- Sunset scene: the day is counted back, the next reward from `content/rewards.json` arrives, the robot sleeps, and the day ends at the home farm (a small reward goes there by itself; a big one is a present to tap).
- Rewards live on the farm: friends and decorations stand around and wiggle when tapped; tapping a hat or paint pot puts it on or takes it off.
- `save.js` with tests; the farm, rewards, mastery and the day so far survive a restart.

## Milestone 4 — Parent area
Built, waiting for its playtest:
- Parent gate: hold the top-right corner for 3 seconds (or tap it five times quickly), then tap three numbers written as words.
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
- A home farm on its own screen, reached by the house button on the animals screen. It starts as an empty field.
- One reward per finished day, given at sunset, and the day then ends at home.
- **Big rewards build the farm:** 17 buildings and features on set days (1, 3, 5, then every third day), from a tent to a big farmhouse. The home itself grows through four stages.
- **Every building is a toy:** tapping it does something (the barn's cow comes out, the tree drops apples, the garden grows a crop, the cloud rains a rainbow).
- **A big reward is built in front of him:** a present at sunset, then on the farm hammering, dust, and the building growing out of the ground, showing what it does, with a finger pointing at it until he tries it.
- **Buildings stand large in front of the fence,** and one hops every few seconds, so they read as toys rather than scenery.
- **Small rewards are cosmetics:** repeatable flowers, vegetables and bugs, plus one-off animal friends, truck paints and robot hats. Paints and hats arrive only after the garage and are chosen there.
- Small things wait on a shelf. He taps one to put it on the farm and drags it wherever he likes; dragging it back onto the shelf puts it away.
- Three animals are offered at a time, and the counting game no longer shows a running total on the truck.

## Voice
Built, waiting for a listen on the phone:
- Every line is generated ahead of time with a neural voice (Kokoro, "Heart", at 80% speed) and shipped as audio files, instead of using each device's built-in voice.
- `npm run voice` regenerates whatever changed; `content/voice.json` holds the settings and per-line pronunciation fixes.
- The parent area has a voice check that plays any line.
- The engine speaks at normal pace and the audio is then slowed, because asking it to speak slowly added a stray "uh" before numbers.
- Still open: lines that sound unnatural need to be found by ear and fixed one by one, and letter sounds still need hand recordings.

## Long-term
- **Button box.** Not needed while he plays by touch. The firmware is in `hardware/`, and the game already answers to its keys (arrows move a highlight, Space picks, 1 to 4 pick directly), so building the box later needs no game changes beyond testing.

## Ideas for later
- More skills: first sounds, one more / one less, colors, shapes, big/small, adding with objects, simple words.
- More animals and places (orchard, pond, pumpkin patch).
- Free play on the farm between requests.
- Optional driving stretches where he steers the truck himself.
- His own drawings scanned in as farm decorations.
