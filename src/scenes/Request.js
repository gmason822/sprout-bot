import Phaser from 'phaser';
import { createInput, moveFocus, ACTIONS } from '../systems/input.js';
import { makeRequest } from '../skills/index.js';
import { numberWord } from '../skills/count.js';
import { recordAnswer } from '../systems/mastery.js';
import { isDayDone } from '../systems/day.js';
import { earnSmall } from '../systems/home.js';
import { drawFarmBackdrop } from './farmBackdrop.js';
import { CountBoard } from './boards/CountBoard.js';
import { PickBoard } from './boards/PickBoard.js';
import { ANIMAL, TRUCK_Y } from './layout.js';
import { numberStyle, tween, wait, bounce, makeConfetti, makeTruck, drawFocusRing, emoji } from './ui.js';

// The scene knows only these two ways of answering. A new skill reuses one of them,
// which is why adding a skill never touches this file.
const BOARDS = { count: CountBoard, pick: PickBoard };

const PRAISE = [
  { say: ['great-job'], tts: 'Great job!' },
  { say: ['you-did-it'], tts: 'You did it!' },
];

const IDLE_MS = 8000;
const IDLE_REPEATS_MAX = 3;

/** One request from one animal: hear it, answer it, celebrate, then back to the farm (or to sunset). */
export class Request extends Phaser.Scene {
  constructor() {
    super('Request');
  }

  init(data) {
    this.animal = data.animal;
  }

  create() {
    this.audio = this.registry.get('audio');
    this.sfx = this.registry.get('sfx');
    this.state = this.registry.get('state');
    this.in = createInput(this);
    this.events.once('shutdown', () => this.audio.stop());

    this.request = makeRequest(this.animal.skill, {
      content: this.registry.get('content'),
      mastery: this.state.mastery,
      hasClip: (id) => this.audio.has(id),
      childName: this.state.settings.childName,
      prevItemId: this.state.lastItem[this.animal.skill] ?? null,
    });
    const Board = this.request && BOARDS[this.request.answer.kind];
    if (!Board) {
      // The farm only offers animals that have something to ask, so this is a safety net.
      console.error(`[request] nothing to ask for ${this.animal.id}`);
      return this.scene.start('Farm');
    }

    this.misses = 0;
    this.judged = false;
    this.focus = -1;

    drawFarmBackdrop(this);
    this.buildAnimal();
    this.truckHomeX = Board.TRUCK_HOME_X;
    this.truck = makeTruck(this, this.truckHomeX, TRUCK_Y);
    this.confetti = makeConfetti(this);
    this.focusRing = this.add.graphics().setDepth(9).setVisible(false);
    this.board = new Board(this, this.request);

    this.in.on(ACTIONS.TAP, (id) => this.onTap(id));
    this.in.on(ACTIONS.LEFT, () => this.onMoveFocus(-1));
    this.in.on(ACTIONS.RIGHT, () => this.onMoveFocus(1));
    this.in.on(ACTIONS.GO, () => this.onGo());
    [ACTIONS.PICK_1, ACTIONS.PICK_2, ACTIONS.PICK_3, ACTIONS.PICK_4].forEach((action, i) => {
      this.in.on(action, () => { this.resetIdle(); this.board.pickIndex?.(i); });
    });

    this.begin();
  }

  buildAnimal() {
    this.animalSprite = this.add.image(ANIMAL.x, ANIMAL.y, this.animal.id)
      .setDisplaySize(ANIMAL.size, ANIMAL.size).setDepth(3);
    const k = this.animalSprite.width / ANIMAL.size;
    this.in.tappable(this.animalSprite, 'animal',
      new Phaser.Geom.Circle(this.animalSprite.width / 2, this.animalSprite.height / 2, 130 * k),
      Phaser.Geom.Circle.Contains);

    // The bubble shows what the request is about: the kind of thing wanted (with its
    // numeral for a counting request), a picture of a word, or a pile to count.
    // It never shows the answer itself: a letter, a side or a numeral to be found.
    const { art, numeral, count, emoji: picture } = this.request.bubble;
    const bubble = this.add.graphics().setDepth(3);
    bubble.fillStyle(0xffffff, 1).fillRoundedRect(105, 40, 280, 170, 40);
    bubble.fillTriangle(250, 205, 300, 205, 290, 250);
    bubble.lineStyle(5, 0x5b4636, 1).strokeRoundedRect(105, 40, 280, 170, 40);
    const hasNumeral = numeral !== undefined;
    this.bubbleNumber = this.add.text(180, 125, '', numberStyle(130)).setOrigin(0.5).setDepth(3);
    if (count !== undefined) {
      // A pile to count: rows of five, like fingers on a hand.
      const size = 46;
      const rows = Math.ceil(count / 5);
      for (let i = 0; i < count; i++) {
        const inRow = Math.min(5, count - Math.floor(i / 5) * 5);
        const x = 245 + ((i % 5) - (inRow - 1) / 2) * (size + 5);
        const y = 125 + (Math.floor(i / 5) - (rows - 1) / 2) * (size + 12);
        this.add.image(x, y, art).setDisplaySize(size, size).setDepth(3);
      }
    } else if (picture) {
      emoji(this, 245, 125, picture, 104).setDepth(3);
    } else {
      this.add.image(hasNumeral ? 305 : 245, 125, art).setDisplaySize(118, 118).setDepth(3);
    }
  }

  // ---------- the request ----------

