import Phaser from 'phaser';
import { createInput, moveFocus, ACTIONS } from '../systems/input.js';
import { makeRequest } from '../skills/index.js';
import { chooseAnimals, isDayDone } from '../systems/day.js';
import { drawFarmBackdrop } from './farmBackdrop.js';
import { TRUCK_Y } from './layout.js';
import { tween, makeTruck, drawFocusRing, drawDayRow, emoji } from './ui.js';

const ANIMAL_Y = 345;
const ANIMAL_SIZE = 280;
const SPOTS = { 1: [640], 2: [340, 940] };

const HOUSE = { x: 100, y: 105, radius: 62 };

const GOOD_MORNING = { say: ['good-morning'], tts: 'Good morning, farm!' };
const WHO_HELPS = { say: ['who-helps'], tts: 'Who do you want to help?' };
const IDLE_MS = 10000;
const IDLE_REPEATS_MAX = 3;

/** The animals screen: today's deliveries, two animals to choose from, and the way home. */
export class Farm extends Phaser.Scene {
  constructor() {
    super('Farm');
  }

  create() {
    this.audio = this.registry.get('audio');
    this.sfx = this.registry.get('sfx');
    this.state = this.registry.get('state');
    this.content = this.registry.get('content');
    this.in = createInput(this);
    this.focus = -1;
    this.events.once('shutdown', () => this.audio.stop());

    // Between requests everything is saved, so this is a safe moment to switch to a
    // newer version. He lands on the play button and carries on with one tap.
    if (this.registry.get('updateReady')) return window.location.reload();

    // A finished day goes to sunset, even if the game was closed before it got there.
    if (isDayDone(this.state.today, this.state.settings.deliveriesPerDay)) {
      return this.scene.start('Sunset');
    }

    drawFarmBackdrop(this);
    drawDayRow(this, this.state.today, this.state.settings.deliveriesPerDay);
    this.buildHouseButton();
    this.truck = makeTruck(this, 640, TRUCK_Y);
    this.tweens.add({ targets: this.truck, y: TRUCK_Y - 4, duration: 140, yoyo: true, repeat: -1 });
    this.focusRing = this.add.graphics().setDepth(9).setVisible(false);

    // Only offer an animal that actually has something to ask right now.
    const ctx = {
      content: this.content,
      mastery: this.state.mastery,
      hasClip: (id) => this.audio.has(id),
      childName: this.state.settings.childName,
    };
    const ready = this.content.animals.filter((a) => makeRequest(a.skill, ctx) !== null);
    const pair = chooseAnimals(ready, this.state.skillLog);
    if (pair.length === 0) console.error('[farm] no animal has anything to ask; check the content files');
    this.animals = pair.map((animal, i) => this.buildAnimal(animal, SPOTS[pair.length][i], i));

    this.in.on(ACTIONS.TAP, (id) => this.onTap(id));
    this.in.on(ACTIONS.LEFT, () => this.moveFocus(-1));
    this.in.on(ACTIONS.RIGHT, () => this.moveFocus(1));
    this.in.on(ACTIONS.GO, () => {
      if (this.focus < 0) return this.moveFocus(1);
      this.choose(this.focus);
    });
    this.in.on(ACTIONS.PICK_1, () => this.choose(0));
    this.in.on(ACTIONS.PICK_2, () => this.choose(1));

    this.idleRepeats = 0;
    this.time.delayedCall(400, () => this.greet());
  }

  // ---------- building ----------

