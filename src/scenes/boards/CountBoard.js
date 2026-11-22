import Phaser from 'phaser';
import { judgeCount, sendGlows, correctionLine } from '../../skills/count.js';
import { BASKET, TRUCK_AT_ANIMAL_X, ANIMAL, HINT_COLOR } from '../layout.js';
import { makePlayButton, tween, wait, bounce, popNumber } from '../ui.js';

// The "count" answer: a pile of identical things. Each tap loads one into the truck
// while the voice counts it, and the green button sends the truck.

const SEND = { x: 1140, y: 580, radius: 92 };
const PILE_MAX = 12;

/** Where the things sit, left to right. Small piles get bigger targets. */
function spotsFor(available) {
  if (available <= 7) {
    return {
      size: 130,
      hit: 80,
      spots: [
        { x: 560, y: 130 }, { x: 645, y: 290 }, { x: 730, y: 130 }, { x: 815, y: 290 },
        { x: 900, y: 130 }, { x: 985, y: 290 }, { x: 1070, y: 130 },
      ].slice(0, available),
    };
  }
  const spots = [];
  for (let i = 0; i < Math.min(available, 12); i++) {
    spots.push({ x: 500 + Math.floor(i / 2) * 118, y: i % 2 === 0 ? 130 : 285 });
  }
  return { size: 104, hit: 58, spots };
}

/** Where loaded things sit, relative to the truck's centre. */
function bedSlotsFor(available) {
  if (available <= 7) {
    return {
      size: 68,
      slots: [
        { x: -6, y: -42 }, { x: 56, y: -42 }, { x: 118, y: -42 }, { x: 180, y: -42 },
        { x: 25, y: -94 }, { x: 87, y: -94 }, { x: 149, y: -94 },
      ],
    };
  }
  const slots = [];
  [[5, -18, -36], [4, 8, -80], [3, 34, -124]].forEach(([n, x0, y]) => {
    for (let i = 0; i < n; i++) slots.push({ x: x0 + i * 52, y });
  });
  return { size: 54, slots };
}

export class CountBoard {
  static TRUCK_HOME_X = 700;

  constructor(scene, request) {
    this.s = scene;
    this.answer = request.answer;
    this.art = request.answer.item;
    this.layout = spotsFor(this.answer.available);
    this.bed = bedSlotsFor(this.answer.available);
    this.loaded = []; // spot index of each loaded thing, in the order he loaded them
    this.bedThings = [];
    this.pile = [];

    this.drawSource();
    this.buildThings();
    this.buildTruckParts();
    this.buildSendButton();
    this.basket = scene.add.image(BASKET.x, BASKET.y, 'basket').setDisplaySize(160, 110).setDepth(4);
    this.refresh();
  }

  // ---------- building ----------

  /** Apples hang on a tree; everything else sits in a garden bed. */
  drawSource() {
    const g = this.s.add.graphics().setDepth(1);
    if (this.art === 'apple') {
      g.fillStyle(0x8d5a2b, 1).fillRoundedRect(775, 330, 80, 150, 16);
      g.fillStyle(0x6b4423, 1).fillRoundedRect(775, 330, 22, 150, 10);
      g.fillStyle(0x2e7d32, 1).fillEllipse(815, 215, 760, 400);
      g.fillStyle(0x43a047, 1).fillEllipse(815, 200, 730, 370);
      g.fillStyle(0x4caf50, 1);
      for (const [x, y, w, h] of [[560, 120, 260, 180], [815, 90, 300, 170], [1070, 120, 260, 180], [690, 290, 280, 160], [940, 290, 280, 160]]) {
        g.fillEllipse(x, y, w, h);
      }
      return;
    }
    g.fillStyle(0x6b4423, 1).fillRoundedRect(440, 34, 750, 356, 40);
    g.fillStyle(0x8d5a2b, 1).fillRoundedRect(452, 46, 726, 332, 32);
    g.fillStyle(0x7a4b22, 1);
    for (const y of [200, 364]) g.fillRoundedRect(472, y, 686, 12, 6);
  }

