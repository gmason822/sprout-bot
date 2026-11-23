import Phaser from 'phaser';
import { createInput, ACTIONS } from '../systems/input.js';
import { loadContent } from '../systems/content.js';
import { GENERATOR_IDS } from '../skills/index.js';
import { createStore, browserStorage } from '../systems/save.js';
import { paintTruckSvg } from '../systems/paint.js';
import { reconcileFarm } from '../systems/home.js';
import { UPGRADE_IDS } from './homeUpgrades.js';
import { drawFarmBackdrop } from './farmBackdrop.js';
import { makeGoButton, numberStyle } from './ui.js';
import { VERSION } from '../systems/version.js';

// Art is loaded at twice the drawn size so it stays sharp when the canvas is scaled up.
const ART = {
  truck: [880, 480], basket: [320, 220], logo: [680, 680],
  hen: [520, 520], cow: [520, 520], pig: [520, 520], owl: [520, 520], rabbit: [520, 520], mouse: [520, 520],
  apple: [300, 300], carrot: [300, 300], egg: [300, 300], pumpkin: [300, 300], strawberry: [300, 300], tomato: [300, 300],
  crate: [420, 420], barrel: [420, 420], haybale: [420, 420], flowerpot: [420, 420],
  'shape-circle': [420, 420], 'shape-square': [420, 420], 'shape-triangle': [420, 420], 'shape-star': [420, 420],
  'shape-heart': [420, 420], 'shape-rectangle': [420, 420], 'shape-oval': [420, 420], 'shape-diamond': [420, 420],
};

/**
 * Loads art and content, then shows the title screen: the name, the logo as one big
 * start button, and the version. The game waits here, and that first tap is also
 * what unlocks sound.
 */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    for (const [key, [width, height]] of Object.entries(ART)) {
      this.load.svg(key, `assets/art/${key}.svg`, { width, height });
    }
    // The truck's drawing as text, so it can be repainted for each paint reward.
    this.load.text('truck-svg', 'assets/art/truck.svg');
  }

  create() {
    const { width } = this.scale;
    drawFarmBackdrop(this);

    // Nothing has started yet, so if a newer version arrives while the play button
    // is showing, switch to it straight away.
    const reloadIfUpdated = () => { if (this.registry.get('updateReady')) window.location.reload(); };
    reloadIfUpdated();
    this.registry.events.on('changedata-updateReady', reloadIfUpdated);
    this.events.once('shutdown', () => this.registry.events.off('changedata-updateReady', reloadIfUpdated));

    const content = this.checkArt(loadContent(GENERATOR_IDS));
    this.registry.set('content', content);

    // His farm, progress and settings, restored from the last visit.
    const store = createStore(browserStorage());
    const state = store.load();
    reconcileFarm(state.farm, content.rewards, content.small);
    this.registry.set('store', store);
    this.registry.set('state', state);

    const audio = this.registry.get('audio');
    audio.setVolume(state.settings.volume);
    audio.setTtsOnly(state.settings.ttsOnly);
    this.registry.get('sfx').setVolume(state.settings.volume * 0.6);
    audio.preload();
    this.paintTrucks(content);

    // The name is for grown-ups; he only needs the big button.
    this.add.text(width / 2, 86, 'Sprout Bot', { ...numberStyle(112), color: '#2e7d32' }).setOrigin(0.5).setDepth(3);

    const truck = this.add.image(width / 2, 596, 'truck').setDisplaySize(360, 196);
    this.tweens.add({ targets: truck, y: 592, duration: 140, yoyo: true, repeat: -1 });

    const button = makeGoButton(this, width / 2, 316, 142).setDepth(4);
    this.tweens.add({ targets: button, scale: 1.07, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Small and out of the way: so a parent can tell when an update has arrived.
    this.add.text(width - 18, 710, VERSION, {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '22px',
      color: '#5b4636',
      resolution: 2,
    }).setOrigin(1, 1).setAlpha(0.8).setDepth(3);

    const input = createInput(this);
    input.tappable(button, 'play', new Phaser.Geom.Circle(0, 0, 170), Phaser.Geom.Circle.Contains);
    const start = () => this.start(input);
    input.on(ACTIONS.TAP, start);
    input.on(ACTIONS.GO, start);
  }

  /** One truck picture per paint reward, made by recolouring the truck's SVG. */
  paintTrucks(content) {
    const svg = this.cache.text.get('truck-svg');
    const [width, height] = ART.truck;
    for (const reward of [...content.rewards, ...content.small]) {
      if (reward.type !== 'paint' || !svg) continue;
      const painted = paintTruckSvg(svg, reward.value, width, height);
      this.textures.addBase64(`truck-${reward.id}`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(painted)}`);
    }
  }

  /** Content can name things there is no picture for. Skip those rather than show a blank box. */
  checkArt(content) {
    const has = (key, what) => {
      if (this.textures.exists(key)) return true;
      console.error(`[content] ${what} "${key}" has no picture in public/assets/art/`);
      return false;
    };
    const canDraw = (reward) => {
      if (reward.type !== 'upgrade' || UPGRADE_IDS.includes(reward.value)) return true;
      console.error(`[content] upgrade "${reward.id}" names "${reward.value}", which src/scenes/homeUpgrades.js cannot draw`);
      return false;
    };
    return {
      ...content,
      rewards: content.rewards.filter(canDraw),
      animals: content.animals.filter((a) => has(a.id, 'animal')),
      skills: content.skills.map((s) => ({
        ...s,
        ...(s.items ? { items: s.items.filter((i) => has(i, `${s.id} item`)) } : {}),
        tiers: s.tiers.map((t) => (t.shapes ? { ...t, shapes: t.shapes.filter((x) => has(`shape-${x}`, 'shape')) } : t)),
      })),
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
