import Phaser from 'phaser';
import { createInput, ACTIONS } from '../systems/input.js';
import { placeFromBox, moveThing, putAway, freeSpot, wearOptions, setWear, ownedUpgrades, FIELD } from '../systems/home.js';
import { drawHomeBackdrop, buildUpgrades, depthAt } from './homeUpgrades.js';
import { makeTruck, makePlayButton, emoji, tween } from './ui.js';

// The shelf along the bottom: things waiting to be placed, then the way back.
const SHELF = { y: 668, top: 618 };
const BOX_SLOTS = 8;
const slotX = (i) => 100 + i * 112;
const GO_BUTTON = { x: 1185, y: SHELF.y };
// The truck parks in front of where the garage goes.
const TRUCK = { x: 1010, y: 452, scale: 0.72 };
// Dropping a thing lower than this puts it back on the shelf.
const PUT_AWAY_BELOW = 608;
const DRAG_DEPTH = 1000;
// The wardrobe that opens from the garage: a row of paints and a row of hats.
const WARDROBE = { x: 640, slot: 104, size: 74, row: 112 };
const PLAIN_GREEN = '#4caf50';
const RAINBOW = [0xef4444, 0xf59e0b, 0xfde047, 0x22c55e, 0x3b82f6, 0xa855f7];

const sizeOf = (item) => (item.id.startsWith('small-') ? 66 : 96);

