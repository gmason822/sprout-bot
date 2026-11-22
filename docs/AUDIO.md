# Voice recording list

Record in a quiet room on a phone, and speak slowly and cheerfully. Export as `.mp3` (mono, 44.1 kHz is fine). Trim the silence at the start and end. Put files in `public/assets/audio/voice/`.

Requests are built by playing clips one after another ("I need" + "three" + "apples"), so say each clip on its own with a natural ending.

Missing clips fall back to text-to-speech, **except letter sounds**, which TTS cannot say properly.

Animal lines are more fun in a silly voice for each animal. One voice for everything is fine to start.

## Milestone 1 (record these first)
| File | Say |
|------|-----|
| `need.mp3` | "I need…" |
| `num-1.mp3` … `num-7.mp3` | "one" … "seven" (he can load up to 7 apples, and each one is counted) |
| `item-apple.mp3` | "apple" |
| `item-apples.mp3` | "apples" |
| `one-more.mp3` | "One more!" |
| `more.mp3` | "More!" |
| `too-many.mp3` | "Too many! Take one out." |
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
