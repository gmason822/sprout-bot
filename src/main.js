import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { Farm } from './scenes/Farm.js';
import { Home } from './scenes/Home.js';
import { Request } from './scenes/Request.js';
import { Sunset } from './scenes/Sunset.js';
import { createAudio } from './systems/audio.js';
import { createSfx } from './systems/sfx.js';
import { watchForUpdates } from './systems/update.js';
import { setInputSuspended } from './systems/input.js';
import { installParentGate } from './parent/gate.js';
import { openParentPanel } from './parent/panel.js';
import './parent/parent.css';
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
  scene: [Boot, Farm, Home, Request, Sunset],
});

// Handy in the browser console while developing; left out of the real build.
if (import.meta.env.DEV) window.__game = game;

// One audio and one sfx service for the whole game, shared through the registry.
game.registry.set('audio', createAudio(voiceClips));
game.registry.set('sfx', createSfx());

// A newer version is ready. The Boot and Farm scenes reload for it, because those are
// the two moments when a reload loses nothing.
game.registry.set('updateReady', false);
watchForUpdates(() => game.registry.set('updateReady', true));

// A long press must never bring up the browser's own menu over the game.
window.addEventListener('contextmenu', (event) => event.preventDefault());

// ---------- the hidden parent area ----------

let pausedScenes = [];

function pauseGame() {
  setInputSuspended(true);
  game.registry.get('audio').stop();
  pausedScenes = game.scene.getScenes(true);
  pausedScenes.forEach((scene) => scene.scene.pause());
}

function resumeGame() {
  pausedScenes.forEach((scene) => scene.scene.resume());
  pausedScenes = [];
  setInputSuspended(false);
}

installParentGate({
  // Nothing to show until the save has been loaded.
  canOpen: () => Boolean(game.registry.get('state')),
  onOpen: pauseGame,
  onCancel: resumeGame,
  onPass: () => {
    const state = game.registry.get('state');
    const store = game.registry.get('store');
    openParentPanel({
      state,
      content: game.registry.get('content'),
      // Let the parent hear the volume they have just chosen.
      onPreview: ({ volume }) => {
        const sfx = game.registry.get('sfx');
        sfx.setVolume(volume * 0.6);
        sfx.pop(3);
      },
      onClose: ({ settings, reset }) => {
        if (reset) store.reset();
        else if (settings) store.save({ ...state, settings });
        // A changed name or day length affects what is already on screen, so start
        // cleanly from the saved state rather than patching a running scene.
        if (reset || settings) return window.location.reload();
        const sfx = game.registry.get('sfx');
        sfx.setVolume(state.settings.volume * 0.6);
        resumeGame();
      },
    });
  },
});
