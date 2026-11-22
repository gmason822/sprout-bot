# Sprout Bot 🤖🚜

A homemade learning game for a 4-year-old. Farm animals ask out loud for things, and a helper robot in a little truck fetches whatever he taps. Counting, letters and left/right are all just different kinds of request.

- **Plays on:** Android Chrome (tablet is the main target, a phone works for testing) and PC. It's an installable offline web app (PWA).
- **Built with:** Vite, Phaser 3, plain JavaScript.
- **Controls:** touch, keyboard, or the USB button box in `hardware/`.

## Status
Milestones 1 and 2 are built: three animals ask for counting, letters and left/right. Nothing is saved between visits yet, and it is not hosted yet. See `docs/ROADMAP.md`.

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
