import Phaser from 'phaser';
import { createInput, ACTIONS } from '../systems/input.js';
import { placeFromBox, moveThing, putAway, freeSpot, wearOptions, setWear, ownedUpgrades, FIELD } from '../systems/home.js';
import { drawHomeBackdrop, drawUpgrades, depthAt } from './homeUpgrades.js';
import { makeTruck, makePlayButton, emoji, tween } from './ui.js';

// The shelf along the bottom: things waiting in the gift box, then the buttons.
const SHELF = { y: 668, top: 618 };
const BOX_SLOTS = 6;
const slotX = (i) => 100 + i * 112;
const PAINT_BUTTON = { x: 905, y: SHELF.y };
const HAT_BUTTON = { x: 1020, y: SHELF.y };
const GO_BUTTON = { x: 1185, y: SHELF.y };
const TRUCK = { x: 1075, y: 470, scale: 0.72 };
// Dropping a thing lower than this puts it back in the gift box.
const PUT_AWAY_BELOW = 608;
const DRAG_DEPTH = 1000;
// The row of choices that opens above the paint or hat button.
const PICKER = { y: 540, slot: 104, size: 74 };
const PLAIN_GREEN = { type: 'paint', value: '#4caf50' };
const RAINBOW = [0xef4444, 0xf59e0b, 0xfde047, 0x22c55e, 0x3b82f6, 0xa855f7];

const sizeOf = (item) => (item.id.startsWith('small-') ? 66 : 96);

/**
 * The home farm: free play. Everything he has earned ends up here. Small things
 * and friends wait on the shelf until he taps them onto the farm, then he can
 * drag them wherever he likes. Upgrades are part of the farm itself.
 */
export class Home extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create() {
    this.sfx = this.registry.get('sfx');
    this.state = this.registry.get('state');
    this.farm = this.state.farm;
    this.store = this.registry.get('store');
    const content = this.registry.get('content');
    this.rewards = content.rewards;
    this.items = new Map([...content.rewards, ...content.small].map((r) => [r.id, r]));
    this.in = createInput(this);
    this.things = new Map(); // key → { thing (the saved record), obj (its picture) }
    this.nextKey = 0;
    this.shelfObjects = [];

    // Leaving and coming back must not lose where he put things.
    this.events.once('shutdown', () => this.store.save(this.state));

    drawHomeBackdrop(this);
    // Empty ground counts as a tap too, so tapping away from an open picker closes it.
    this.in.tappable(this.add.zone(640, 360, 1280, 720).setDepth(0.1), 'ground');
    drawUpgrades(this, ownedUpgrades(this.farm, this.rewards));
    this.buildShelf();
    this.buildTruck();
    for (const thing of this.farm.placed) this.addThing(thing);
    this.renderBox();

