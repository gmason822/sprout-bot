# Sprout Bot — Game Design

## Core idea
A helper robot drives a little farm truck. Farm animals ask out loud for things. The child taps the right thing, the robot fetches it and delivers it, and the farm grows. Every subject (counting, letters, left/right, and whatever comes later) is just a different kind of request inside this one loop.

Why this loop: he has to **understand the request** to succeed, the learning is the game rather than a side room, and new learning is added as data plus one small generator.

## The loop
1. **Animals.** Three animals hop and wait, each with a thought bubble showing the kind of thing it asks for. He taps one. Each animal owns one subject.
2. **Request.** The animal says what it wants. The things he can pick appear. Tapping the animal repeats the request, and it repeats by itself after about 8 seconds of no taps.
3. **Fetch.** He taps; the truck drives there on its own and loads it.
   - Right: the truck delivers, the animal cheers, and what he delivered stays on the farm for the day.
   - Wrong: the animal says what that was and what it wants ("That's D. I want /b/!"), the thing goes back, and he tries again. After 2 misses the right answer glows.
4. **Back to the animals** with three waiting again, until the day's deliveries are done.
5. **Sunset.** The sky is already orange from the last request. Today's deliveries are counted back one by one, night falls, the robot goes to sleep, and then the day's one reward arrives. A small thing is shown for a moment and he is taken straight to the home farm, where it is waiting on the shelf. A big one is a wrapped present that waits: tapping it takes him to the farm to watch the building go up.

A farm day is `deliveriesPerDay` deliveries, set by the parent (default 5, range 3–10).

## Screens (child-facing)
- **Title**: the name, the logo as one big start button, and a small version label for parents. The game waits here until the logo is tapped.
- **Animals**: three animals waiting, the row of today's deliveries, and a house button to the home farm.
- **Request**: animal on one side, the things to pick in the middle, the truck at the bottom.
- **Sunset**: end-of-day celebration and reward.
- **Home farm**: free play. Everything he has earned ends up here, and the logo button leads back to the animals.

Hidden **Parent Gate**: hold the top-right corner of the picture for 3 seconds, or tap it five times quickly (the sun used to sit there; it now moves through the day), then tap three numbers that are written out as words ("seven, two, five") on a keypad. A white ring closes in around the finger from the second second of a hold, so a parent can see it counting. The hold zone is measured from the game picture rather than the screen, because a wide phone shows the picture with bars at the sides. The numbers change every time. One wrong tap, or 20 seconds of nothing, closes it and the game carries on.

The **parent area** is plain HTML over the paused game, because a parent needs to read and type:
- **Settings:** child name, deliveries per day (3 to 10), volume, computer-voice-only mode.
- **Progress:** every item of every skill as a dot coloured by its box, hollow if he has not met it yet, with how often it was asked and how often he was right first time.
- **Farm day:** a number to set how many farm days are finished, for testing what arrives when. Going forward gives every skipped day its reward, exactly as playing would; going back takes away what was earned after that day. The first change keeps a copy of his real farm (the `bookmark` in the save), and "Return to his real farm" puts it back exactly, placed things and all. The rules are in `src/systems/dayTravel.js`.
- **Reset everything**, behind a second confirmation.

Changing a setting saves it and restarts the game at the play button, so nothing on screen is left out of step with the new values. Closing without changes resumes exactly where he was.

**The logo is the one "go" button.** The robot with a sprout, on a yellow disc (`public/assets/art/logo.svg`), starts the game on the title screen and leads from the home farm back to the animals. It is also the app icon. Its yellow is kept well away from the orange that always means RIGHT.

**The sky is the clock.** The sun crosses the sky as deliveries are made, and he watches it move on each time he comes back to the animals. The last request of the day is always asked at sunset, however long the parent has made the day, and the end of the day is night, with stars and a moon. The home farm is always in daylight: every visit there is a fresh morning. The rules are in `src/systems/sky.js` and the drawing in `src/scenes/farmBackdrop.js`.

## Requests

