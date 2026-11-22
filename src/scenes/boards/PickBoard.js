import Phaser from 'phaser';
import { ANIMAL, TRUCK_AT_ANIMAL_X, SIDE_COLOR, HINT_COLOR } from '../layout.js';
import { numberStyle, tween, bounce } from '../ui.js';

// The "pick" answer: 2 to 4 things on a table, one is right. One tap answers:
// the truck fetches that thing and takes it to the animal.

const POSITIONS = {
  2: [540, 980],
  3: [500, 790, 1080],
  4: [470, 690, 910, 1130],
};
const TABLE_Y = 440;
// Where a carried thing rides, relative to the truck's centre, at half size.
const CARRY = { x: 85, y: -60, scale: 0.5 };
const DROP = { x: ANIMAL.x + 175, y: ANIMAL.y + 95 };

export class PickBoard {
  // Midway between the two outer things, so "left" and "right" are either side of the robot.
  static TRUCK_HOME_X = 760;

  constructor(scene, request) {
    this.s = scene;
    this.answer = request.answer;
    const count = Math.min(4, this.answer.choices.length);
    const size = count > 3 ? 185 : 210;
    const y = TABLE_Y - size / 2 - 4;

    this.drawTable();
    this.choices = this.answer.choices.slice(0, count).map((choice, i) => {
      const x = POSITIONS[count][i];
      // A thing on a side always hints in that side's colour; anything else hints in yellow.
      const color = SIDE_COLOR[choice.side] ?? HINT_COLOR;
      const glow = scene.add.graphics().setDepth(1.5).setVisible(false);
      glow.fillStyle(color, 0.9).fillCircle(x, y, size / 2 + 34);
      scene.tweens.add({ targets: glow, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });

      const image = scene.add.image(0, 0, choice.art).setDisplaySize(size, size);
      const obj = scene.add.container(x, y, [image]).setDepth(6);
      if (choice.label) {
        obj.add(scene.add.text(0, 0, choice.label, numberStyle(size * 0.55)).setOrigin(0.5));
      }
      const half = size / 2 + 15;
      scene.in.tappable(obj, `choice:${i}`,
        new Phaser.Geom.Rectangle(-half, -half, half * 2, half * 2), Phaser.Geom.Rectangle.Contains);

      obj.setScale(0);
      scene.tweens.add({ targets: obj, scale: 1, duration: 260, delay: i * 90, ease: 'Back.out' });
      return { ...choice, x, y, size, obj, image, glow, color };
    });
  }

  drawTable() {
    const g = this.s.add.graphics().setDepth(1);
    g.fillStyle(0x6b4423, 1);
    for (const x of [400, 780, 1160]) g.fillRoundedRect(x, TABLE_Y, 26, 120, 8);
    g.fillStyle(0xb9793f, 1).fillRoundedRect(360, TABLE_Y - 6, 880, 30, 12);
    g.fillStyle(0x8d5a2b, 1).fillRoundedRect(360, TABLE_Y + 14, 880, 10, 5);
  }

  // ---------- what the scene asks of a board ----------

  focusables() {
    return this.choices.map((c, i) => ({ id: `choice:${i}`, x: c.x, y: c.y, r: c.size / 2 + 12 }));
  }

  onTap(id) {
    if (id.startsWith('choice:')) this.choose(Number(id.slice(7)));
  }

  /** Answer buttons 1 to 4 on the button box, counted from the left. */
  pickIndex(i) {
    if (i < this.choices.length) this.choose(i);
  }

  // ---------- answering ----------

  async choose(i) {
    const { s } = this;
    const choice = this.choices[i];
    const right = choice.id === this.answer.correct;

    s.in.lock();
    s.hideFocus();
    this.choices.forEach((c) => c.glow.setVisible(false));
    s.judge(right);
    s.sfx.pop(1);

    // Fetch it: drive under the thing, let it hop into the bed, take it to the animal.
    await s.drive(choice.x - CARRY.x);
    await this.hop(choice.obj, s.truck.x + CARRY.x, s.truck.y + CARRY.y, CARRY.scale);
    await s.drive(TRUCK_AT_ANIMAL_X, [choice.obj]);

    if (right) {
      await this.hop(choice.obj, DROP.x, DROP.y, CARRY.scale);
      return s.finish();
    }

    // Wrong: say what this one was, take it back, then ask again.
    s.misses++;
    s.sfx.oops();
    if (choice.side) {
      choice.image.setTint(choice.color);
      s.sfx[choice.side]?.();
    }
    bounce(s, s.animalSprite);
    await s.audio.say(choice.wrong.say, choice.wrong.tts);
    choice.image.clearTint();

    await s.drive(choice.x - CARRY.x, [choice.obj]);
    await this.hop(choice.obj, choice.x, choice.y, 1);
    await s.drive(s.truckHomeX);

    // After two misses the right one glows.
    if (s.misses >= 2) this.choices.find((c) => c.id === this.answer.correct).glow.setVisible(true);
    await s.sayRequest();
    s.in.unlock();
    s.resetIdle();
  }

  async hop(obj, x, y, scale) {
    const top = Math.min(obj.y, y) - 90;
    this.s.tweens.add({ targets: obj, scale, duration: 340 });
    this.s.tweens.add({ targets: obj, x, duration: 340, ease: 'Sine.inOut' });
    await tween(this.s, { targets: obj, y: top, duration: 170, ease: 'Quad.out' });
    await tween(this.s, { targets: obj, y, duration: 170, ease: 'Quad.in' });
  }
}
