import Phaser from 'phaser';
import { createInput, ACTIONS } from '../systems/input.js';
import { endDay } from '../systems/day.js';
import { NEW_THING, BIG_SURPRISE, ALL_DONE, SLEEPY } from '../systems/phrases.js';
import { drawFarmBackdrop } from './farmBackdrop.js';
import { TRUCK_Y } from './layout.js';
import { tween, wait, makeTruck, makeConfetti, drawDayRow, rewardPicture, emoji } from './ui.js';

/**
 * The end of a farm day, and the only time a reward is given: everything he
 * delivered is counted back, the robot goes to sleep, and one new thing arrives. A
 * small reward is shown briefly and he goes straight to the home farm. A big one is
 * a present that waits to be tapped.
 */
export class Sunset extends Phaser.Scene {
  constructor() {
    super('Sunset');
  }

  create() {
    this.audio = this.registry.get('audio');
    this.sfx = this.registry.get('sfx');
    const state = this.registry.get('state');
    const content = this.registry.get('content');
    this.in = createInput(this);
    this.in.lock();
    this.events.once('shutdown', () => this.audio.stop());

    // Bank the day first and save, so closing the game mid-sunset loses nothing.
    const perDay = state.settings.deliveriesPerDay;
    const { reward, gift, delivered } = endDay(state, content.rewards, content.small);
    this.registry.get('store').save(state);

    drawFarmBackdrop(this);
    // The sky warms up as the day ends.
    this.dusk = this.add.rectangle(640, 360, 1280, 720, 0xff7043, 0).setDepth(0.5);
    this.night = this.add.rectangle(640, 360, 1280, 720, 0x1a237e, 0).setDepth(18);

    this.row = drawDayRow(this, delivered, perDay, { y: 110, size: 86, depth: 4 });
    this.row.icons.forEach((icon) => icon.setScale(0));
    this.truck = makeTruck(this, 640, TRUCK_Y);
    this.confetti = makeConfetti(this);

    // Only a big reward waits for him: input stays locked until its present is up.
    this.in.on(ACTIONS.TAP, () => this.goHome());
    this.in.on(ACTIONS.GO, () => this.goHome());

    this.play(reward, gift);
  }

  /** `reward` is a big reward, `gift` a small one. A day gives one or the other. */
  async play(reward, gift) {
    this.tweens.add({ targets: this.dusk, fillAlpha: 0.42, duration: 2500 });

    // Count the day back to him, one delivery at a time.
    for (const [i, icon] of this.row.icons.entries()) {
      this.sfx.pop(i + 1);
      await tween(this, { targets: icon, scale: 1, duration: 220, ease: 'Back.out' });
    }
    await wait(this, 300);

    // Night falls and the robot sleeps.
    this.tweens.add({ targets: this.night, fillAlpha: 0.45, duration: 1800 });
    // To the left of the robot, clear of the reward that comes up in the middle.
    const zzz = emoji(this, 455, 410, '💤', 70).setDepth(19);
    this.tweens.add({ targets: zzz, y: 380, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.truck, angle: 2, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    await this.audio.say(SLEEPY.say, SLEEPY.tts);
    await wait(this, 400);

    // The day's one reward comes last, so it is the thing he leaves on.
    if (reward) {
      // A big reward is a building, and it is not handed over here. He gets a big
      // present, and the game waits for him to open it: tapping it takes him to the
      // farm, where the building is built in front of him.
      this.registry.set('justBuilt', reward.value ?? null);
      const present = emoji(this, 640, 330, '🎁', 240).setDepth(19).setScale(0);
      this.sfx.cheer();
      for (const x of [240, 440, 640, 840, 1040]) this.confetti.explode(45, x, 420);
      await tween(this, { targets: present, scale: 1, duration: 500, ease: 'Back.out' });
      this.tweens.add({ targets: present, angle: { from: -7, to: 7 }, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: present, scale: 1.1, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      await this.audio.say(BIG_SURPRISE.say, BIG_SURPRISE.tts);
      // A text object's hit area is measured from its top-left corner, not its middle.
      const middle = new Phaser.Geom.Circle(present.width / 2, present.height / 2, 190);
      this.in.tappable(present, 'present', middle, Phaser.Geom.Circle.Contains);
      this.in.unlock();
      return;
    }

    if (gift) {
      // A small reward is quick: it is shown as itself, then he is taken straight to
      // the farm, where it is waiting on the shelf.
      const picture = rewardPicture(this, 640, 320, { type: 'decoration', ...gift }, 170).setDepth(19).setScale(0);
      this.sfx.chime();
      this.confetti.explode(30, 640, 420);
      tween(this, { targets: picture, scale: 1, duration: 420, ease: 'Back.out' });
      await this.audio.say(NEW_THING.say, NEW_THING.tts);
      await wait(this, 500);
    } else {
      this.sfx.cheer();
      for (const x of [340, 640, 940]) this.confetti.explode(45, x, 420);
      await this.audio.say(ALL_DONE.say, ALL_DONE.tts);
    }
    this.goHome();
  }

  goHome() {
    this.in.lock();
    this.sfx.beepBoop();
    this.registry.set('newDay', true);
    // The day always ends at home, where today's rewards are waiting on the shelf.
    this.scene.start('Home');
  }
}