  async begin() {
    this.in.lock();
    await wait(this, 350);
    await this.sayRequest();
    this.in.unlock();
    this.resetIdle();
  }

  async sayRequest() {
    bounce(this, this.animalSprite);
    const { numeral } = this.request.bubble;
    if (numeral !== undefined) {
      // The numeral appears as it is said, so the sound and the symbol arrive together.
      this.bubbleNumber.setText(String(numeral));
      this.tweens.add({ targets: this.bubbleNumber, scale: { from: 0.3, to: 1 }, duration: 260, ease: 'Back.out' });
    }
    if (this.request.cue) this.sfx[this.request.cue]?.();
    await this.audio.say(this.request.say, this.request.tts);
  }

  async repeatRequest(fromTimer = false) {
    if (this.in.locked) return;
    this.in.lock();
    await this.sayRequest();
    this.in.unlock();
    this.resetIdle(fromTimer);
  }

  /** Restart the "say it again" timer. Called with `true` only by the timer itself. */
  resetIdle(fromTimer = false) {
    if (!fromTimer) this.idleRepeats = 0;
    this.idleTimer?.remove();
    // If he has walked away, the animal must not nag an empty room forever.
    if (this.idleRepeats >= IDLE_REPEATS_MAX) return;
    this.idleTimer = this.time.delayedCall(IDLE_MS, () => {
      if (this.in.locked) return this.resetIdle(true);
      this.idleRepeats++;
      this.repeatRequest(true);
    });
  }

  // ---------- what the boards call ----------

  sayNumber(n) {
    return this.audio.say([`num-${n}`], numberWord(n));
  }

  /** Mastery counts the first try only, so only the first answer is recorded. */
  judge(right) {
    if (this.judged) return;
    this.judged = true;
    this.state.mastery = recordAnswer(this.state.mastery, this.request.itemId, right);
    this.registry.get('store').save(this.state);
  }

  /** Drive the truck to x. `riders` are loose things that travel with it. */
  async drive(x, riders = []) {
    const dx = x - this.truck.x;
    if (Math.abs(dx) < 1) return;
    const duration = Phaser.Math.Clamp(Math.abs(dx) * 1.7, 320, 720);
    this.sfx.engine(duration / 1000);
    if (riders.length > 0) this.tweens.add({ targets: riders, x: `+=${dx}`, duration, ease: 'Sine.inOut' });
    await tween(this, { targets: this.truck, x, duration, ease: 'Sine.inOut' });
  }

  /** The delivery was right: celebrate, remember it, and go back to the farm. */
  async finish() {
    this.judge(true);
    this.idleTimer?.remove();

    this.sfx.cheer();
    for (const x of [300, 640, 980]) this.confetti.explode(40, x, 420);
    this.tweens.add({ targets: this.animalSprite, y: ANIMAL.y - 50, duration: 170, yoyo: true, repeat: 2, ease: 'Quad.out' });
    const dance = tween(this, { targets: this.truck, angle: { from: -6, to: 6 }, duration: 130, yoyo: true, repeat: 4 })
      .then(() => this.truck.setAngle(0));

    await this.audio.say(['thank-you'], 'Thank you!');
    const praise = Phaser.Utils.Array.GetRandom(PRAISE);
    await Promise.all([dance, this.audio.say(praise.say, praise.tts)]);
    this.sfx.beepBoop();
    await wait(this, 250);

    // Every delivery earns one small thing for the home farm.
    const gift = earnSmall(this.state.farm, this.registry.get('content').small);
    if (gift) await this.showGift(gift);

    this.state.skillLog.push(this.request.skill);
    this.state.lastItem[this.request.skill] = this.request.itemId;
    // What he delivered stays on the farm for the rest of the day.
    this.state.today.push(this.board.delivered());
    this.registry.get('store').save(this.state);
    const done = isDayDone(this.state.today, this.state.settings.deliveriesPerDay);
    this.scene.start(done ? 'Sunset' : 'Farm');
  }

  /** The small reward pops up, then flies off toward the house button on the next screen. */
  async showGift(gift) {
    const picture = emoji(this, 640, 300, gift.emoji, 150).setDepth(25).setScale(0);
    this.sfx.pop(6);
    await tween(this, { targets: picture, scale: 1, duration: 320, ease: 'Back.out' });
    await wait(this, 450);
    await tween(this, { targets: picture, x: 100, y: 105, scale: 0.3, duration: 420, ease: 'Quad.in' });
    picture.destroy();
  }

  // ---------- actions ----------

  onTap(id) {
    this.resetIdle();
    if (id === 'animal') return this.repeatRequest();
    this.board.onTap(id);
  }

  onMoveFocus(dir) {
    this.resetIdle();
    this.focus = moveFocus(this.focus, dir, this.board.focusables().length);
    this.drawFocus();
  }

  onGo() {
    this.resetIdle();
    const list = this.board.focusables();
    if (this.focus < 0 || this.focus >= list.length) {
      // The first press only shows where the highlight is, so nothing happens by surprise.
      this.focus = moveFocus(-1, 1, list.length);
      return this.drawFocus();
    }
    this.onTap(list[this.focus].id);
  }

  /** After something leaves the board, keep the highlight on something that still exists. */
  refreshFocus() {
    if (this.focus < 0) return;
    this.focus = Math.min(this.focus, this.board.focusables().length - 1);
    this.drawFocus();
  }

  drawFocus() {
    drawFocusRing(this.focusRing, this.board.focusables()[this.focus]);
  }

  hideFocus() {
    this.focusRing.setVisible(false);
  }
}
