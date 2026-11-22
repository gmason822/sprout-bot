# Sprout Bot — Game Design

## Core idea
A helper robot drives a little farm truck. Farm animals ask out loud for things. The child taps the right thing, the robot fetches it and delivers it, and the farm grows. Every subject (counting, letters, left/right, and whatever comes later) is just a different kind of request inside this one loop.

Why this loop: he has to **understand the request** to succeed, the learning is the game rather than a side room, and new learning is added as data plus one small generator.

## The loop
1. **Farm (hub).** Two animals hop and wait, each with a thought bubble showing the kind of thing it asks for. He taps one. Each animal owns one subject.
2. **Request.** The animal says what it wants. The things he can pick appear. Tapping the animal repeats the request, and it repeats by itself after about 8 seconds of no taps.
3. **Fetch.** He taps; the truck drives there on its own and loads it.
   - Right: the truck delivers, the animal cheers, and what he delivered stays on the farm for the day.
   - Wrong: the animal says what that was and what it wants ("That's D. I want /b/!"), the thing goes back, and he tries again. After 2 misses the right answer glows.
4. **Back to the farm** with two animals waiting again, until the day's deliveries are done.
5. **Sunset.** The sky turns orange, today's deliveries are counted back one by one, one new farm thing arrives (see Rewards), and the robot goes to sleep. A big sun button starts a new day whenever he wants one; nothing pushes him to.

A farm day is `deliveriesPerDay` deliveries, set by the parent (default 5, range 3–10).

## Screens (child-facing)
- **Animals**: two animals waiting, the row of today's deliveries, and a house button to the home farm.
- **Request**: animal on one side, the things to pick in the middle, the truck at the bottom.
- **Sunset**: end-of-day celebration and reward.
- **Home farm**: free play. Everything he has earned ends up here, and a green button leads back to the animals.

Hidden **Parent Gate**: hold the sun in the top-right for 3 seconds, or tap it five times quickly, then tap three numbers that are written out as words ("seven, two, five") on a keypad. A white ring closes in around the finger from the second second of a hold, so a parent can see it counting. The hold zone is measured from the game picture rather than the screen, because a wide phone shows the picture with bars at the sides. The numbers change every time. One wrong tap, or 20 seconds of nothing, closes it and the game carries on.

The **parent area** is plain HTML over the paused game, because a parent needs to read and type:
- **Settings:** child name, deliveries per day (3 to 10), volume, computer-voice-only mode.
- **Progress:** every item of every skill as a dot coloured by its box, hollow if he has not met it yet, with how often it was asked and how often he was right first time.
- **Reset everything**, behind a second confirmation.

Changing a setting saves it and restarts the game at the play button, so nothing on screen is left out of step with the new values. Closing without changes resumes exactly where he was.

## Requests

### Two ways to answer
Every skill produces a request that uses one of two answer kinds. The Request scene only knows these two, which is what keeps new skills from touching the loop.

- **`pick`**: 2–4 things on screen, one is right. One tap answers.
- **`count`**: a pile of identical things. Each tap loads one into the truck while the voice counts it ("one… two… three"). Tapping one in the truck puts it back. The green ▶ button sends the truck.
  - Too few: the animal counts what arrived, "One, two. I need three. One more!", and he keeps loading.
  - Too many: "Too many! Take one out."
  - After 2 misses the send button glows exactly when the truck holds the right number.
  - **Numerals are always shown with the spoken number**: the asked-for number in the animal's speech bubble, a running total on the truck, and a numeral that pops up each time the animal counts one aloud. He can compare the truck's numeral with the bubble's.

What is shown versus only spoken: a numeral is shown, because he still has to count it out. A requested letter or side is spoken only, because showing it would let him match shapes without listening.

### Request object (what a generator returns)
```js
{
  skill: "count",
  itemId: "count:3",                 // mastery key
  say: ["need", "num-3", "item-apples"],   // voice clips, played in order
  tts: "I need three apples!",       // spoken if any clip is missing
  bubble: { art: "apple", numeral: 3 },    // what the animal's speech bubble shows (see below)
  answer: { kind: "count", item: "apple", target: 3, available: 7 }
}
```
```js
{
  skill: "letters",
  itemId: "letter-sound:B",
  say: ["box-says", "sound-b"],
  tts: null,                         // letter sounds must be recorded, never TTS
  bubble: { art: "crate" },          // the kind of thing only, never the letter
  answer: { kind: "pick", correct: "B",
            choices: [
              { id: "B", art: "crate", label: "B", wrong: { say: ["thats", "letter-b"], tts: "That's B." } },
              { id: "M", art: "crate", label: "M", wrong: { say: ["thats", "letter-m"], tts: "That's M." } }
            ] }
}
```
- Each choice carries its own `wrong` line. A wrong `pick` is corrected with that line, the thing is taken back, and the request is said again.
- A choice may have a `side` (`left` or `right`). Its correction and its 2-miss glow then use that side's colour and sound.
- An optional `cue` (`left` or `right`) plays that side's sound with the request.
- A request with `tts: null` is only offered when every one of its clips has been recorded.
- `bubble` is one of: `{ art }` (a picture), `{ art, numeral }` (a picture and a number), `{ art, count }` (that many pictures, to be counted) or `{ emoji }`. It must never show the answer.
- A choice may have a `tint`, a colour laid over its picture (shapes).

