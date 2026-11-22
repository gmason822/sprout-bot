import Phaser from 'phaser';
import { createInput, ACTIONS } from '../systems/input.js';
import { loadContent } from '../systems/content.js';
import { GENERATOR_IDS } from '../skills/index.js';
import { drawFarmBackdrop } from './farmBackdrop.js';
import { makePlayButton } from './ui.js';

// Art is loaded at twice the drawn size so it stays sharp when the canvas is scaled up.
const ART = {
  truck: [880, 480], basket: [320, 220],
  hen: [520, 520], cow: [520, 520], pig: [520, 520],
  apple: [300, 300], carrot: [300, 300], egg: [300, 300], pumpkin: [300, 300],
  crate: [420, 420], barrel: [420, 420], haybale: [420, 420], flowerpot: [420, 420],
};

/** Loads art and content, then shows one big play button. The first tap is what unlocks sound. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    for (const [key, [width, height]] of Object.entries(ART)) {
      this.load.svg(key, `assets/art/${key}.svg`, { width, height });
    }
  }

  create() {
    const { width } = this.scale;
    drawFarmBackdrop(this);

    const content = this.checkArt(loadContent(GENERATOR_IDS));
    this.registry.set('content', content);
    // Everything he has done this session. Milestone 3 saves and restores it.
    this.registry.set('state', {
      mastery: {},
      skillLog: [],
      lastItem: {},
      settings: { childName: '' },
    });

    this.registry.get('audio').preload();

    const truck = this.add.image(width / 2, 560, 'truck').setDisplaySize(440, 240);
    this.tweens.add({ targets: truck, y: 556, duration: 140, yoyo: true, repeat: -1 });

    const button = makePlayButton(this, width / 2, 260, 130);
    this.tweens.add({ targets: button, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const input = createInput(this);
    input.tappable(button, 'play', new Phaser.Geom.Circle(0, 0, 150), Phaser.Geom.Circle.Contains);
    const start = () => this.start(input);
    input.on(ACTIONS.TAP, start);
    input.on(ACTIONS.GO, start);
  }

  /** Content can name things there is no picture for. Skip those rather than show a blank box. */
  checkArt(content) {
    const has = (key, what) => {
      if (this.textures.exists(key)) return true;
      console.error(`[content] ${what} "${key}" has no picture in public/assets/art/`);
      return false;
    };
    return {
      ...content,
      animals: content.animals.filter((a) => has(a.id, 'animal')),
      skills: content.skills.map((s) => (s.items ? { ...s, items: s.items.filter((i) => has(i, `${s.id} item`)) } : s)),
    };
  }

  start(input) {
    input.lock();
    this.registry.get('sfx').unlock();
    this.registry.get('audio').unlock();
    this.registry.get('sfx').beepBoop();
    goFullscreenLandscape(this);
    this.scene.start('Farm');
  }
}

function goFullscreenLandscape(scene) {
  // Both calls are refused on some devices (and on a PC); the game works without them.
  try {
    if (!scene.scale.isFullscreen) scene.scale.startFullscreen();
  } catch { /* not allowed here */ }
  try {
    const lock = screen.orientation?.lock?.('landscape');
    lock?.catch?.(() => {});
  } catch { /* not supported here */ }
}
