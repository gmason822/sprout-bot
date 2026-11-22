import Phaser from 'phaser';
import { createInput, moveFocus, ACTIONS } from '../systems/input.js';
import { makeRequest } from '../skills/index.js';
import { chooseAnimals, isDayDone, toggleWear } from '../systems/day.js';
import { drawFarmBackdrop } from './farmBackdrop.js';
import { TRUCK_Y } from './layout.js';
import { tween, makeTruck, drawFocusRing, drawDayRow, rewardPicture, emoji } from './ui.js';

const ANIMAL_Y = 345;
const ANIMAL_SIZE = 280;
const SPOTS = { 1: [640], 2: [340, 940] };

// Where friends and decorations stand, in the order they arrive.
const FRIEND_SPOTS = [
  { x: 85, y: 545 }, { x: 1195, y: 545 }, { x: 640, y: 400 }, { x: 85, y: 440 },
  { x: 1195, y: 440 }, { x: 560, y: 330 }, { x: 720, y: 330 }, { x: 640, y: 262 },
];
const FRIEND_SIZE = 84;
// Hats line up on the road to the left of the truck, paint pots to the right.
const SHELF_Y = 664;
const HAT_XS = [60, 165, 270, 375];
const PAINT_XS = [905, 1010, 1115, 1220];
const SHELF_SIZE = 78;

const GOOD_MORNING = { say: ['good-morning'], tts: 'Good morning, farm!' };
const WHO_HELPS = { say: ['who-helps'], tts: 'Who do you want to help?' };
const IDLE_MS = 10000;
const IDLE_REPEATS_MAX = 3;

/** The hub: today's deliveries, everything he has earned, and two animals to choose from. */
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
    this.buildRewards();
    this.buildTruck();
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

  buildTruck() {
    if (this.truck) {
      this.tweens.killTweensOf(this.truck);
      this.truck.destroy();
    }
    this.truck = makeTruck(this, 640, TRUCK_Y);
    this.tweens.add({ targets: this.truck, y: TRUCK_Y - 4, duration: 140, yoyo: true, repeat: -1 });
  }

  /** Everything he has earned lives here: friends and decorations stand around, hats and paint can be put on. */
  buildRewards() {
    const owned = this.content.rewards.filter((r) => this.state.farm.rewards.includes(r.id));
    let standing = 0;
    let hats = 0;
    let paints = 0;
    for (const reward of owned) {
      let spot;
      let size = FRIEND_SIZE;
      let id = `friend:${reward.id}`;
      if (reward.type === 'hat' || reward.type === 'paint') {
        const xs = reward.type === 'hat' ? HAT_XS : PAINT_XS;
        const n = reward.type === 'hat' ? hats++ : paints++;
        if (n >= xs.length) continue;
        spot = { x: xs[n], y: SHELF_Y };
        size = SHELF_SIZE;
        id = `wear:${reward.id}`;
      } else {
        if (standing >= FRIEND_SPOTS.length) continue;
        spot = FRIEND_SPOTS[standing++];
      }
      const picture = rewardPicture(this, spot.x, spot.y, reward, size).setDepth(reward.type === 'friend' || reward.type === 'decoration' ? 2.5 : 6);
      const half = size * 0.62;
      const local = picture.type === 'Text'
        ? new Phaser.Geom.Rectangle(picture.width / 2 - half, picture.height / 2 - half, half * 2, half * 2)
        : new Phaser.Geom.Rectangle(-half, -half, half * 2, half * 2);
      this.in.tappable(picture, id, local, Phaser.Geom.Rectangle.Contains);
      this.rewardPictures ??= {};
      this.rewardPictures[reward.id] = picture;
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
    if (kind === 'friend') return this.wiggle(value);
    if (kind === 'wear') return this.wear(value);
  }

  wiggle(rewardId) {
    const picture = this.rewardPictures[rewardId];
    this.sfx.pop(3);
    this.tweens.killTweensOf(picture);
    picture.setAngle(0);
    this.tweens.add({ targets: picture, angle: { from: -14, to: 14 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => picture.setAngle(0) });
  }

  /** Tap a hat or a paint pot to put it on the robot or the truck right away. */
  wear(rewardId) {
    const reward = this.content.rewards.find((r) => r.id === rewardId);
    if (!reward || !toggleWear(this.state.farm, reward)) return;
    this.registry.get('store').save(this.state);
    this.sfx.pop(5);
    this.wiggle(rewardId);
    this.buildTruck();
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