### Two ways to answer
Every skill produces a request that uses one of two answer kinds. The Request scene only knows these two, which is what keeps new skills from touching the loop.

- **`pick`**: 2–4 things on screen, one is right. One tap answers.
- **`count`**: a pile of identical things. Each tap loads one into the truck while the voice counts it ("one… two… three"). Tapping the truck sends it; there is no separate button, and nothing can be taken out again. If something is loaded and he waits, the truck gives a little hop.
  - Too few: the animal counts what arrived, then "Not enough! I need three. Count again!"
  - Too many: "Too many! I need three. Count again!"
  - Either way the truck comes back, everything returns to the pile, and he counts again from one.
  - After 2 misses the truck glows exactly when it holds the right number.
  - **Numerals are shown with the spoken number**: the asked-for number in the animal's speech bubble, and a numeral that pops up each time the animal counts one aloud. There is no running total on the truck, because he could match it to the bubble's numeral without counting. Each thing he loads is still counted aloud.

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
After each delivery the game picks three different animals out of the six:
- one owns the skill he has practised least over his last 20 deliveries, so nothing is avoided forever;
- the other two are random.

Their left-to-right order is random too.

## Mastery (`src/systems/mastery.js`)
- Each item has a record `{ box: 1–5, seen, correct, lastSeen }`. Items are things like `count:3`, `letter-name:B`, `letter-sound:B`, `side:left`.
- **Only the first try counts.** Right on the first try moves the item up one box. Anything else moves it down one box (never below 1).
- When a skill picks its next item, lower boxes come up more often (weights 5, 4, 3, 2, 1).
- A new item joins a skill only when at least two thirds of that skill's active items are in box 3 or higher.
- Each skill's difficulty is separate. Nothing is ever locked because of mastery.
- The parent progress view shows each item's box as a colored dot.
- Left/right has only two answers, so half of all guesses are right. Read its dots as a trend, not a score.

## Rewards and the home farm
The home farm starts as an empty field with the truck parked on it. Everything else is earned by helping the animals.

**One reward per finished farm day, given at sunset.** Nothing is handed out after a single delivery, so finishing the day is what counts.

**Big rewards build the farm.** On set days (1, 3 and 5, then every third day) the reward is a building or feature that becomes a permanent part of the farm and changes how it looks. Each one is also a toy: tapping it makes something happen.