In a `pick` request the truck fetches whatever he taps and takes it to the animal, so a wrong pick is still a delivery, just one that gets sent back.

### The games
| Skill | Animal | Request | Answer kind | How it grows |
|---|---|---|---|---|
| `count` | Hen | "I need 3 apples!" | `count` | 1–5, then 1–10 |
| `letters` | Cow | "Bring me the box with the letter B!", then the little letter b, then "…the box that says /b/!" | `pick` from lettered crates | Capitals first, starting with the letters of his name. A letter's lowercase and sound come in once its capital is solid. |
| `leftright` | Pig | "The one on the LEFT!" | `pick` between identical things | Left and right, then "the one in the middle" with three things |
| `numbers` | Owl | "Bring me the box with the number 4!" and "How many eggs? Bring me that number!" | `pick` from numbered crates | 1–5 for each kind of question, then up to 10 one number at a time |
| `firstsound` | Rabbit | A picture and its word: "Bear. What letter does bear start with?" | `pick` from lettered crates | Six letters at first, then the rest one at a time |
| `shapes` | Mouse | "Bring me the triangle!" | `pick` from three shapes | Circle, square, triangle, star, heart; then rectangle, oval, diamond |

Notes:
- **Counting** shows 2 more things than the biggest number in the tier, so over-counting is possible.
- **Letters** never offers two letters with the same sound in a sound request (C and K). While a letter is new (box 1 or 2) its wrong choices look nothing like it (B with M, not B with D); once it is solid, lookalikes are allowed. Letter names use 3 crates, sounds use 2.
- **Left/right**: the things are identical and plain on the first try, so the word is the only clue. The blue/orange colors appear on the correction, on the 2-miss glow, and on the button box.
- **Numbers**: when he is asked to find a numeral, the bubble shows only a crate. When he is asked how many, the bubble shows the things to count, in rows of five. Wrong choices are always numbers he is already working with.
- **First sounds** speaks the whole word, so it needs no letter-sound recordings. Words come from each letter's `example` and from `words.json`. A word marked `firstSound: false` is left out (fox for X, tree with its "tr").
- **Shapes** in one request share one random colour, so colour is never the clue. The bubble shows a question mark, because any shape there would look like the answer.

### Later skills (same loop, same two answer kinds)
One more / one less, colors, big/small, adding with objects, simple words. Each needs a generator, an entry in `skills.json`, voice clips and an animal.

## Which animals are offered
After each delivery the game picks two different animals:
- one owns the skill he has practised least over his last 20 deliveries, so nothing is avoided forever;
- the other is random.

With only three animals this simply rotates who sits out.

## Mastery (`src/systems/mastery.js`)
- Each item has a record `{ box: 1–5, seen, correct, lastSeen }`. Items are things like `count:3`, `letter-name:B`, `letter-sound:B`, `side:left`.
- **Only the first try counts.** Right on the first try moves the item up one box. Anything else moves it down one box (never below 1).
- When a skill picks its next item, lower boxes come up more often (weights 5, 4, 3, 2, 1).
- A new item joins a skill only when at least two thirds of that skill's active items are in box 3 or higher.
- Each skill's difficulty is separate. Nothing is ever locked because of mastery.
- The parent progress view shows each item's box as a colored dot.
- Left/right has only two answers, so half of all guesses are right. Read its dots as a trend, not a score.

## Rewards and the home farm
The home farm starts as bare grass with the truck parked on it. Everything else is earned by helping the animals, so the farm grows as he plays.

**Earning**
- **After every delivery:** one small thing, picked at random from a pool (flowers, vegetables, bugs, small trees). Repeats are fine. It pops up, then flies off toward the house button.
- **At every sunset:** the next big reward, in a fixed order. It is one of:
  - a **friend** or **decoration**, which he places on the farm;
  - an **upgrade**, which becomes part of the farm itself (fence, barn, pond, apple tree, path, windmill, silo, rainbow);
  - a **hat** or a **paint**, which goes straight on the robot or truck.
- During the day, each delivery also fills the next ring in the row at the top of the animals screen, so he can see how much of the day is left.
- No stars, no counters, no shop.

**On the home farm**
- Things he has earned but not placed wait on a shelf along the bottom, six at a time, oldest first.
- Tapping one makes it hop onto the farm at a free spot. He can then drag it anywhere. Dragging it back down onto the shelf puts it away.
- Tapping a placed thing or the truck makes it wiggle.
- The paint pot and hat buttons try on the next paint or hat he owns, then none.
- Things lower on the screen are drawn in front, so the farm has depth.
- A house button with a bouncing gift on the animals screen tells him something is waiting. After a sunset whose reward belongs on the farm, the new day starts at home.
- The farm holds up to 120 placed and waiting things. Past that, the oldest small thing makes room; friends and decorations are never dropped.

There is no learning on the home farm on purpose. It is where the rewards for learning are enjoyed, and the only way to get more is to go back to the animals.