  /** The way to the home farm. A gift bounces on it while something is waiting to be placed. */
  buildHouseButton() {
    const disc = this.add.graphics();
    disc.fillStyle(0xffffff, 1).fillCircle(0, 0, HOUSE.radius);
    disc.lineStyle(6, 0x5b4636, 1).strokeCircle(0, 0, HOUSE.radius);
    const button = this.add.container(HOUSE.x, HOUSE.y, [disc, emoji(this, 0, -2, '🏡', 70)]).setDepth(6);
    this.in.tappable(button, 'home', new Phaser.Geom.Circle(0, 0, HOUSE.radius + 22), Phaser.Geom.Circle.Contains);
    if (this.state.farm.box.length > 0) {
      const gift = emoji(this, HOUSE.x + 46, HOUSE.y - 44, '🎁', 46).setDepth(6);
      this.tweens.add({ targets: gift, y: gift.y - 10, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.out' });
    }
  }

  buildAnimal(animal, x, i) {
    const sprite = this.add.image(x, ANIMAL_Y, animal.id).setDisplaySize(ANIMAL_SIZE, ANIMAL_SIZE).setDepth(3);
    const k = sprite.width / ANIMAL_SIZE;
    this.in.tappable(sprite, `animal:${i}`,
      new Phaser.Geom.Circle(sprite.width / 2, sprite.height / 2, 160 * k), Phaser.Geom.Circle.Contains);
    // They take turns hopping, so it reads as "pick me!".
    this.tweens.add({
      targets: sprite, y: ANIMAL_Y - 26, duration: 260, yoyo: true, repeat: -1,
      repeatDelay: 900, delay: i * 600, ease: 'Quad.out',
    });

    // A thought bubble shows the kind of thing this animal asks for.
    const bx = x + 150;
    const by = ANIMAL_Y - 160;
    const bubble = this.add.graphics().setDepth(3);
    bubble.fillStyle(0xffffff, 1);
    bubble.fillCircle(bx - 62, by + 78, 10).fillCircle(bx - 40, by + 58, 16).fillCircle(bx, by, 66);
    bubble.lineStyle(5, 0x5b4636, 1).strokeCircle(bx, by, 66);
    if (this.textures.exists(animal.icon)) {
      this.add.image(bx, by, animal.icon).setDisplaySize(88, 88).setDepth(3);
    } else if (animal.icon) {
      emoji(this, bx, by, animal.icon, 72).setDepth(3);
    }
    return { animal, sprite, x };
  }

  // ---------- talking ----------

  async greet() {
    if (this.registry.get('newDay')) {
      this.registry.set('newDay', false);
      await this.audio.say(GOOD_MORNING.say, GOOD_MORNING.tts);
    }
    this.ask();
  }

  ask() {
    if (this.in.locked || this.animals.length === 0) return;
    this.audio.say(WHO_HELPS.say, WHO_HELPS.tts);
    this.idleTimer?.remove();
    if (this.idleRepeats >= IDLE_REPEATS_MAX) return;
    this.idleTimer = this.time.delayedCall(IDLE_MS, () => {
      this.idleRepeats++;
      this.ask();
    });
  }

  // ---------- actions ----------

  onTap(id) {
    const [kind, value] = id.split(':');
    if (kind === 'animal') return this.choose(Number(value));
    if (kind === 'home') return this.goHome();
  }

  goHome() {
    this.in.lock();
    this.idleTimer?.remove();
    this.audio.stop();
    this.sfx.pop(4);
    this.scene.start('Home');
  }

  focusables() {
    return this.animals.map((a, i) => ({ id: `animal:${i}`, x: a.x, y: ANIMAL_Y, r: 155 }));
  }

  moveFocus(dir) {
    this.focus = moveFocus(this.focus, dir, this.animals.length);
    drawFocusRing(this.focusRing, this.focusables()[this.focus]);
  }

  async choose(i) {
    const picked = this.animals[i];
    if (!picked) return;
    this.in.lock();
    this.idleTimer?.remove();
    this.focusRing.setVisible(false);
    this.audio.stop();
    this.sfx.honk();

    this.tweens.killTweensOf(this.truck);
    this.tweens.add({ targets: picked.sprite, scale: picked.sprite.scale * 1.12, duration: 160, yoyo: true });
    this.sfx.engine(0.5);
    await tween(this, { targets: this.truck, x: Phaser.Math.Linear(640, picked.x, 0.6), duration: 500, ease: 'Sine.inOut' });
    this.scene.start('Request', { animal: picked.animal });
  }
}
