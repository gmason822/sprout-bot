import Phaser from 'phaser';
import { createInput, ACTIONS } from '../systems/input.js';
import { endDay } from '../systems/day.js';
import { drawFarmBackdrop } from './farmBackdrop.js';
import { TRUCK_Y } from './layout.js';
import { tween, wait, makeTruck, makeConfetti, drawDayRow, rewardPicture, emoji, makeSunButton } from './ui.js';

const NEW_THING = { say: ['new-friend'], tts: 'Look! Something new on the farm!' };
const ALL_DONE = { say: ['you-did-it'], tts: 'You did it!' };
const SLEEPY = { say: ['sleepy'], tts: 'The robot is sleepy. Good night!' };

/**
 * The end of a farm day, and the only time a reward is given: everything he
 * delivered is counted back, one new thing arrives (a big reward on its set day,
 * otherwise a small one), the robot goes to sleep, and the sun button takes him to
 * the home farm.
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

    this.in.on(ACTIONS.TAP, () => this.wakeUp());
    this.in.on(ACTIONS.GO, () => this.wakeUp());

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

    if (reward || gift) {
      // A big reward gets the big entrance; a small thing is the same moment, smaller.
      const picture = reward
        ? rewardPicture(this, 640, 340, reward, 230)
        : rewardPicture(this, 640, 340, { type: 'decoration', ...gift }, 150);
      picture.setDepth(10).setScale(0);
      this.sfx.cheer();
      for (const x of reward ? [340, 640, 940] : [640]) this.confetti.explode(reward ? 45 : 30, x, 420);
      tween(this, { targets: picture, scale: 1, duration: 420, ease: 'Back.out' });
      await this.audio.say(NEW_THING.say, NEW_THING.tts);
      await wait(this, 500);
      // It goes off to live on the farm. Whatever the timing of the voice line, the
      // entrance is over by now, so make sure nothing is still growing it.
      this.tweens.killTweensOf(picture);
      picture.setScale(1);
      await tween(this, { targets: picture, scale: 0.4, y: 240, duration: 350, ease: 'Quad.in' });
      this.tweens.add({ targets: picture, y: 232, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    } else {
      this.sfx.cheer();
      for (const x of [340, 640, 940]) this.confetti.explode(45, x, 420);
      await this.audio.say(ALL_DONE.say, ALL_DONE.tts);
    }

    // Night falls and the robot sleeps.
    this.tweens.add({ targets: this.night, fillAlpha: 0.45, duration: 1800 });
    const zzz = emoji(this, 590, 400, '💤', 70).setDepth(19);
    this.tweens.add({ targets: zzz, y: 380, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.truck, angle: 2, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    await this.audio.say(SLEEPY.say, SLEEPY.tts);
    await wait(this, 600);

    // A sun to tap when he wants another day. Nothing pushes him to.
    this.sun = makeSunButton(this, 1090, 300, 105).setDepth(19).setScale(0);
    this.in.tappable(this.sun, 'sun', new Phaser.Geom.Circle(0, 0, 160), Phaser.Geom.Circle.Contains);
    await tween(this, { targets: this.sun, scale: 1, duration: 400, ease: 'Back.out' });
    this.tweens.add({ targets: this.sun, scale: 1.07, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.in.unlock();
  }

  wakeUp() {
    this.in.lock();
    this.sfx.beepBoop();
    this.registry.set('newDay', true);
    // The day always ends at home, where today's rewards are waiting on the shelf.
    this.scene.start('Home');
  }
}