## Content formats

### `content/animals.json`
```json
{ "id": "hen", "name": "Hen", "skill": "count", "emoji": "🐔", "icon": "apple" }
```
`id` is also the name of its picture. `icon` is what its thought bubble shows on the farm: a picture name, or an emoji.

### `content/skills.json`
```json
{
  "id": "count",
  "answer": "count",
  "tiers": [
    { "id": "count-1-5",  "min": 1, "max": 5 },
    { "id": "count-1-10", "min": 1, "max": 10, "unlockAfter": "count-1-5" }
  ],
  "items": ["apple", "carrot", "egg", "pumpkin"]
}
```
- Each tier is one group in the parent's progress view, labelled by its `title`. Tiers with the same title are merged.
- A tier holds one kind of item: numbers (`min`, `max`), `sides`, `shapes`, or letters (when the skill has `"source": "letters.json"`).
- `start`: how many of the tier's items are in play from the first day. The rest arrive one at a time.
- `unlockAfter`: the tier opens when two thirds of the items in the earlier tier are in box 3 or higher.
- `perItemAfter` (letters): each item opens separately, once the same letter in the earlier tier is in box 3 or higher. This is how a letter's sound follows its name.
- `startWith: "childName"` (letters): the first active letters are the ones in his name, or `fallbackStart` if no name is set.

### `content/letters.json`
```json
{ "id": "C", "sound": "k", "say": "short and clipped, no 'uh'", "example": "cat", "emoji": "🐱", "sameSoundAs": ["K"], "looksLike": ["O", "G"] }
```
- `looksLike` lists lookalikes, kept out of the choices while the letter is new.
- `sound` and `say` are notes for whoever records the clip. They are never sent to TTS.
- `sameSoundAs` stops both letters appearing in one sound request.
- `firstSound: false` marks a letter whose example word does not start with its sound (X in "fox"), so a later first-sound skill skips it.

### `content/rewards.json`
```json
"small":   [{ "id": "small-tulip", "name": "Tulip", "emoji": "🌷" }],
"rewards": [{ "id": "friend-duck", "type": "friend", "name": "Duck", "emoji": "🦆" },
            { "id": "upgrade-barn", "type": "upgrade", "name": "Barn", "emoji": "🏠", "value": "barn" }]
```
- `small` is the pool for the after-delivery reward. Ids must start with `small-`.
- `rewards` are the sunset rewards, in the order they arrive. Types: `friend`, `decoration`, `hat`, `paint`, `upgrade`.
- Everything except paint is drawn from its `emoji`, using the device's own emoji font, so a new reward needs no art.
- `paint` needs a `value`: a `#rrggbb` color or `rainbow`. The truck's SVG is recoloured with it.
- `upgrade` needs a `value` naming a drawing in `src/scenes/homeUpgrades.js`. Its `emoji` is only what the sunset shows; on the farm it is drawn properly.

### `content/words.json`
```json
{ "id": "bus", "text": "BUS", "emoji": "🚌", "level": 1 }
```
Picture words for the first-sounds game, which uses each word's first letter. `firstSound: false` leaves a word out of that game. `level` and `text` are for a later word-reading game, which will also need a `decodable` flag, because words like COW, CAR and FISH cannot be sounded out letter by letter.

### Validation at boot
- Every animal points at a skill that exists and has a generator, and has a picture.
- Every thing a skill names in `items` has a picture in `public/assets/art/`.
- Every skill has a known `answer` kind, at least one tier, and `unlockAfter` values that exist.
- Letter ids are unique, and `sameSoundAs` points at real letters.
- Bad entries are logged and skipped. If a skill has no usable content its animal does not appear.

## Save (`sproutbot.save.v1`)
```js
{
  version: 1,
  settings: { childName: "", deliveriesPerDay: 5, volume: 0.8, ttsOnly: false },
  mastery: { "count:3": { box: 2, seen: 4, correct: 3, lastSeen: 0 } },
  farm: {
    rewards: ["friend-duck"],                      // big rewards he owns
    paint: null, hat: null,                        // what the truck and robot wear
    box: ["small-tulip", "small-tulip"],           // waiting on the shelf, oldest first
    placed: [{ item: "friend-duck", x: 470, y: 500 }]   // standing on the home farm
  },
  days: 0,
  today: [{ art: "apple", numeral: 3 }, { art: "crate", label: "B" }],   // today's deliveries so far
  skillLog: [],         // recent deliveries per skill, for choosing which animals to offer
  lastItem: {}          // last item asked per skill, so it is not asked twice running
}
```

## Screen sizes
- Design for landscape Android Chrome. Tablet is the main target; a Samsung phone is the test device until there is a tablet.
- Tap targets are at least 120 px on a tablet and scale with screen height on a phone, never below about 72 px.
- `pick` requests show at most 4 choices. `count` requests show at most 12 things.

## Audio and feel
- Animals speak in silly recorded voices. The robot answers with a "beep-boop".
- Background music is a soft loop, low by default, and parents can mute it.
- Every tap makes a sound. The truck has an engine putter while it drives.
- LEFT always plays the same low "boop" and RIGHT the same high "beep".
