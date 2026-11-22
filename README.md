# Sprout Bot 🤖🚜

A homemade learning game for a 4-year-old. Farm animals ask out loud for things, and a helper robot in a little truck fetches whatever he taps. Counting, letters, numbers, first sounds, shapes and left/right are all just different kinds of request.

- **Plays on:** Android Chrome (tablet is the main target, a phone works for testing) and PC. It's an installable offline web app (PWA).
- **Built with:** Vite, Phaser 3, plain JavaScript.
- **Controls:** touch, keyboard, or the USB button box in `hardware/`.

**Play it:** https://gmason822.github.io/sprout-bot/

On an Android phone or tablet, open that address in Chrome, then use the menu → "Add to Home screen" (or "Install app"). It then opens fullscreen in landscape and works with no connection.

## Status
Milestones 1 to 4 are built, plus a second batch of games: six animals ask for counting, letters, left/right, numbers, first sounds and shapes; a farm day ends at sunset with a reward; progress is saved on the device; and a hidden parent area holds the settings and a progress view. See `docs/ROADMAP.md`.

## Parent area
Hold a finger on the sun in the top-right for three seconds (a white ring closes in around your finger while it counts), or tap the sun five times quickly. Then tap the three numbers shown as words. From there you can set his name, the length of a farm day and the volume, see what he has and hasn't mastered, or reset everything.

## Publishing
Every push to `main` runs the tests, builds the game and publishes it to GitHub Pages (`.github/workflows/deploy.yml`). An installed copy updates itself the next time it is opened with a connection.

## Getting started
```bash
npm install
npm run dev          # local dev
npm run dev -- --host  # open on a phone or tablet on the same Wi-Fi
npm test
npm run build
```

## Where things are
- `CLAUDE.md`: project brief and rules (start here)
- `docs/DESIGN.md`: game design and data formats
- `docs/ROADMAP.md`: build milestones
- `docs/AUDIO.md`: voice lines to record
- `content/`: animals, skills, letters, rewards (edit these to add content)
- `hardware/`: button box firmware and wiring
