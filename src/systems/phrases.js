// Everything the game says that does not come from a skill. Kept in one place so the
// voice generator can find every line (see tools/voice/).

export const THANK_YOU = { say: ['thank-you'], tts: 'Thank you!' };
export const PRAISE = [
  { say: ['great-job'], tts: 'Great job!' },
  { say: ['you-did-it'], tts: 'You did it!' },
];
export const WHO_HELPS = { say: ['who-helps'], tts: 'Who do you want to help?' };
export const GOOD_MORNING = { say: ['good-morning'], tts: 'Good morning, farm!' };
export const NEW_THING = { say: ['new-friend'], tts: 'Look! Something new on the farm!' };
// A big reward is not shown at sunset: it is built in front of him on the farm.
export const BIG_SURPRISE = { say: ['big-surprise'], tts: "A big surprise for the farm! Let's go and see!" };
export const ALL_DONE = { say: ['you-did-it'], tts: 'You did it!' };
export const SLEEPY = { say: ['sleepy'], tts: 'The robot is sleepy. Good night!' };

export const FIXED_LINES = [THANK_YOU, ...PRAISE, WHO_HELPS, GOOD_MORNING, NEW_THING, BIG_SURPRISE, ALL_DONE, SLEEPY].map((p) => p.tts);
