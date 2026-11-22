# Sprout Bot — project brief for Claude Code

Sprout Bot is a custom learning game for a 4-year-old. A helper robot drives a little farm truck. Farm animals ask out loud for things ("I need 3 apples!", "Bring me the box that says /b/!"), the child taps the right thing, and the robot fetches and delivers it. Every delivery makes the farm grow.

Read `docs/DESIGN.md` for the full game design and `docs/ROADMAP.md` for the build order. **Work one milestone at a time** and check in after each one.

## The player
- Age 4. **Cannot read.** Short attention span (3–5 minute sittings). Small, imprecise fingers.
- Loves robots, vehicles and animals.
- Today: counts past 20 but skips numbers; names most uppercase letters; knows some letter sounds; knows left from right but often mixes them up.
- Plays on **Android (Chrome)**: a Samsung phone for now, a tablet later. Sometimes with a **USB button box** (shows up as a keyboard).

## Non-negotiable design rules
1. **No reading required.** Every request is spoken (recorded voice, with TTS as a fallback). Every button is a picture.
2. **Never show the answer in a form he can match by shape.** Numbers are shown as numerals as well as spoken (in the request, in the running count, and whenever something is counted aloud), because a numeral still has to be counted out. A requested letter or side is spoken only, because showing it would turn the task into shape matching.
3. **Nothing to lose.** No game over, no lives, no timers. A wrong pick gets a gentle spoken correction and another try, and the right answer glows after 2 misses.
4. **Huge tap targets.** At least 120 px on a tablet, with lots of space between them. They may scale down on the phone, but never below about 72 px.
5. **No menus he can get lost in.** The child UI is the farm, a request, and the end of the day. Settings live behind a hidden parent gate.
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
  scenes/              Boot, Farm (hub), Request, Sunset, ParentGate, Settings
    boards/            CountBoard and PickBoard: the two ways of answering a request
    layout.js, ui.js   Shared positions, colours and small drawing helpers
  systems/
    input.js           Maps touch + keyboard → game actions (see below)
    audio.js           Plays recorded clips in sequence; falls back to speechSynthesis
    content.js         Loads and validates content/*.json
    mastery.js         Leitner-box tracking per content item
    day.js             Farm-day state: which animals wait, deliveries left
    save.js            Versioned localStorage save, wrapped in try/catch
  skills/              One pure generator per request type, plus index.js (registry)
content/               JSON data (animals, skills, letters, words, rewards) — edit these, not code, to add content
public/assets/         Art (Kenney CC0, OpenMoji) and audio
hardware/              Button box firmware (CircuitPython for Raspberry Pi Pico)
docs/                  Design, roadmap, audio recording list
```

## Input actions (single source of truth: `src/systems/input.js`)
| Action   | Touch                     | Keyboard / button box |
|----------|---------------------------|-----------------------|
| TAP      | Tap a thing on screen     | —                     |
| LEFT     | —                         | `ArrowLeft` (moves the highlight left)  |
| RIGHT    | —                         | `ArrowRight` (moves the highlight right) |
| GO       | Big green ▶ send button   | `Space` or `Enter` (taps the highlighted thing) |
| PICK_1–4 | —                         | `1` `2` `3` `4` (taps that choice directly) |

Scenes listen for **actions**, never raw keys or pointers. Input is **locked while the truck is moving or a voice line that must be heard is playing**, so mashing does nothing. Do not use a fixed time debounce.

## Content and data
- All learnable content lives in `content/*.json`. The formats are documented in `docs/DESIGN.md`. Adding a letter, an item, an animal or a reward must never need a code change.
- Adding a new **skill** is one generator module in `src/skills/`, one entry in `content/skills.json`, and an animal that owns it. It must not change the scenes.
- Validate content at boot. Log clear errors to the console, and skip bad items rather than crashing.

## Saving
- One localStorage key: `sproutbot.save.v1`. Include a `version` field and a migration hook.
- Always wrap storage access in try/catch, and fall back to in-memory state if it fails.

## Assets and credits
- Prefer **Kenney.nl** packs (CC0) for the world, robot, truck, UI and sound effects.
- Use **OpenMoji** for item and word pictures (CC BY-SA 4.0, so it needs a credit, listed in `CREDITS.md`).
- Every third-party asset gets a line in `CREDITS.md`.
- The current art (`public/assets/art/*.svg`) was drawn for this project and the sound effects are synthesized in `src/systems/sfx.js`. Swap in Kenney packs when wanted. Never block a milestone on art.

## Audio
- Recorded voice clips go in `public/assets/audio/voice/` using the names in `docs/AUDIO.md`.
- A request is a list of clips played in order ("I need" + "three" + "apples"). If every clip of a line is recorded, `audio.js` plays them; otherwise it speaks the whole line's `tts` text with speechSynthesis (slow rate, about 0.85).
- The game learns which clips exist at build time: `vite.config.js` lists the folder as the module `virtual:voice-clips`. Never probe the server for clips at runtime.
- **Letter sounds cannot use TTS.** They must be recorded before the letter-sound requests ship.

## Hosting
- The game is public at https://gmason822.github.io/sprout-bot/ (GitHub Pages). Every push to `main` tests, builds and publishes it.
- Keep `base: './'` in `vite.config.js`: the site is served from a sub-folder.
- The repository is public. Never commit the child's name, photos, or anything else personal; his name belongs in the saved settings on the device only.

## Code conventions
- Small modules, plain functions, and only as many classes as Phaser needs.
- Keep game logic (skill generators, mastery, day rules, validation) in pure functions that Vitest tests without Phaser.
- Comment the *why*, not the *what*.
- `npm run dev` / `npm run build` / `npm test` must always work.

## How to work with me
- Milestones 0 to 2 are built. `docs/ROADMAP.md` lists what is still open in Milestone 2 and what comes next.
- At the end of each milestone, explain how to test it on a PC and on the Samsung phone over the local network (`vite --host`).
- Ask before adding a dependency that isn't listed above.