    this.in.on(ACTIONS.TAP, (id) => this.onTap(id));
    this.in.on(ACTIONS.DRAG, (drag) => this.onDrag(drag));
    this.in.on(ACTIONS.DROP, (drop) => this.onDrop(drop));
    this.in.on(ACTIONS.GO, () => this.leave());
  }

  // ---------- building ----------

  buildShelf() {
    const g = this.add.graphics().setDepth(500);
    g.fillStyle(0x8d5a2b, 1).fillRoundedRect(20, SHELF.top, 1240, 96, 22);
    g.fillStyle(0xb9793f, 1).fillRoundedRect(20, SHELF.top, 1240, 84, 22);
    g.fillStyle(0xc98f4a, 1).fillRoundedRect(34, SHELF.top + 10, 760, 64, 16);

    const owns = (type) => this.rewards.some((r) => r.type === type && this.farm.rewards.includes(r.id));
    if (owns('paint')) this.addButton('paint', PAINT_BUTTON, '🎨');
    if (owns('hat')) this.addButton('hat', HAT_BUTTON, '🎩');

    // The way back to the animals.
    const go = makePlayButton(this, GO_BUTTON.x, GO_BUTTON.y, 42).setDepth(600);
    this.in.tappable(go, 'go', new Phaser.Geom.Circle(0, 0, 62), Phaser.Geom.Circle.Contains);
    this.tweens.add({ targets: go, scale: 1.07, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  addButton(id, at, picture) {
    const disc = this.add.graphics();
    disc.fillStyle(0xfff6e0, 1).fillCircle(0, 0, 44);
    disc.lineStyle(5, 0x6b4423, 1).strokeCircle(0, 0, 44);
    const button = this.add.container(at.x, at.y, [disc, emoji(this, 0, 0, picture, 50)]).setDepth(600);
    this.in.tappable(button, id, new Phaser.Geom.Circle(0, 0, 56), Phaser.Geom.Circle.Contains);
    return button;
  }

  buildTruck() {
    this.truck?.destroy();
    this.truck = makeTruck(this, TRUCK.x, TRUCK.y).setScale(TRUCK.scale).setDepth(depthAt(TRUCK.y + 70));
    this.in.tappable(this.truck, 'truck', new Phaser.Geom.Rectangle(-220, -130, 440, 250), Phaser.Geom.Rectangle.Contains);
  }

  /** Stand one saved thing on the farm. */
  addThing(thing) {
    const item = this.items.get(thing.item);
    if (!item) return null;
    const size = sizeOf(item);
    const obj = emoji(this, thing.x, thing.y, item.emoji, size).setDepth(depthAt(thing.y + size / 2));
    const key = `thing:${this.nextKey++}`;
    const half = Math.max(60, size * 0.62);
    this.in.draggable(obj, key,
      new Phaser.Geom.Rectangle(obj.width / 2 - half, obj.height / 2 - half, half * 2, half * 2),
      Phaser.Geom.Rectangle.Contains);
    this.things.set(key, { thing, obj, size });
    return obj;
  }

  /** Show what is waiting in the gift box, oldest first. */
  renderBox() {
    this.shelfObjects.forEach((o) => o.destroy());
    this.shelfObjects = [];
    this.farm.box.slice(0, BOX_SLOTS).forEach((id, i) => {
      const item = this.items.get(id);
      if (!item) return;
      const obj = emoji(this, slotX(i), SHELF.y - 6, item.emoji, 70).setDepth(600);
      this.in.tappable(obj, `box:${i}`,
        new Phaser.Geom.Rectangle(obj.width / 2 - 54, obj.height / 2 - 50, 108, 100), Phaser.Geom.Rectangle.Contains);
      // New things bob gently: "tap me".
      this.tweens.add({ targets: obj, y: obj.y - 8, duration: 500, yoyo: true, repeat: -1, delay: i * 120, ease: 'Sine.inOut' });
      this.shelfObjects.push(obj);
    });
    // More are waiting than fit: three dots, and they move up as he places things.
    if (this.farm.box.length > BOX_SLOTS) {
      const dots = this.add.graphics().setDepth(600);
      dots.fillStyle(0x6b4423, 1);
      for (let i = 0; i < 3; i++) dots.fillCircle(756 + i * 14, SHELF.y - 6, 5);
      this.shelfObjects.push(dots);
    }
  }

  // ---------- actions ----------

  onTap(id) {
    // A choice from the open picker.
    if (id.startsWith('wear:')) {
      const [, type, choice] = id.split(':');
      return this.wear(type, choice === 'none' ? null : choice);
    }
    // Tapping its own button again, or anything else, closes an open picker.
    const wasOpen = this.picker?.type;
    this.closePicker();
    if (id === 'paint' || id === 'hat') return void (wasOpen === id || this.openPicker(id));
    if (id === 'go') return this.leave();
    if (id === 'truck') return this.wiggle(this.truck, this.sfx.honk);
    if (id.startsWith('box:')) return this.place(Number(id.slice(4)));
    const entry = this.things.get(id);
    if (entry) this.wiggle(entry.obj, () => this.sfx.pop(3));
  }

  /** Tap something on the shelf: it hops onto the farm. */
  place(boxIndex) {
    const spot = freeSpot(this.farm);
    const thing = placeFromBox(this.farm, boxIndex, spot.x, spot.y);
    if (!thing) return;
    this.store.save(this.state);
    this.sfx.pop(4);

    const obj = this.addThing(thing);
    this.renderBox();
    if (!obj) return;
    // It jumps up from its place on the shelf and lands on the farm.
    obj.setPosition(slotX(boxIndex), SHELF.y - 6).setDepth(DRAG_DEPTH);
    this.tweens.add({ targets: obj, x: thing.x, duration: 420, ease: 'Sine.inOut' });
    this.tweens.add({
      targets: obj, y: thing.y, duration: 420, ease: 'Back.out',
      onComplete: () => obj.setDepth(depthAt(thing.y + obj.height / 4)),
    });
  }

  onDrag({ id, x, y }) {
    const entry = this.things.get(id);
    if (!entry) return;
    this.closePicker();
    this.tweens.killTweensOf(entry.obj);
    entry.obj.setAngle(0).setDepth(DRAG_DEPTH);
    // It may be dragged down over the shelf, which is how it is put away.
    entry.obj.setPosition(
      Phaser.Math.Clamp(x, FIELD.left, FIELD.right),
      Phaser.Math.Clamp(y, FIELD.top, SHELF.y),
    );
  }

  onDrop({ id }) {
    const entry = this.things.get(id);
    if (!entry) return;
    const { thing, obj, size } = entry;
    if (obj.y > PUT_AWAY_BELOW) {
      putAway(this.farm, thing);
      obj.destroy();
      this.things.delete(id);
      this.sfx.drop();
      this.renderBox();
    } else {
      moveThing(thing, obj.x, obj.y);
      obj.setPosition(thing.x, thing.y).setDepth(depthAt(thing.y + size / 2));
      this.sfx.pop(2);
    }
    this.store.save(this.state);
  }

  /**
   * Tap the palette or the hat: every one he owns opens in a row above the button,
   * with "none" first, and he taps the one he wants.
   */
  openPicker(type) {
    const options = wearOptions(this.farm, this.rewards, type);
    const button = type === 'paint' ? PAINT_BUTTON : HAT_BUTTON;
    const width = options.length * PICKER.slot + 24;
    const left = Phaser.Math.Clamp(button.x - width / 2, 30, 1250 - width);

    const panel = this.add.graphics().setDepth(700);
    panel.fillStyle(0xfff6e0, 1).fillRoundedRect(left, PICKER.y - 58, width, 116, 26);
    panel.lineStyle(6, 0x6b4423, 1).strokeRoundedRect(left, PICKER.y - 58, width, 116, 26);
    panel.fillStyle(0xfff6e0, 1).fillTriangle(button.x - 18, PICKER.y + 56, button.x + 18, PICKER.y + 56, button.x, PICKER.y + 80);
    const objects = [panel];

    options.forEach((reward, i) => {
      const x = left + 12 + PICKER.slot / 2 + i * PICKER.slot;
      // The one he is wearing now has a ring round it.
      if ((reward?.id ?? null) === (this.farm[type] ?? null)) {
        const ring = this.add.graphics().setDepth(700);
        ring.lineStyle(8, 0xf59e0b, 1).strokeCircle(x, PICKER.y, PICKER.slot / 2 - 3);
        objects.push(ring);
      }
      // "None" is the plain green truck, or a crossed-out circle for no hat.
      const picture = type === 'paint'
        ? this.colourDisc(x, PICKER.y, (reward ?? PLAIN_GREEN).value)
        : emoji(this, x, PICKER.y, reward?.emoji ?? '🚫', PICKER.size - 10);
      picture.setDepth(701);
      const half = PICKER.slot / 2;
      const area = picture.type === 'Text'
        ? new Phaser.Geom.Rectangle(picture.width / 2 - half, picture.height / 2 - half, half * 2, half * 2)
        : new Phaser.Geom.Rectangle(-half, -half, half * 2, half * 2);
      this.in.tappable(picture, `wear:${type}:${reward?.id ?? 'none'}`, area, Phaser.Geom.Rectangle.Contains);
      picture.setScale(0);
      this.tweens.add({ targets: picture, scale: 1, duration: 180, delay: i * 40, ease: 'Back.out' });
      objects.push(picture);
    });

    this.sfx.pop(4);
    this.picker = { type, objects };
  }

  /** A paint choice: a big disc of the colour itself, which reads faster than a pot. */
  colourDisc(x, y, value) {
    const r = PICKER.size / 2 - 2;
    const g = this.add.graphics();
    if (value === 'rainbow') {
      RAINBOW.forEach((colour, i) => {
        g.fillStyle(colour, 1);
        g.slice(0, 0, r, (i / RAINBOW.length) * Math.PI * 2, ((i + 1) / RAINBOW.length) * Math.PI * 2, false);
        g.fillPath();
      });
    } else {
      g.fillStyle(parseInt(String(value).slice(1), 16) || 0x4caf50, 1).fillCircle(0, 0, r);
    }
    g.fillStyle(0xffffff, 0.35).fillEllipse(-r * 0.3, -r * 0.35, r * 0.6, r * 0.4);
    g.lineStyle(5, 0x2b2118, 1).strokeCircle(0, 0, r);
    return this.add.container(x, y, [g]);
  }

  closePicker() {
    this.picker?.objects.forEach((o) => o.destroy());
    this.picker = null;
  }

  wear(type, id) {
    this.closePicker();
    if (!setWear(this.farm, this.rewards, type, id)) return;
    this.store.save(this.state);
    this.sfx.pop(5);
    this.buildTruck();
    this.wiggle(this.truck);
  }

  wiggle(obj, sound) {
    sound?.call(this.sfx);
    this.tweens.killTweensOf(obj);
    obj.setAngle(0);
    this.tweens.add({ targets: obj, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => obj.setAngle(0) });
  }

  async leave() {
    this.in.lock();
    this.sfx.beepBoop();
    await tween(this, { targets: this.truck, x: this.truck.x - 60, duration: 220, ease: 'Sine.in' });
    this.scene.start('Farm');
  }
}
