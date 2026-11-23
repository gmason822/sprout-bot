# Sprout Bot — project brief for Claude Code

Sprout Bot is a custom learning game for a 4-year-old. A helper robot drives a little farm truck. Farm animals ask out loud for things ("I need 3 apples!", "Bring me the box that says /b/!"), the child taps the right thing, and the robot fetches and delivers it. Each finished farm day earns one reward for his home farm.

Read `docs/DESIGN.md` for the full game design and `docs/ROADMAP.md` for the build order. **Work one milestone at a time** and check in after each one.

## The player
- Age 4. **Cannot read.** Short attention span (3–5 minute sittings). Small, imprecise fingers.
- Loves robots, vehicles and animals.
- Today: counts past 20 but skips numbers; names most uppercase letters; knows some letter sounds; knows left from right but often mixes them up.
- Plays on **Android (Chrome)** by touch: a Samsung phone for now, a tablet later. A **USB button box** (shows up as a keyboard) is a long-term idea, not a current goal; keep keyboard actions working but do not prioritise them.

## Non-negotiable design rules
1. **No reading required.** Every request is spoken (recorded voice, with TTS as a fallback). Every button is a picture.
2. **Never show the answer in a form he can match by shape.** The number an animal asks for is shown as a numeral as well as spoken, and a numeral pops up whenever something is counted aloud, because a numeral still has to be counted out. There is deliberately no running total on the truck: he could match it to the asked-for numeral and never count. A requested letter or side is spoken only, because showing it would turn the task into shape matching. The one deliberate exception is the matching game ("Find the same one"), where matching by eye is the skill being practised.
3. **Nothing to lose.** No game over, no lives, no timers. A wrong pick gets a gentle spoken correction and another try, and the right answer glows after 2 misses.
4. **Huge tap targets.** At least 120 px on a tablet, with lots of space between them. They may scale down on the phone, but never below about 72 px.
5. **No menus he can get lost in.** The child UI is the title screen, the animals screen, a request, the end of the day, and the home farm. Each has at most one picture button leading elsewhere. The home farm is one wide place made of pages: its two arrows and its house button move along it, never out of it, and the house button always leads back to the middle. Settings live behind a hidden parent gate.
6. **Nothing is gated.** Every subject has its own difficulty. Struggling with one never blocks another.
7. **One loop for everything.** New learning is a new kind of request, never a new screen or mode.
8. **Celebrate a lot.** Every delivery gets a cheer and a happy robot. Every farm day ends on a high.
9. **Left and right are always consistent.** LEFT is always blue with the same sound and word; RIGHT is always orange. Screen-left is the child's left.

## Tech stack
- **Vite + Phaser 3 + plain JavaScript (ES modules).** No TypeScript unless asked.
- **vite-plugin-pwa** for an installable, offline PWA. Landscape orientation, fullscreen.
- **Vitest** for unit tests of pure logic (skill generators, content validation, mastery, save/load).
- No backend. Everything is saved locally.

## Project layout (target)
```
src/
  main.js              Phaser game config, scene registration
  scenes/              Boot (loading, then the title screen), Farm (the animals screen), Request, Sunset, Home (the home farm)
    boards/            CountBoard and PickBoard: the two ways of answering a request
    homeUpgrades.js    The home farm's backdrop and each earnable building, with its tap toy
    layout.js, ui.js   Shared positions, colours and small drawing helpers
  systems/
    input.js           Maps touch + keyboard → game actions (see below)
    audio.js           Plays the generated voice; falls back to speechSynthesis
    version.js         The build's version label (commit count and date, filled in by vite.config.js)
    lines.js           Every line the game can say, and the file name for each
    phrases.js         The fixed phrases (praise, greetings, sunset)
    content.js         Loads and validates content/*.json
    mastery.js         Leitner-box tracking per content item
    day.js             Farm-day rules: which animals wait, when the day ends, rewards
    sky.js             The time of day: where the sun is and what colour the world is
    home.js            Home-farm rules: earning, the gift box, placing, wearing, building stages
    farmPages.js       The home farm's pages: their order, which are open, what belongs where
    dayTravel.js       The parent's day control: jump to any day, and put his real farm back
    tryGame.js         The parent's "try a game": one chosen game, with nothing recorded
    paint.js           Recolours the truck SVG for paint rewards
    save.js            Versioned localStorage save, wrapped in try/catch
  skills/              One pure generator per request type, plus index.js (registry) and tiers.js (choosing what to ask next)
  parent/              The hidden parent area: gate, settings panel, progress view (plain HTML)
content/               JSON data (animals, skills, letters, words, colours, groups, rewards) — edit these, not code, to add content
public/assets/         Art (Kenney CC0, OpenMoji) and audio
tools/voice/           Generates the voice files (`npm run voice`)
tools/sounds/          Cuts the animal noises out of their source recordings
hardware/              Button box firmware (CircuitPython for Raspberry Pi Pico)
docs/                  Design, roadmap, audio recording list
```

## Input actions (single source of truth: `src/systems/input.js`)
| Action   | Touch                     | Keyboard / button box |
|----------|---------------------------|-----------------------|
| TAP      | Tap a thing on screen     | —                     |
| LEFT     | —                         | `ArrowLeft` (moves the highlight left)  |
| RIGHT    | —                         | `ArrowRight` (moves the highlight right) |
| GO       | The logo button; the truck in a counting request | `Space` or `Enter` (taps the highlighted thing) |
| PICK_1–4 | —                         | `1` `2` `3` `4` (taps that choice directly) |

