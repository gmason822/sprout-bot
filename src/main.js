import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { Farm } from './scenes/Farm.js';
import { Request } from './scenes/Request.js';
import { createAudio } from './systems/audio.js';
import { createSfx } from './systems/sfx.js';
import voiceClips from 'virtual:voice-clips';

export const WIDTH = 1280;
export const HEIGHT = 720;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#7cc4f0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT,
  },
  input: {
    // One finger at a time: a resting palm must not count as extra taps.
    activePointers: 1,
  },
  scene: [Boot, Farm, Request],
});

// Handy in the browser console while developing; left out of the real build.
if (import.meta.env.DEV) window.__game = game;

// One audio and one sfx service for the whole game, shared through the registry.
game.registry.set('audio', createAudio(voiceClips));
game.registry.set('sfx', createSfx());
