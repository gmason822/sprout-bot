# Voice

Every line the game says is a pre-made audio file, generated ahead of time with a neural text-to-speech voice. The files ship with the game, so it sounds the same on every device and works offline.

## The generated voice
- **Engine:** [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (open weights, Apache 2.0), run on the PC. Nothing is sent to a cloud service.
- **Settings:** `content/voice.json` holds the voice (`af_heart`), the speed (0.8 of normal, for a 4-year-old), the pause between sentences and the MP3 quality.
- **How the slow pace is made:** the engine speaks at its normal pace and the recording is then slowed to 80% without changing its pitch. Asking the engine itself to speak slowly makes it add a stray "uh" before short lines ("a five"): measured on "Six.", 40 ms of it at normal pace and 130 ms at 0.8. Keep `engineSpeed` at 1.0.
- **Files:** one MP3 per line in `public/assets/audio/voice/lines/`, about 280 lines and 3.6 MB in total. Each is named after its words plus a short code, for example `i-need-three-apples-4fd0bbc0.mp3`. About 285 lines.
- **Which lines:** every skill lists everything it can say (`src/skills/`), and the fixed phrases are in `src/systems/phrases.js`. A test checks that nothing the game can say is missing from the list.

### Making the voice again
```bash
npm run voice
```
Run this after adding content (a new word, shape, counting item or game) or changing `content/voice.json`. Only lines that are new or whose settings changed are generated; lines the game no longer says are deleted. Commit the changed MP3s and `tools/voice/built.json` with the content change. A full run of every line takes about seven minutes.

### Fixing a line that sounds wrong
1. In the game, open the parent area and use **Voice check**: it lists every line and plays the one you tap.
2. Note the exact words of the line that sounds off.
3. Add it to `"say"` in `content/voice.json`, with what the engine should be told instead. For example, to change how a word is said or to slow a phrase with a comma:
   ```json
   "say": { "That's D.": "That's the letter D." }
   ```
   The words in the game do not change, only what is spoken.
4. Run `npm run voice` and listen again.

### One-time setup on a new PC
The model and its Python environment live outside the repository, in `~/.cache/sprout-bot-voice/` (or wherever `SPROUT_VOICE_HOME` points):
```bash
mkdir -p ~/.cache/sprout-bot-voice/model && cd ~/.cache/sprout-bot-voice
python3 -m venv venv && venv/bin/pip install kokoro-onnx lameenc
curl -L -o model/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -o model/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
That is about 340 MB. It is only needed to make the voice, not to build or play the game.

## Animal noises
Tapping an animal plays a real recording of it. The clips are in `public/assets/audio/animals/`, one per noise name (`moo.mp3`, `oink.mp3`...), and `src/systems/animalClips.js` lists them with their lengths.

To add or change one:
1. Find a recording with a licence that allows reuse (public domain, CC0, CC BY or CC BY-SA). Wikimedia Commons is the source used so far. Download it into a folder outside the repository.
2. Run `python tools/sounds/make.py <that folder> . --look` (with the voice tool's Python) to see a picture of its loudness over time and choose the seconds to keep.
3. Add a line to `tools/sounds/recipes.json`, run `make.py` again without `--look`, and name the noise with `"sound"` in `content/animals.json` or `content/rewards.json`.
4. Credit the recording in `CREDITS.md`.

Still without a recording, and so quiet: owl, goat, rooster, turkey, llama and chick. Wikimedia limits how fast files can be fetched by a script, which is why the first batch stopped at six. The rabbit's hop and the mouse's squeak are synthesized.

## How a line is chosen at play time
1. Hand-recorded clips for that line, if every one of them exists (see below).
2. Otherwise the generated file for the whole line.
3. Otherwise the device's own text-to-speech, so a line added without running `npm run voice` is still spoken.

The parent setting "Use the computer voice only" skips step 1.

**Letter sounds** ("the box that says /b/") have no generated voice: a speech engine cannot say a bare sound reliably. That game stays switched off until `sound-<letter>.mp3` is recorded by hand.

# Recording your own voice (optional)

Nothing below is needed. If you ever want a real voice for some lines, record them with these names and they take over from the generated voice for any line where every clip exists.

Record in a quiet room on a phone, and speak slowly and cheerfully. Export as `.mp3` (mono, 44.1 kHz is fine). Trim the silence at the start and end. Put files in `public/assets/audio/voice/`.

Recorded lines are built by playing clips one after another ("I need" + "three" + "apples"), so say each clip on its own with a natural ending.

Animal lines are more fun in a silly voice for each animal. One voice for everything is fine to start.

## Milestone 1 (record these first)
| File | Say |
|------|-----|
| `need.mp3` | "I need…" |
| `num-1.mp3` … `num-7.mp3` | "one" … "seven" (he can load up to 7 apples, and each one is counted) |
| `item-apple.mp3` | "apple" |
| `item-apples.mp3` | "apples" |
| `not-enough.mp3` | "Not enough!" |
| `too-many.mp3` | "Too many!" |
| `count-again.mp3` | "Count again!" |
| `thank-you.mp3` | "Thank you!" |
| `great-job.mp3` | "Great job!" |
| `you-did-it.mp3` | "You did it!" |
| `try-again.mp3` | "Try again!" |

## Counting (Milestone 2)
- `num-8.mp3` … `num-12.mp3`
- For each counting item, a singular and a plural: `item-carrot.mp3` / `item-carrots.mp3`, `item-egg.mp3` / `item-eggs.mp3`, `item-pumpkin.mp3` / `item-pumpkins.mp3`.

## Letters (Milestone 2)
- `letter-a.mp3` … `letter-z.mp3`: just the letter name ("bee").
- `sound-a.mp3` … `sound-z.mp3`: just the letter sound. Follow the `say` note for each letter in `content/letters.json`: short vowels, clipped stops with no "uh" (/b/, not "buh"), and held sounds for letters like M and S.
- `box-letter.mp3`: "Bring me the box with the letter…"
- `box-says.mp3`: "Bring me the box that says…"
- `thats.mp3`: "That's…" (the game plays the letter clip right after).

## Left and right (Milestone 2)
| File | Say |
|------|-----|
| `left.mp3` | "Left!" |
| `right.mp3` | "Right!" |
| `on-the-left.mp3` | "The one on the LEFT!" |
| `on-the-right.mp3` | "The one on the RIGHT!" |
| `that-was-left.mp3` | "That one is on the left." |
| `that-was-right.mp3` | "That one is on the right." |

## The newer games
All of these fall back to text-to-speech, so record them whenever you like.

| File | Say |
|------|-----|
| `box-little-letter.mp3` | "Bring me the box with the little letter…" |
| `in-the-middle.mp3` | "The one in the MIDDLE!" |
| `that-was-middle.mp3` | "That one is in the middle." |
| `box-number.mp3` | "Bring me the box with the number…" |
| `how-many.mp3` | "How many…" |
| `that-number.mp3` | "Bring me that number!" |
| `what-starts.mp3` | "What letter does that start with?" |
| `bring-the.mp3` | "Bring me the…" |
| `thats-a.mp3` | "That's a…" |

- Counting items added: `item-strawberry.mp3` / `item-strawberries.mp3`, `item-tomato.mp3` / `item-tomatoes.mp3`.
- Shapes: `shape-circle.mp3`, `shape-square.mp3`, `shape-triangle.mp3`, `shape-star.mp3`, `shape-heart.mp3`, `shape-rectangle.mp3`, `shape-oval.mp3`, `shape-diamond.mp3`.
- First-sound words: `word-<id>.mp3` for each letter's example in `content/letters.json` and each entry in `content/words.json` (for example `word-bear.mp3`).

## The five newer games
All generated; hand recordings would use these names.
| File | Say |
|------|-----|
| `bring-the.mp3`, `colour-<name>.mp3`, `one.mp3` | "Bring me the red one!" |
| `thats.mp3`, `colour-<name>.mp3` | "That's red." |
| `find-same.mp3` | "Find the same one!" |
| `different.mp3` | "That one is different." |
| `who-says.mp3` | "Who says that?" |
| `thats-a.mp3`, `animal-<id>.mp3` | "That's a cow." |
| `which-not-belong.mp3` | "Which one does not belong?" |
| `that-belongs.mp3` | "That one belongs with the others." |
| `what-next.mp3`, `what-missing.mp3` | "What comes next?", "What is missing?" |
| `look-pattern.mp3` | "Not that one. Look at the pattern." |

## Farm and day (Milestone 3)
| File | Say |
|------|-----|
| `who-helps.mp3` | "Who do you want to help?" |
| `good-morning.mp3` | "Good morning, farm!" |
| `sleepy.mp3` | "The robot is sleepy. Good night!" |
| `new-friend.mp3` | "Look! Something new on the farm!" |

## Praise (several, so it doesn't get repetitive)
`awesome.mp3`, `wow.mp3`, `yummy.mp3`, `so-helpful.mp3`, `nice-driving.mp3`

## Encouragement
`almost.mp3` ("Almost!"), `you-can-do-it.mp3` ("You can do it!"), `listen-again.mp3` ("Listen again!")

## Fun extra
Record his name, and have him record "Beep boop!" for the robot.