A big reward must feel different from a small one, and it must be obvious that the farm has changed:
1. **At sunset** he is not shown the building. A big wrapped present bounces on screen and the voice says there is a big surprise for the farm.
2. **On the farm** he first sees it exactly as he left it. Then, at the building's spot, there is hammering and dust, and the building grows out of the ground with confetti and sparkles. If it replaces an older home, that one comes down first.
3. **It shows what it does,** once, by itself (the barn's cow comes out, the tree drops its apples).
4. **A finger points at it** until he taps it himself.

So that the buildings are not mistaken for scenery, they are drawn large and stand in front of the fence, and every few seconds one of them gives a little hop.

| Day | Big reward | When tapped |
|---|---|---|
| 1 | Tent (the first home) | The flap lifts and a lantern glows inside |
| 3 | Fence and gate | The gate swings open or shut |
| 5 | Garage | The door rolls up and his paints and hats come out to choose from |
| 8 | Barn | The doors open and a cow comes out and moos |
| 11 | Cabin (replaces the tent) | Lights go on or off, the door opens, the chimney smokes |
| 14 | Pond | A fish jumps and splashes |
| 17 | Apple tree | It shakes and apples drop and bounce |
| 20 | Hen house | A hen pops out and lays an egg, which hatches |
| 23 | Vegetable garden | Tap to plant, tap to ripen, tap to pick |
| 26 | Well | The bucket goes down, splashes and comes up |
| 29 | Windmill | The sails spin fast, then settle |
| 32 | Farmhouse (replaces the cabin, adds a path) | Lights, door and chimney |
| 35 | Silo | Grain pours out and two birds fly down for it |
| 38 | Beehive | Bees fly out, loop around and come home |
| 41 | Scarecrow | It wobbles and the crow flaps off, then sneaks back |
| 44 | Rain cloud | It rains, then a rainbow comes out for a while |
| 47 | Big farmhouse (replaces the farmhouse) | Lights window by window, door, chimney, a flag |

- The tent, cabin, farmhouse and big farmhouse are four stages of one home. Only the best one he owns is drawn.
- If a building's day has passed and he does not have it (the schedule was edited, or an older save is further on), the earliest one still owed is given, one per day.
- A toy ignores taps while it is still doing its thing, so mashing cannot tangle it.

**Small rewards are cosmetics.** On every other day the reward is one small thing, picked at random:
- **Plain decorations** (flowers, vegetables, bugs, small trees), which can repeat.
- **One-offs**, each given only once: animal friends, a few bigger decorations, truck paints and robot hats.
- Paints and hats are only given once he has the garage, and go straight on.

**On the home farm**
- Small things he has not placed wait on a shelf along the bottom, eight at a time, oldest first.
- Tapping one makes it hop onto the farm at a free spot. He can then drag it anywhere. Dragging it back down onto the shelf puts it away.
- Tapping a placed thing or the truck makes it wiggle.
- Tapping the garage opens every paint and hat he owns, in two rows, with "none" first in each and the current one ringed. Tapping anywhere else closes it.
- Things lower on the screen are drawn in front, so the farm has depth. The fence runs along the back. In front of it stand the buildings, in two loose rows: the home, barn, garage and hen house at the front, the tree, silo and windmill a little behind and between them. The pond, garden, well, beehive and scarecrow are out in the field, and the rain cloud is in the sky.
- Every day ends at home: the sunset always leads to the home farm. A house button on the animals screen leads there at any other time, with a bouncing gift on it while something is waiting.
- The farm holds up to 120 placed and waiting things. Past that, the oldest plain decoration makes room; one-offs are never dropped.
- No stars, no counters, no shop.

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
"rewards": [{ "day": 8, "id": "upgrade-barn", "type": "upgrade", "name": "Barn", "value": "barn" }],
"small":   [{ "id": "small-tulip", "name": "Tulip", "emoji": "🌷" },
            { "id": "friend-duck", "type": "friend", "name": "Duck", "emoji": "🦆", "once": true },
            { "id": "paint-blue", "type": "paint", "name": "Blue paint", "value": "#3b82f6", "once": true, "needs": "garage" }]
```
- `rewards` are the big rewards: farm buildings. `day` is the farm day each arrives on (1 is his first finished day); edit these to change how often big rewards come. `value` names a builder in `src/scenes/homeUpgrades.js`. A building has no emoji: it is never shown as a picture, only built on the farm.
- `small` is the pool for ordinary days.
  - A plain entry (an id and an emoji) is a decoration that can repeat. Give repeatable ones an id starting with `small-`: only those are ever recycled when the farm is full.
  - `once: true` means it is given only one time.
  - `type` is `friend` or `decoration` (placed on the farm; the default), `paint` (`value` is a `#rrggbb` color or `rainbow`) or `hat`. Paints and hats must be `once`.
  - `needs` names a building he must own before this can be given.
- Everything except paint is drawn from its `emoji`, using the device's own emoji font, so a new small reward needs no art.

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
    rewards: ["upgrade-tent", "friend-duck"],      // buildings and one-off cosmetics he owns
    paint: null, hat: null,                        // what the truck and robot wear
    box: ["small-tulip", "small-tulip"],           // waiting on the shelf, oldest first
    placed: [{ item: "friend-duck", x: 470, y: 500 }],  // standing on the home farm
    log: [{ day: 1, id: "upgrade-tent" }]          // which day gave which reward, so a day can be taken back
  },
  days: 0,
  today: [{ art: "apple", numeral: 3 }, { art: "crate", label: "B" }],   // today's deliveries so far
  skillLog: [],         // recent deliveries per skill, for choosing which animals to offer
  lastItem: {},         // last item asked per skill, so it is not asked twice running
  bookmark: null        // { days, today, farm }: his real farm, kept while a parent tests other days
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