/**
 * The home farm: free play, and where every reward ends up. It starts as an empty
 * field. Big rewards are buildings that become part of it and do something when
 * tapped. Small rewards wait on the shelf until he taps them onto the farm, and
 * then he can drag them wherever he likes.
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
    this.allItems = [...content.rewards, ...content.small];
    this.items = new Map(this.allItems.map((r) => [r.id, r]));
    this.in = createInput(this);
    this.things = new Map(); // key → { thing (the saved record), obj (its picture), size }
    this.nextKey = 0;
    this.shelfObjects = [];
    this.wardrobe = null;

    // Leaving and coming back must not lose where he put things.
    this.events.once('shutdown', () => this.store.save(this.state));

    drawHomeBackdrop(this);
    // Empty ground counts as a tap too, so tapping away from the open wardrobe closes it.
    this.in.tappable(this.add.zone(640, 360, 1280, 720).setDepth(0.1), 'ground');

    // The buildings he has earned, each with its own tap toy.
    this.upgrades = new Map();
    const api = { sfx: this.sfx, openWardrobe: () => this.openWardrobe() };
    for (const upgrade of buildUpgrades(this, ownedUpgrades(this.farm, content.rewards), api)) {
      const { x, y, width, height } = upgrade.zone;
      const zone = this.add.zone(x + width / 2, y + height / 2, width, height).setDepth(upgrade.depth);
      this.in.tappable(zone, `up:${upgrade.id}`);
      this.upgrades.set(upgrade.id, upgrade);
    }

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
    g.fillStyle(0xc98f4a, 1).fillRoundedRect(34, SHELF.top + 10, 1020, 64, 16);

    // The way back to the animals.
    const go = makePlayButton(this, GO_BUTTON.x, GO_BUTTON.y, 42).setDepth(600);
    this.in.tappable(go, 'go', new Phaser.Geom.Circle(0, 0, 62), Phaser.Geom.Circle.Contains);
    this.tweens.add({ targets: go, scale: 1.07, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  buildTruck() {
    this.truck?.destroy();
    this.truck = makeTruck(this, TRUCK.x, TRUCK.y).setScale(TRUCK.scale).setDepth(depthAt(TRUCK.y + 70));
    this.in.tappable(this.truck, 'truck', new Phaser.Geom.Rectangle(-220, -130, 440, 250), Phaser.Geom.Rectangle.Contains);
  }

  /** Stand one saved thing on the farm. */
  addThing(thing) {
    const item = this.items.get(thing.item);
    if (!item?.emoji) return null;
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

  /** Show what is waiting on the shelf, oldest first. */
  renderBox() {
    this.shelfObjects.forEach((o) => o.destroy());
    this.shelfObjects = [];
    this.farm.box.slice(0, BOX_SLOTS).forEach((id, i) => {
      const item = this.items.get(id);
      if (!item?.emoji) return;
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
      for (let i = 0; i < 3; i++) dots.fillCircle(1000 + i * 14, SHELF.y - 6, 5);
      this.shelfObjects.push(dots);
    }
  }

  // ---------- actions ----------

  onTap(id) {
    // A choice from the open wardrobe.
    if (id.startsWith('wear:')) {
      const [, type, choice] = id.split(':');
      return this.wear(type, choice === 'none' ? null : choice);
    }
    // Tapping anything else closes it.
    this.closeWardrobe();
    if (id.startsWith('up:')) return this.upgrades.get(id.slice(3))?.tap();
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
    this.closeWardrobe();
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

  // ---------- the wardrobe, opened from the garage ----------

  /**
   * Every paint and hat he owns, in two rows, with "none" first in each and the one
   * he is wearing ringed. He taps the one he wants.
   */
  openWardrobe() {
    this.closeWardrobe();
    const rows = ['paint', 'hat']
      .map((type) => ({ type, options: wearOptions(this.farm, this.allItems, type) }))
      // A row with only "none" in it has nothing to choose.
      .filter((row) => row.options.length > 1);
    if (rows.length === 0) return;

    const widest = Math.max(...rows.map((row) => row.options.length));
    const width = widest * WARDROBE.slot + 28;
    const height = rows.length * WARDROBE.row + 16;
    const left = WARDROBE.x - width / 2;
    const top = 470 - height;

    const panel = this.add.graphics().setDepth(700);
    panel.fillStyle(0xfff6e0, 1).fillRoundedRect(left, top, width, height, 26);
    panel.lineStyle(6, 0x6b4423, 1).strokeRoundedRect(left, top, width, height, 26);
    const objects = [panel];

    rows.forEach(({ type, options }, r) => {
      const y = top + 8 + WARDROBE.row / 2 + r * WARDROBE.row;
      options.forEach((item, i) => {
        const x = WARDROBE.x + (i - (options.length - 1) / 2) * WARDROBE.slot;
        if ((item?.id ?? null) === (this.farm[type] ?? null)) {
          const ring = this.add.graphics().setDepth(700);
          ring.lineStyle(8, 0xf59e0b, 1).strokeCircle(x, y, WARDROBE.slot / 2 - 3);
          objects.push(ring);
        }
        // "None" is the plain green truck, or a crossed-out circle for no hat.
        const picture = type === 'paint'
          ? this.colourDisc(x, y, item?.value ?? PLAIN_GREEN)
          : emoji(this, x, y, item?.emoji ?? '🚫', WARDROBE.size - 10);
        picture.setDepth(701);
        const half = WARDROBE.slot / 2;
        const area = picture.type === 'Text'
          ? new Phaser.Geom.Rectangle(picture.width / 2 - half, picture.height / 2 - half, half * 2, half * 2)
          : new Phaser.Geom.Rectangle(-half, -half, half * 2, half * 2);
        this.in.tappable(picture, `wear:${type}:${item?.id ?? 'none'}`, area, Phaser.Geom.Rectangle.Contains);
        picture.setScale(0);
        this.tweens.add({ targets: picture, scale: 1, duration: 180, delay: (r * 3 + i) * 35, ease: 'Back.out' });
        objects.push(picture);
      });
    });

    this.sfx.pop(4);
    this.wardrobe = { objects };
  }

  /** A paint choice: a big disc of the colour itself, which reads faster than a pot. */
  colourDisc(x, y, value) {
    const r = WARDROBE.size / 2 - 2;
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

  closeWardrobe() {
    this.wardrobe?.objects.forEach((o) => o.destroy());
    this.wardrobe = null;
  }

  wear(type, id) {
    this.closeWardrobe();
    if (!setWear(this.farm, this.allItems, type, id)) return;
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
