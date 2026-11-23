import Phaser from 'phaser';
import { createInput, ACTIONS } from '../systems/input.js';
import {
  placeFromBox, moveThing, putAway, freeSpot, wearOptions, setWear, ownedUpgrades, previousStage, boxFor, FIELD,
} from '../systems/home.js';
import { PAGES, HOME_PAGE, pageOf, pageX, farmPages, neighbour, livesOn, directionTo } from '../systems/farmPages.js';
import { drawHomeBackdrop, buildUpgrade, upgradeSpot, depthAt } from './homeUpgrades.js';
import { makeTruck, makeGoButton, makeConfetti, emoji, tween, wait } from './ui.js';
import { SIDE_COLOR } from './layout.js';

// The shelf along the bottom: things waiting to be placed, then the ways out.
const SHELF = { y: 668, top: 618 };
const BOX_SLOTS = 8;
const slotX = (i) => 100 + i * 112;
const GO_BUTTON = { x: 1185, y: SHELF.y };
// The house button drives straight back to the home page from anywhere.
const HOME_BUTTON = { x: 1062, y: SHELF.y, radius: 44 };
// The arrows stand at the two ends of the road. LEFT is blue and RIGHT is orange,
// as everywhere else in the game.
const ARROW = { x: { '-1': 78, 1: 1202 }, y: 520, radius: 62, hit: 78 };
// On every page the truck parks at the front right, which the buildings leave clear.
const TRUCK = { x: 960, y: 506, scale: 0.72 };
// Driving to the page next door, and how much longer each further page takes.
const DRIVE_MS = { first: 1300, more: 600 };
// Every so often a building gives a little hop, to show it can be played with.
const INVITE_MS = 6500;
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
 *
 * The farm is several pages side by side (see farmPages.js), and the view shows one
 * at a time. Everything on the farm is drawn in the wide world; the shelf and the
 * buttons are fixed to the screen. Tapping an arrow drives the truck to the page
 * next door, and the house button drives it home.
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
    // A scene object is reused each time the scene starts, so anything left on it
    // from the last visit points at things that no longer exist. Start clean.
    this.wardrobe = null;
    this.pointer = null;
    this.truck = null;
    this.shelf = [];
    this.arrows = {};
    this.homeButton = null;
    this.confetti = makeConfetti(this);
    // He always arrives at home, in the middle.
    this.pages = farmPages(this.farm, content.rewards);
    this.page = HOME_PAGE;
    this.cameras.main.setScroll(pageX(HOME_PAGE), 0);
    this.upgradePage = new Map(content.rewards.filter((r) => r.type === 'upgrade').map((r) => [r.value, pageOf(r)]));

    // Leaving and coming back must not lose where he put things.
    this.events.once('shutdown', () => this.store.save(this.state));

    drawHomeBackdrop(this);
    // Empty ground counts as a tap too, so tapping away from the open wardrobe closes it.
    this.in.tappable(this.add.zone(640, 360, 1280, 720).setScrollFactor(0).setDepth(0.1), 'ground');

    // The buildings he has earned, each with its own tap toy. If one has just been
    // earned, the farm is first shown as it was, and then it is built in front of him.
    this.upgrades = new Map();
    this.api = { sfx: this.sfx, openWardrobe: () => this.openWardrobe() };
    const owned = ownedUpgrades(this.farm, content.rewards);
    const fresh = this.registry.get('justBuilt');
    this.registry.set('justBuilt', null);
    const building = owned.includes(fresh) ? fresh : null;
    const before = building ? previousStage(this.farm, content.rewards, building) : null;
    for (const id of owned) {
      if (id !== building) this.addUpgrade(id);
    }
    if (before) this.addUpgrade(before);

    this.buildShelf();
    this.buildArrows();
    this.buildTruck();
    for (const thing of this.farm.placed) this.addThing(thing);
    this.renderBox();
    this.refreshNav();

    this.in.on(ACTIONS.TAP, (id) => this.onTap(id));
    this.in.on(ACTIONS.DRAG, (drag) => this.onDrag(drag));
    this.in.on(ACTIONS.DROP, (drop) => this.onDrop(drop));
    this.in.on(ACTIONS.GO, () => this.leave());
    this.in.on(ACTIONS.LEFT, () => this.go(neighbour(this.page, -1, this.pages)));
    this.in.on(ACTIONS.RIGHT, () => this.go(neighbour(this.page, 1, this.pages)));

    if (building) this.construct(building, before);
    this.time.addEvent({ delay: INVITE_MS, loop: true, callback: () => this.invite() });
  }

  // ---------- the buildings ----------

  /** Draw a building on the farm and make it tappable. */
  addUpgrade(id) {
    const page = this.upgradePage.get(id) ?? HOME_PAGE;
    const upgrade = buildUpgrade(this, id, this.api, pageX(page));
    if (!upgrade) return null;
    upgrade.page = page;
    const { x, y, width, height } = upgrade.zone;
    upgrade.hit = this.add.zone(x + width / 2, y + height / 2, width, height).setDepth(upgrade.depth);
    this.in.tappable(upgrade.hit, `up:${id}`);
    this.upgrades.set(id, upgrade);
    return upgrade;
  }

  removeUpgrade(id) {
    const upgrade = this.upgrades.get(id);
    if (!upgrade) return;
    this.tweens.killTweensOf(upgrade.pivot);
    upgrade.hit.destroy();
    upgrade.pivot.destroy();
    this.upgrades.delete(id);
  }

  /** Puffs of dust at a building site. */
  dust(x, y, depth) {
    for (let i = 0; i < 9; i++) {
      const puff = this.add.circle(x + (i - 4) * 26, y - 6, 16, 0xe6d3b3, 0.9).setDepth(depth);
      this.tweens.add({
        targets: puff, y: y - 46 - (i % 3) * 18, x: puff.x + (i - 4) * 9, scale: 2.2, alpha: 0,
        delay: (i % 3) * 110, duration: 800, onComplete: () => puff.destroy(),
      });
    }
  }

  /**
   * A big reward is not handed over: it is built. He sees his farm as it was, the
   * old home (if this replaces one) comes down, there is hammering and dust, and the
   * new building grows out of the ground. Then it shows what it does, once, and a
   * finger points at it until he tries it himself. If it belongs on another page,
   * the truck drives there first.
   */
  async construct(id, before) {
    this.in.lock();
    const page = this.upgradePage.get(id) ?? HOME_PAGE;
    const spot = upgradeSpot(id, pageX(page));
    const top = 590;
    await wait(this, 900);
    if (page !== this.page) {
      await this.driveTo(page);
      await wait(this, 500);
    }

    if (before) {
      const old = this.upgrades.get(before);
      this.sfx.creak();
      this.dust(spot.x, spot.y, top);
      await tween(this, { targets: old.pivot, scaleX: 0, scaleY: 0, duration: 420, ease: 'Back.in' });
      this.removeUpgrade(before);
    }

    // Hammering.
    for (let i = 0; i < 3; i++) {
      this.sfx.thud();
      this.dust(spot.x, spot.y, top);
      await wait(this, 300);
    }

    const upgrade = this.addUpgrade(id);
    if (!upgrade) return this.in.unlock();
    upgrade.pivot.setScale(0);
    this.sfx.cheer();
    this.confetti.explode(60, spot.x, spot.y - 80);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spark = emoji(this, spot.x, spot.y - 90, '✨', 44).setDepth(top);
      this.tweens.add({
        targets: spark, x: spot.x + Math.cos(angle) * 190, y: spot.y - 90 + Math.sin(angle) * 130, alpha: 0,
        duration: 900, ease: 'Quad.out', onComplete: () => spark.destroy(),
      });
    }
    await tween(this, { targets: upgrade.pivot, scale: upgrade.scale, duration: 650, ease: 'Back.out' });
    await wait(this, 500);

    // Show what it does, so he knows it is a toy and not scenery.
    await upgrade.tap();

    const finger = emoji(this, upgrade.zone.centerX, upgrade.zone.y - 6, '👇', 62).setDepth(top);
    this.tweens.add({ targets: finger, y: finger.y - 22, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.pointer = { id, finger };
    this.in.unlock();
  }

  /** One building on this page, picked at random, gives a little hop: "tap me". */
  invite() {
    const here = [...this.upgrades.values()].filter((upgrade) => upgrade.page === this.page);
    if (this.in.locked || this.wardrobe || here.length === 0) return;
    const upgrade = Phaser.Utils.Array.GetRandom(here);
    if (this.tweens.isTweening(upgrade.pivot)) return;
    this.tweens.add({ targets: upgrade.pivot, scale: upgrade.scale * 1.05, duration: 160, yoyo: true, repeat: 1, ease: 'Sine.inOut' });
  }

  tapUpgrade(id) {
    if (this.pointer?.id === id) {
      this.pointer.finger.destroy();
      this.pointer = null;
    }
    this.upgrades.get(id)?.tap();
  }

  // ---------- building the rest ----------

  buildShelf() {
    const g = this.add.graphics().setScrollFactor(0).setDepth(500);
    g.fillStyle(0x8d5a2b, 1).fillRoundedRect(20, SHELF.top, 1240, 96, 22);
    g.fillStyle(0xb9793f, 1).fillRoundedRect(20, SHELF.top, 1240, 84, 22);
    g.fillStyle(0xc98f4a, 1).fillRoundedRect(34, SHELF.top + 10, 958, 64, 16);

    // The way back to the animals.
    const go = makeGoButton(this, GO_BUTTON.x, GO_BUTTON.y, 44).setScrollFactor(0, 0, true).setDepth(600);
    this.in.tappable(go, 'go', new Phaser.Geom.Circle(0, 0, 62), Phaser.Geom.Circle.Contains);
    this.tweens.add({ targets: go, scale: 1.07, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // The way back to the home page. It is only there when he is somewhere else.
    const r = HOME_BUTTON.radius;
    const disc = this.add.graphics();
    disc.fillStyle(0x5b3a1a, 1).fillCircle(0, 3, r + 5);
    disc.fillStyle(0xfff6e0, 1).fillCircle(0, 0, r);
    disc.lineStyle(5, 0x6b4423, 1).strokeCircle(0, 0, r);
    const house = emoji(this, 0, -2, '🏠', 52);
    this.homeButton = this.add.container(HOME_BUTTON.x, HOME_BUTTON.y, [disc, house]).setScrollFactor(0, 0, true).setDepth(600);
    this.in.tappable(this.homeButton, 'nav:home', new Phaser.Geom.Circle(0, 0, 60), Phaser.Geom.Circle.Contains);
  }

  /**
   * One arrow at each end of the road. Each has a little picture above it, shown
   * when something new is waiting on a shelf that way.
   */
  buildArrows() {
    for (const dir of [-1, 1]) {
      const r = ARROW.radius;
      const g = this.add.graphics();
      g.fillStyle(0x2b2118, 0.25).fillCircle(0, 6, r + 4);
      g.fillStyle(dir < 0 ? SIDE_COLOR.left : SIDE_COLOR.right, 1).fillCircle(0, 0, r);
      g.lineStyle(6, 0xffffff, 1).strokeCircle(0, 0, r);
      g.fillStyle(0xffffff, 1).fillTriangle(dir * 30, 0, -dir * 16, -30, -dir * 16, 30);
      const badge = emoji(this, dir * -8, -r - 18, '', 50);
      const box = this.add.container(ARROW.x[dir], ARROW.y, [g, badge]).setScrollFactor(0, 0, true).setDepth(600);
      this.in.tappable(box, dir < 0 ? 'nav:left' : 'nav:right', new Phaser.Geom.Circle(0, 0, ARROW.hit), Phaser.Geom.Circle.Contains);
      this.arrows[dir] = { box, badge };
    }
  }

  /** Show the arrows that lead somewhere, and the house button when he is away from home. */
  refreshNav() {
    const waiting = this.farm.box.map((id) => this.items.get(id)).filter((item) => item?.emoji);
    for (const dir of [-1, 1]) {
      const { box, badge } = this.arrows[dir];
      const next = neighbour(this.page, dir, this.pages);
      box.setVisible(Boolean(next));
      // Something he has not placed yet, on a page that way.
      const there = next && waiting.find((item) => directionTo(this.page, livesOn(item, this.pages)) === dir);
      badge.setText(there?.emoji ?? '');
      this.tweens.killTweensOf(box);
      box.setPosition(ARROW.x[dir], ARROW.y).setScale(1);
      if (there) this.tweens.add({ targets: box, x: ARROW.x[dir] + dir * 10, scale: 1.08, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.homeButton.setVisible(this.page !== HOME_PAGE);
  }

  buildTruck() {
    this.truck?.destroy();
    this.truck = makeTruck(this, pageX(this.page) + TRUCK.x, TRUCK.y).setScale(TRUCK.scale).setDepth(depthAt(TRUCK.y + 70));
    this.in.tappable(this.truck, 'truck', new Phaser.Geom.Rectangle(-220, -130, 440, 250), Phaser.Geom.Rectangle.Contains);
  }

  // ---------- driving between pages ----------

  /** A tap on an arrow or the house button: drive there, if there is a there. */
  async go(page) {
    if (!page || page === this.page || this.in.locked) return;
    this.closeWardrobe();
    this.in.lock();
    await this.driveTo(page);
    this.in.unlock();
  }

  /**
   * The truck drives along the road to another page and the view goes with it. The
   * truck is drawn facing left, so it turns round to drive right.
   */
  async driveTo(page) {
    const dir = directionTo(this.page, page);
    if (dir === 0) return;
    const pages = Math.abs(PAGES.indexOf(page) - PAGES.indexOf(this.page));
    const duration = DRIVE_MS.first + (pages - 1) * DRIVE_MS.more;
    this.page = page;
    // The shelf and arrows change at once: by the time he looks, they are the new page's.
    this.renderBox();
    for (const d of [-1, 1]) this.arrows[d].box.setVisible(false);
    this.homeButton.setVisible(false);

    this.sfx.engine(duration / 1000);
    this.tweens.killTweensOf(this.truck);
    this.truck.setAngle(0).setScale(dir > 0 ? -TRUCK.scale : TRUCK.scale, TRUCK.scale);
    const rattle = this.tweens.add({ targets: this.truck, y: TRUCK.y - 4, duration: 110, yoyo: true, repeat: -1 });
    await Promise.all([
      tween(this, { targets: this.truck, x: pageX(page) + TRUCK.x, duration, ease: 'Sine.inOut' }),
      tween(this, { targets: this.cameras.main, scrollX: pageX(page), duration, ease: 'Sine.inOut' }),
    ]);
    rattle.stop();
    this.truck.setY(TRUCK.y).setScale(TRUCK.scale);
    this.refreshNav();
  }

  /** Stand one saved thing on the farm. */
  addThing(thing) {
    const item = this.items.get(thing.item);
    if (!item?.emoji) return null;
    const size = sizeOf(item);
    // Saved places are measured within the page; the picture stands in the wide world.
    const obj = emoji(this, pageX(thing.page) + thing.x, thing.y, item.emoji, size).setDepth(depthAt(thing.y + size / 2));
    const key = `thing:${this.nextKey++}`;
    const half = Math.max(60, size * 0.62);
    this.in.draggable(obj, key,
      new Phaser.Geom.Rectangle(obj.width / 2 - half, obj.height / 2 - half, half * 2, half * 2),
      Phaser.Geom.Rectangle.Contains);
    this.things.set(key, { thing, obj, size });
    return obj;
  }

  /** Show what is waiting on this page's shelf, oldest first. */
  renderBox() {
    this.shelfObjects.forEach((o) => o.destroy());
    this.shelfObjects = [];
    this.shelf = boxFor(this.farm, this.allItems, this.page, this.pages);
    this.shelf.slice(0, BOX_SLOTS).forEach(({ id }, i) => {
      const item = this.items.get(id);
      if (!item?.emoji) return;
      const obj = emoji(this, slotX(i), SHELF.y - 6, item.emoji, 70).setScrollFactor(0).setDepth(600);
      this.in.tappable(obj, `box:${i}`,
        new Phaser.Geom.Rectangle(obj.width / 2 - 54, obj.height / 2 - 50, 108, 100), Phaser.Geom.Rectangle.Contains);
      // New things bob gently: "tap me".
      this.tweens.add({ targets: obj, y: obj.y - 8, duration: 500, yoyo: true, repeat: -1, delay: i * 120, ease: 'Sine.inOut' });
      this.shelfObjects.push(obj);
    });
    // More are waiting than fit: three dots, and they move up as he places things.
    if (this.shelf.length > BOX_SLOTS) {
      const dots = this.add.graphics().setScrollFactor(0).setDepth(600);
      dots.fillStyle(0x6b4423, 1);
      for (let i = 0; i < 3; i++) dots.fillCircle(948 + i * 14, SHELF.y - 6, 5);
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
    if (id.startsWith('up:')) return this.tapUpgrade(id.slice(3));
    if (id === 'go') return this.leave();
    if (id === 'nav:left') return this.go(neighbour(this.page, -1, this.pages));
    if (id === 'nav:right') return this.go(neighbour(this.page, 1, this.pages));
    if (id === 'nav:home') return this.go(HOME_PAGE);
    if (id === 'truck') return this.wiggle(this.truck, this.sfx.honk);
    if (id.startsWith('box:')) return this.place(Number(id.slice(4)));
    const entry = this.things.get(id);
    // A friend answers in its own voice; anything else just pops.
    if (entry) this.wiggle(entry.obj, () => this.sfx.animal(this.items.get(entry.thing.item)?.sound) || this.sfx.pop(3));
  }

  /** Tap something on the shelf: it hops onto this page of the farm. */
  place(slot) {
    const entry = this.shelf[slot];
    if (!entry) return;
    const spot = freeSpot(this.farm, Math.random, this.page);
    const thing = placeFromBox(this.farm, entry.index, spot.x, spot.y, this.page);
    if (!thing) return;
    this.store.save(this.state);
    this.sfx.pop(4);

    const obj = this.addThing(thing);
    this.renderBox();
    this.refreshNav();
    if (!obj) return;
    // It jumps up from its place on the shelf and lands on the farm.
    const landX = obj.x;
    obj.setPosition(this.cameras.main.scrollX + slotX(slot), SHELF.y - 6).setDepth(DRAG_DEPTH);
    this.tweens.add({ targets: obj, x: landX, duration: 420, ease: 'Sine.inOut' });
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
    // A thing stays on its own page. It may be dragged down over the shelf, which is
    // how it is put away.
    const left = pageX(entry.thing.page);
    entry.obj.setPosition(
      Phaser.Math.Clamp(x, left + FIELD.left, left + FIELD.right),
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
      this.refreshNav();
    } else {
      const left = pageX(thing.page);
      moveThing(thing, obj.x - left, obj.y);
      obj.setPosition(left + thing.x, thing.y).setDepth(depthAt(thing.y + size / 2));
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

    // The panel is fixed to the screen, like the shelf.
    const panel = this.add.graphics().setScrollFactor(0).setDepth(700);
    panel.fillStyle(0xfff6e0, 1).fillRoundedRect(left, top, width, height, 26);
    panel.lineStyle(6, 0x6b4423, 1).strokeRoundedRect(left, top, width, height, 26);
    const objects = [panel];

    rows.forEach(({ type, options }, r) => {
      const y = top + 8 + WARDROBE.row / 2 + r * WARDROBE.row;
      options.forEach((item, i) => {
        const x = WARDROBE.x + (i - (options.length - 1) / 2) * WARDROBE.slot;
        if ((item?.id ?? null) === (this.farm[type] ?? null)) {
          const ring = this.add.graphics().setScrollFactor(0).setDepth(700);
          ring.lineStyle(8, 0xf59e0b, 1).strokeCircle(x, y, WARDROBE.slot / 2 - 3);
          objects.push(ring);
        }
        // "None" is the plain green truck, or a crossed-out circle for no hat.
        const picture = type === 'paint'
          ? this.colourDisc(x, y, item?.value ?? PLAIN_GREEN)
          : emoji(this, x, y, item?.emoji ?? '🚫', WARDROBE.size - 10);
        picture.setScrollFactor(0, 0, true).setDepth(701);
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