  buildThings() {
    const { size, hit, spots } = this.layout;
    this.things = spots.map((spot, i) => {
      const thing = this.s.add.image(spot.x, spot.y, this.art).setDisplaySize(size, size).setDepth(2);
      // The hit circle is in texture pixels, which are larger than the drawn size.
      const k = thing.width / size;
      this.s.in.tappable(thing, `thing:${i}`,
        new Phaser.Geom.Circle(thing.width / 2, thing.height / 2, hit * k), Phaser.Geom.Circle.Contains);
      thing.baseScale = thing.scale;
      thing.setScale(0);
      this.s.tweens.add({ targets: thing, scale: thing.baseScale, duration: 260, delay: i * 40, ease: 'Back.out' });
      return thing;
    });
  }

  buildTruckParts() {
    const { s } = this;
    // Tapping the bed takes the last thing out. One big target beats many small ones.
    s.in.tappable(s.truck, 'truck', new Phaser.Geom.Rectangle(-70, -170, 300, 220), Phaser.Geom.Rectangle.Contains);
    // No running total is shown on the truck. With a numeral there, he could match it
    // to the numeral in the animal's bubble and never count.
  }

  buildSendButton() {
    const { s } = this;
    this.sendGlow = s.add.graphics().setDepth(7).setVisible(false);
    this.sendGlow.fillStyle(HINT_COLOR, 0.9).fillCircle(SEND.x, SEND.y, SEND.radius + 26);
    s.tweens.add({ targets: this.sendGlow, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });

    this.sendButton = makePlayButton(s, SEND.x, SEND.y, SEND.radius).setDepth(8);
    s.in.tappable(this.sendButton, 'send',
      new Phaser.Geom.Circle(0, 0, SEND.radius + 16), Phaser.Geom.Circle.Contains);
  }

  // ---------- what the scene asks of a board ----------

  /** Things the highlight can land on, left to right, with the send button last. */
  focusables() {
    const things = this.things
      .map((t, i) => ({ id: `thing:${i}`, x: t.x, y: t.y, r: this.layout.hit, visible: t.visible }))
      .filter((t) => t.visible);
    return [...things, { id: 'send', x: SEND.x, y: SEND.y, r: SEND.radius + 14 }];
  }

  /** What this delivery leaves in the day's row on the farm. */
  delivered() {
    return { art: this.art, numeral: this.answer.target };
  }

  onTap(id) {
    if (id === 'send') return this.send();
    if (id === 'truck') return this.unload();
    if (id.startsWith('thing:')) return this.load(Number(id.slice(6)));
  }

  // ---------- loading ----------

  load(i) {
    const { s } = this;
    const thing = this.things[i];
    if (!thing.visible || this.loaded.length >= this.bed.slots.length) return;

    const slot = this.bed.slots[this.loaded.length];
    const size = this.bed.size;
    this.loaded.push(i);
    const n = this.loaded.length;

    thing.setVisible(false);
    thing.input.enabled = false;

    // The one in the bed exists right away (hidden), so the count is never out of
    // step with the picture even if he taps faster than things fly.
    const inBed = s.add.image(slot.x, slot.y, this.art).setDisplaySize(size, size).setVisible(false);
    s.truck.add(inBed);
    this.bedThings.push(inBed);

    const flyer = s.add.image(thing.x, thing.y, this.art)
      .setDisplaySize(this.layout.size, this.layout.size).setDepth(10);
    s.tweens.add({
      targets: flyer,
      x: s.truck.x + slot.x,
      y: s.truck.y + slot.y,
      displayWidth: size,
      displayHeight: size,
      duration: 240,
      ease: 'Quad.in',
      onComplete: () => {
        flyer.destroy();
        if (inBed.active) inBed.setVisible(true);
      },
    });

    s.sfx.pop(n);
    s.sayNumber(n);
    this.refresh();
    s.refreshFocus();
  }