Scenes listen for **actions**, never raw keys or pointers. The one exception is the parent gate (`src/parent/gate.js`), which reads raw pointer events because it is not part of the child's game. While the parent area is open, `setInputSuspended(true)` silences every action. Input is **locked while the truck is moving or a voice line that must be heard is playing**, so mashing does nothing. Do not use a fixed time debounce.

## Content and data
- All learnable content lives in `content/*.json`. The formats are documented in `docs/DESIGN.md`. Adding a letter, an item, an animal or a reward must never need a code change.
- Adding a farm **building** (a big reward) is one builder in `src/scenes/homeUpgrades.js`, which draws it through `add`/`put` and returns what happens when it is tapped, one line in that file's `PLACE` table saying where it stands on its page and how big, plus one entry in `content/rewards.json` with its `page` (and `replaces`, if it is the next stage of another building). Every building must do something when tapped, must be large, and must leave the front right of its page clear for the truck and the ends of the road clear for the arrows. A small reward is JSON only, and its `page` says where it belongs.
- Adding a new **skill** is one generator module in `src/skills/`, one entry in `content/skills.json` (with its `icon`), and its id added to the `skills` of the animal whose family it fits in `content/animals.json`. It must not change the scenes. Only a new kind of game needs a new animal.
- Validate content at boot. Log clear errors to the console, and skip bad items rather than crashing.

## Saving
- One localStorage key: `sproutbot.save.v1`. Include a `version` field and a migration hook.
- Always wrap storage access in try/catch, and fall back to in-memory state if it fails.
- Scenes share one `state` object from the registry and call `store.save(state)` after anything worth keeping. `migrate()` in `save.js` repairs a damaged save one field at a time.

## Assets and credits
- Prefer **Kenney.nl** packs (CC0) for the world, robot, truck, UI and sound effects.
- Use **OpenMoji** for item and word pictures (CC BY-SA 4.0, so it needs a credit, listed in `CREDITS.md`).
- Every third-party asset gets a line in `CREDITS.md`.
- The logo (`public/assets/art/logo.svg`) is the game's one "go" button and the source of the app icon (`public/icon.svg`, `icon-192.png`, `icon-512.png`). There is no green play button any more.
- The current art (`public/assets/art/*.svg`) was drawn for this project and the sound effects are synthesized in `src/systems/sfx.js`. Swap in Kenney packs when wanted. Never block a milestone on art.

## Audio
- **The voice is generated ahead of time.** Every line the game can say is an MP3 in `public/assets/audio/voice/lines/`, made with the Kokoro text-to-speech model by `npm run voice`. Settings and per-line fixes are in `content/voice.json`. See `docs/AUDIO.md`.
- **After adding or changing anything that is spoken** (a word, an item, a shape, a phrase, a new game), run `npm run voice` and commit the new MP3s with it. Otherwise that line falls back to the device's own voice.
- Every spoken line must be discoverable: a skill exports a `...Lines` function listing all it can say, and fixed phrases live in `src/systems/phrases.js`. `src/systems/lines.test.js` fails if a game can say something that is not listed.
- At play time `audio.js` uses, in order: hand-recorded clips for the line if all exist, the generated line, then speechSynthesis (slow rate, about 0.85).
- The game learns which clips exist at build time: `vite.config.js` lists the folder as the module `virtual:voice-clips`. Never probe the server for clips at runtime.
- **Letter sounds cannot be generated or spoken by TTS.** They must be recorded before the letter-sound requests ship.
- Sound effects are synthesized in `src/systems/sfx.js`. Animal noises are the exception: they are real recordings in `public/assets/audio/animals/`, cut from free-licence sources by `tools/sounds/make.py` (recipes in `tools/sounds/recipes.json`) and credited one by one in `CREDITS.md`. Content names a noise with `"sound"`; the names it may use are `SOUND_NAMES` in `sfx.js`.

## Hosting
- The game is public at https://gmason822.github.io/sprout-bot/ (GitHub Pages). Every push to `main` tests, builds and publishes it.
- Keep `base: './'` in `vite.config.js`: the site is served from a sub-folder.
- The repository is public. Never commit the child's name, photos, or anything else personal; his name belongs in the saved settings on the device only.

## Code conventions
- Small modules, plain functions, and only as many classes as Phaser needs.
- Keep game logic (skill generators, mastery, day rules, validation) in pure functions that Vitest tests without Phaser.
- Comment the *why*, not the *what*.
- **The home farm is wider than the screen.** Things on the farm are drawn in the wide world, at `pageX(page) + x`; the shelf, the arrows and the buttons are fixed to the screen with `setScrollFactor(0)`. Saved places are measured within the page.
- **A Phaser scene object is reused every time the scene starts.** Anything stored on `this` survives from the last visit and may point at destroyed objects. Set every field a scene uses in `create()`, and never write `this.x ??= ...`.
- `npm run dev` / `npm run build` / `npm test` must always work.

## How to work with me
- Milestones 0 to 4 are built. `docs/ROADMAP.md` lists what is still open in Milestone 2 and what comes next.
- At the end of each milestone, explain how to test it on a PC and on the Samsung phone over the local network (`vite --host`).
- Ask before adding a dependency that isn't listed above.