  unload() {
    const { s } = this;
    if (this.loaded.length === 0) return;
    const i = this.loaded.pop();
    this.bedThings.pop().destroy();

    const thing = this.things[i];
    thing.setVisible(true).setScale(0);
    thing.input.enabled = true;
    s.tweens.add({ targets: thing, scale: thing.baseScale, duration: 220, ease: 'Back.out' });

    s.sfx.drop();
    // Hearing the new total tells him whether "take one out" has worked.
    if (this.loaded.length > 0) s.sayNumber(this.loaded.length);
    else s.audio.stop();
    this.refresh();
    s.refreshFocus();
  }

  refresh() {
    const loaded = this.loaded.length;
    this.sendButton.setAlpha(loaded > 0 ? 1 : 0.45);
    this.sendGlow.setVisible(sendGlows(this.s.misses, loaded, this.answer.target));
  }

  // ---------- sending ----------

  async send() {
    const { s } = this;
    const loaded = this.loaded.length;
    if (loaded === 0) {
      // An empty truck is not a mistake, just a reminder of what is wanted.
      s.sfx.oops();
      return s.repeatRequest();
    }

    s.in.lock();
    s.hideFocus();
    this.sendGlow.setVisible(false);
    const { target } = this.answer;
    const verdict = judgeCount(target, loaded);
    s.judge(verdict === 'right');

    await wait(s, 260); // let the last one land
    await s.drive(TRUCK_AT_ANIMAL_X);

    if (verdict === 'right') {
      await this.deliver();
      return s.finish();
    }

    s.misses++;
    if (verdict === 'few') {
      // Count what arrived out loud, so he hears and sees where it stops short.
      for (let n = 1; n <= loaded; n++) {
        const thing = this.bedThings[n - 1];
        bounce(s, thing, -18);
        popNumber(s, s.truck.x + thing.x, s.truck.y + thing.y - 80, n);
        await s.sayNumber(n);
      }
    } else {
      s.sfx.oops();
      tween(s, { targets: s.truck, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: 2 })
        .then(() => s.truck.setAngle(0));
    }
    const line = correctionLine(target, loaded);
    bounce(s, s.animalSprite);
    await s.audio.say(line.say, line.tts);

    await s.drive(s.truckHomeX);
    this.refresh();
    s.in.unlock();
    s.resetIdle();
  }

  /** Things hop into the basket one at a time while the animal counts them. */
  async deliver() {
    const { s } = this;
    const size = this.bed.size;
    for (let n = 1; n <= this.bedThings.length; n++) {
      popNumber(s, ANIMAL.x - 130, ANIMAL.y - 70, n);
      const inBed = this.bedThings[n - 1];
      const from = { x: s.truck.x + inBed.x, y: s.truck.y + inBed.y };
      inBed.destroy();

      const to = pileSpot(n - 1);
      const hop = s.add.image(from.x, from.y, this.art).setDisplaySize(size, size).setDepth(10);
      s.sfx.pop(n);
      s.tweens.add({ targets: hop, y: Math.min(from.y, to.y) - 150, duration: 170, yoyo: true, ease: 'Quad.out' });
      const landed = tween(s, { targets: hop, x: to.x, duration: 340, ease: 'Linear' }).then(() => {
        hop.setPosition(to.x, to.y).setDisplaySize(46, 46).setDepth(3.5);
        this.pile.push(hop);
      });
      await Promise.all([landed, s.sayNumber(n)]);
    }
    this.bedThings = [];
    this.loaded = [];
  }
}

/** Where delivered thing number `i` rests on the basket: rows of 4, stacking upward. */
function pileSpot(i) {
  const slot = i % PILE_MAX;
  const row = Math.floor(slot / 4);
  const col = slot % 4;
  return { x: BASKET.x - 51 + col * 34 + (row % 2) * 12, y: BASKET.y - 46 - row * 30 };
}
