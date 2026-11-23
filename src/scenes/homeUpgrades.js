// The home farm's buildings and features. Each is earned as a big reward
// (content/rewards.json, "value"), drawn here, and does something when tapped.
// The farm starts with none of them: bare grass and the truck.
//
// Each builder draws its upgrade and returns { zone, tap }: the rectangle that can be
// tapped, and what happens. A builder draws in its own coordinates through `add` and
// `put`; PLACE then says where on the farm it stands and how big. So a building can
// be moved or enlarged without touching its drawing, and can be grown out of the
// ground as one piece when it is first built. Adding an upgrade is one builder, one
// line in PLACE, and one line in rewards.json.

import Phaser from 'phaser';
import { emoji } from './ui.js';

export const HORIZON = 250;
// The ground line the builders draw on, in their own coordinates.
const BASE = 300;

// Things stand in front of whatever is behind them: depth follows how far down the
// screen something's feet are.
export const depthAt = (y) => 100 + y / 10;

const rect = (x, y, w, h) => new Phaser.Geom.Rectangle(x, y, w, h);
const tw = (scene, config) => new Promise((resolve) => scene.tweens.add({ ...config, onComplete: resolve }));
const pause = (scene, ms) => new Promise((resolve) => scene.time.delayedCall(ms, resolve));

/** A toy ignores taps while it is still doing its thing, so mashing cannot tangle it. */
function oneAtATime(fn) {
  let busy = false;
  return async () => {
    if (busy) return;
    busy = true;
    try { await fn(); } finally { busy = false; }
  };
}

/** Three puffs of smoke drifting up from (x, y). */
function smoke(scene, add, x, y) {
  for (let i = 0; i < 3; i++) {
    const puff = add.circle(x, y, 9, 0xeeeeee, 0.9);
    scene.tweens.add({
      targets: puff, y: y - 70 - i * 12, x: x + 14 + i * 6, scale: 2, alpha: 0, delay: i * 220, duration: 1100,
      onComplete: () => puff.destroy(),
    });
  }
}

// ---------- the home, in four stages ----------

function tent(scene, { sfx, add, put }) {
  const d = depthAt(BASE - 4);
  const g = add.graphics().setDepth(d);
  g.fillStyle(0xe07b39, 1).fillTriangle(95, BASE, 170, 205, 245, BASE);
  g.fillStyle(0xf39c5a, 1).fillTriangle(95, BASE, 170, 205, 150, BASE);
  g.lineStyle(5, 0x8a4514, 1).strokeTriangle(95, BASE, 170, 205, 245, BASE);
  g.fillStyle(0x3b2414, 1).fillTriangle(150, BASE, 170, 236, 190, BASE);
  const flap = add.graphics().setDepth(d);
  flap.fillStyle(0xc9652a, 1).fillTriangle(150, BASE, 170, 236, 190, BASE);
  const lantern = put(170, 276, '🏮', 30).setDepth(d).setAlpha(0);
  return {
    zone: rect(90, 200, 160, 105),
    // The flap lifts and a lantern glows inside.
    tap: oneAtATime(async () => {
      sfx.pop(2);
      scene.tweens.add({ targets: flap, alpha: 0, duration: 200 });
      await tw(scene, { targets: lantern, alpha: 1, duration: 250 });
      await tw(scene, { targets: lantern, scale: 1.25, duration: 250, yoyo: true, repeat: 2 });
      scene.tweens.add({ targets: lantern, alpha: 0, duration: 250 });
      await tw(scene, { targets: flap, alpha: 1, duration: 250 });
    }),
  };
}

/**
 * A house with a door, windows and a chimney. Tapping it turns the lights on or off,
 * swings the door and puffs the chimney. The three sizes share this.
 */
function house(scene, { sfx, add, put }, { left, width, wallTop, peak, wall, roof, windows, path, flag }) {
  const d = depthAt(BASE - 4);
  const right = left + width;
  const mid = left + width / 2;
  if (path) {
    // The farmhouse brings a path from its door down across the field.
    const p = add.graphics().setDepth(0.8);
    p.fillStyle(0xd9b98a, 1);
    p.fillPoints([
      { x: mid - 26, y: BASE - 2 }, { x: mid + 26, y: BASE - 2 }, { x: mid + 70, y: 440 },
      { x: mid + 20, y: 610 }, { x: mid - 90, y: 610 }, { x: mid - 20, y: 440 },
    ], true);
    p.fillStyle(0xc7a474, 1);
    for (const [dx, y] of [[0, 330], [18, 400], [8, 480], [-22, 550]]) p.fillEllipse(mid + dx, y, 26, 10);
  }
  const g = add.graphics().setDepth(d);
  // Chimney first, so the roof overlaps its foot.
  const chimneyX = right - width * 0.28;
  g.fillStyle(0x8d4b3a, 1).fillRect(chimneyX, peak - 6, 22, wallTop - peak + 4);
  g.fillStyle(roof, 1).fillTriangle(left - 16, wallTop + 2, mid, peak, right + 16, wallTop + 2);
  g.fillStyle(wall, 1).fillRect(left, wallTop, width, BASE - wallTop);
  g.lineStyle(5, 0x4e342e, 1).strokeRect(left, wallTop, width, BASE - wallTop);
  g.lineStyle(5, 0x4e342e, 1).strokeTriangle(left - 16, wallTop + 2, mid, peak, right + 16, wallTop + 2);
  g.fillStyle(0x3b2414, 1).fillRect(mid - 17, BASE - 46, 34, 46);

  const door = add.rectangle(mid - 17, BASE - 23, 34, 46, 0x8d5a2b).setOrigin(0, 0.5).setStrokeStyle(3, 0x4e342e).setDepth(d);
  const panes = windows.map(([x, y]) =>
    add.rectangle(x, y, 28, 26, 0x9fd3f5).setStrokeStyle(4, 0x4e342e).setDepth(d));
  let pennant = null;
  if (flag) {
    g.lineStyle(4, 0x4e342e, 1).lineBetween(mid, peak, mid, peak - 44);
    pennant = add.triangle(mid, peak - 34, 0, 0, 34, 10, 0, 20, 0xe53935).setOrigin(0, 0.5).setDepth(d);
    scene.tweens.add({ targets: pennant, scaleX: 0.75, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  let lit = false;
  return {
    zone: rect(left - 16, peak - (flag ? 44 : 0), width + 32, BASE - peak + (flag ? 44 : 0) + 6),
    tap: oneAtATime(async () => {
      lit = !lit;
      sfx.chime();
      smoke(scene, add, chimneyX + 11, peak - 10);
      // The lights come on one window at a time.
      panes.forEach((pane, i) => scene.time.delayedCall(i * 110, () => pane.setFillStyle(lit ? 0xffe066 : 0x9fd3f5)));
      await tw(scene, { targets: door, scaleX: 0.25, duration: 220 });
      await pause(scene, 500);
      await tw(scene, { targets: door, scaleX: 1, duration: 220 });
    }),
  };
}

const cabin = (scene, api) => house(scene, api, {
  left: 100, width: 140, wallTop: 232, peak: 190, wall: 0xb9793f, roof: 0x6d4c41, windows: [[205, 262]],
});
const farmhouse = (scene, api) => house(scene, api, {
  left: 75, width: 190, wallTop: 216, peak: 164, wall: 0xfff3e0, roof: 0xc62828, windows: [[112, 252], [228, 252]], path: true,
});
const bighouse = (scene, api) => house(scene, api, {
  left: 55, width: 230, wallTop: 178, peak: 122, wall: 0xfff3e0, roof: 0x1565c0,
  windows: [[95, 208], [170, 208], [245, 208], [95, 262], [245, 262]], path: true, flag: true,
});

// ---------- the back row ----------

function fence(scene, { sfx, add, put }) {
  const d = depthAt(BASE);
  // The gate is in the gap between the barn and the windmill, where it can be seen.
  const gate = { left: 805, right: 865 };
  const g = add.graphics().setDepth(d);
  g.fillStyle(0xe8c58c, 1);
  for (const [from, to] of [[30, gate.left], [gate.right, 1250]]) {
    g.fillRoundedRect(from, BASE - 44, to - from, 9, 4);
    g.fillRoundedRect(from, BASE - 22, to - from, 9, 4);
  }
  for (let x = 40; x <= 1240; x += 64) {
    if (x > gate.left - 10 && x < gate.right + 10) continue;
    g.fillStyle(0xc99a5b, 1).fillRoundedRect(x - 7, BASE - 58, 14, 62, 5);
    g.fillStyle(0xe8c58c, 1).fillRoundedRect(x - 7, BASE - 58, 5, 62, 3);
  }
  for (const x of [gate.left, gate.right]) g.fillStyle(0xa9783f, 1).fillRoundedRect(x - 8, BASE - 64, 16, 68, 5);

  // The gate hangs from its left post and swings open.
  const leaf = add.graphics();
  leaf.fillStyle(0xd8a55a, 1);
  leaf.fillRoundedRect(4, -46, 50, 9, 4);
  leaf.fillRoundedRect(4, -22, 50, 9, 4);
  leaf.lineStyle(7, 0xb98744, 1).lineBetween(8, -16, 50, -42);
  const swing = add.container(gate.left, BASE, [leaf]).setDepth(d);
  let open = false;
  return {
    zone: rect(gate.left - 16, BASE - 72, gate.right - gate.left + 32, 84),
    tap: oneAtATime(async () => {
      open = !open;
      sfx.creak();
      await tw(scene, { targets: swing, scaleX: open ? 0.22 : 1, duration: 420, ease: 'Sine.inOut' });
    }),
  };
}

function barn(scene, { sfx, add, put }) {
  const d = depthAt(BASE - 4);
  const left = 455;
  const g = add.graphics().setDepth(d);
  g.fillStyle(0x8e1c1c, 1).fillTriangle(left - 18, 190, left + 105, 104, left + 228, 190);
  g.fillStyle(0xc62828, 1).fillRect(left, 184, 210, BASE - 184);
  g.fillStyle(0xb71c1c, 1).fillTriangle(left + 6, 186, left + 105, 116, left + 204, 186);
  g.lineStyle(6, 0xffffff, 1).strokeTriangle(left + 6, 186, left + 105, 116, left + 204, 186);
  g.fillStyle(0x4e2a1a, 1).fillRoundedRect(left + 88, 140, 34, 30, 6);
  g.lineStyle(4, 0xffffff, 1).strokeRoundedRect(left + 88, 140, 34, 30, 6);
  g.fillStyle(0x2b1810, 1).fillRect(left + 65, 212, 80, BASE - 212);

  const cow = put(left + 105, 262, '🐄', 58).setDepth(d).setScale(0);
  const doors = add.graphics().setDepth(d + 0.01);
  doors.fillStyle(0x7f1d1d, 1).fillRect(left + 65, 212, 80, BASE - 212);
  doors.lineStyle(5, 0xffffff, 1).strokeRect(left + 65, 212, 80, BASE - 212);
  doors.lineBetween(left + 65, 212, left + 145, BASE).lineBetween(left + 145, 212, left + 65, BASE);
  return {
    zone: rect(left - 18, 104, 246, 202),
    // The doors open and a cow comes out to say hello.
    tap: oneAtATime(async () => {
      sfx.creak();
      await tw(scene, { targets: doors, alpha: 0, duration: 260 });
      cow.setPosition(left + 105, 262).setDepth(d + 0.02);
      await tw(scene, { targets: cow, scale: 1.5, y: 300, duration: 320, ease: 'Back.out' });
      sfx.moo();
      await tw(scene, { targets: cow, angle: { from: -8, to: 8 }, duration: 170, yoyo: true, repeat: 2 });
      cow.setAngle(0);
      await tw(scene, { targets: cow, scale: 0, y: 262, duration: 260, ease: 'Quad.in' });
      await tw(scene, { targets: doors, alpha: 1, duration: 220 });
    }),
  };
}

function silo(scene, { sfx, add, put }) {
  const d = depthAt(BASE - 6);
  const g = add.graphics().setDepth(d);
  g.fillStyle(0x90a4ae, 1).fillRect(684, 136, 66, BASE - 136);
  g.fillStyle(0xb0bec5, 1).fillRect(684, 136, 20, BASE - 136);
  g.fillStyle(0x607d8b, 1).fillEllipse(717, 136, 74, 56);
  g.fillStyle(0x78909c, 1).fillRect(684, 194, 66, 6).fillRect(684, 250, 66, 6);
  g.fillStyle(0x546e7a, 1).fillRect(748, 262, 26, 10);
  return {
    zone: rect(676, 104, 104, 202),
    // Grain pours out of the spout, and two birds fly down for it.
    tap: oneAtATime(async () => {
      sfx.rustle();
      for (let i = 0; i < 16; i++) {
        const grain = add.circle(776, 270, 4, 0xf2c94c).setDepth(depthAt(330));
        scene.tweens.add({
          targets: grain, x: 776 + (i % 5) * 7 - 12, y: 326 + (i % 3) * 4, delay: i * 45, duration: 320, ease: 'Quad.in',
          onComplete: () => scene.tweens.add({ targets: grain, alpha: 0, delay: 1700, duration: 300, onComplete: () => grain.destroy() }),
        });
      }
      await pause(scene, 500);
      const birds = [0, 1].map((i) => put(880 + i * 90, 60, '🐦', 40).setDepth(depthAt(340)));
      await Promise.all(birds.map((bird, i) => tw(scene, { targets: bird, x: 770 + i * 34, y: 322, duration: 600, ease: 'Sine.out' })));
      sfx.cluck();
      await Promise.all(birds.map((bird) => tw(scene, { targets: bird, y: 314, duration: 140, yoyo: true, repeat: 3 })));
      await Promise.all(birds.map((bird, i) => tw(scene, { targets: bird, x: 960 + i * 120, y: -40, duration: 700, ease: 'Sine.in' })));
      birds.forEach((bird) => bird.destroy());
    }),
  };
}

function windmill(scene, { sfx, add, put }) {
  const d = depthAt(BASE - 2);
  const x = 840;
  const g = add.graphics().setDepth(d);
  g.fillStyle(0xf5efe0, 1).fillPoints([{ x: x - 40, y: BASE }, { x: x + 40, y: BASE }, { x: x + 18, y: 150 }, { x: x - 18, y: 150 }], true);
  g.fillStyle(0xb9793f, 1).fillTriangle(x - 28, 152, x, 112, x + 28, 152);
  g.fillStyle(0x6b4423, 1).fillRoundedRect(x - 14, 250, 28, 50, 6);
  const sails = add.graphics();
  sails.fillStyle(0xd9a05b, 1);
  for (let i = 0; i < 4; i++) {
    const c = Math.cos((i * Math.PI) / 2);
    const s = Math.sin((i * Math.PI) / 2);
    const at = (along, across) => ({ x: along * c - across * s, y: along * s + across * c });
    sails.fillPoints([at(12, -5), at(96, -20), at(96, 6), at(12, 5)], true);
  }
  sails.fillStyle(0x6b4423, 1).fillCircle(0, 0, 10);
  const hub = add.container(x, 140, [sails]).setDepth(d + 0.01);
  // The sails turn slowly all the time, so the farm never looks frozen.
  const turning = scene.tweens.add({ targets: hub, angle: 360, duration: 9000, repeat: -1 });
  return {
    zone: rect(x - 100, 40, 200, 266),
    // A tap sends them spinning, then they settle again.
    tap: oneAtATime(async () => {
      sfx.whoosh();
      turning.timeScale = 9;
      await pause(scene, 1500);
      turning.timeScale = 4;
      await pause(scene, 500);
      turning.timeScale = 1;
    }),
  };
}

function tree(scene, { sfx, add, put }) {
  const d = depthAt(BASE + 2);
  const x = 385;
  const trunk = add.graphics().setDepth(d);
  trunk.fillStyle(0x8d5a2b, 1).fillRoundedRect(x - 15, 214, 30, 92, 10);
  const leaves = add.graphics();
  leaves.fillStyle(0x2e7d32, 1).fillCircle(0, 0, 70);
  leaves.fillStyle(0x43a047, 1).fillCircle(-38, -18, 46).fillCircle(38, -18, 46).fillCircle(0, -44, 50);
  leaves.fillStyle(0xe53935, 1);
  const apples = [[-34, -6], [6, -34], [36, 6], [-8, 20], [24, -52]];
  for (const [ax, ay] of apples) leaves.fillCircle(ax, ay, 10);
  const canopy = add.container(x, 176, [leaves]).setDepth(d);
  return {
    zone: rect(x - 76, 84, 152, 222),
    // The tree shakes and apples drop and bounce.
    tap: oneAtATime(async () => {
      sfx.rustle();
      scene.tweens.add({ targets: canopy, angle: { from: -5, to: 5 }, duration: 80, yoyo: true, repeat: 4, onComplete: () => canopy.setAngle(0) });
      await pause(scene, 300);
      const fallen = apples.slice(0, 3).map(([ax, ay], i) => {
        const apple = add.circle(x + ax, 176 + ay, 11, 0xe53935).setStrokeStyle(2, 0x8e1c1c).setDepth(depthAt(332));
        scene.tweens.add({
          targets: apple, y: 322 + i * 5, x: x + ax + (i - 1) * 16, duration: 520, delay: i * 130, ease: 'Bounce.out',
          onStart: () => scene.time.delayedCall(420, () => sfx.thud()),
        });
        return apple;
      });
      await pause(scene, 2600);
      await Promise.all(fallen.map((apple) => tw(scene, { targets: apple, alpha: 0, duration: 300 })));
      fallen.forEach((apple) => apple.destroy());
    }),
  };
}

function garage(scene, { sfx, add, put, openWardrobe }) {
  const d = depthAt(BASE - 4);
  const left = 925;
  const g = add.graphics().setDepth(d);
  g.fillStyle(0x5d7b8c, 1).fillRect(left - 8, 204, 186, 16);
  g.fillStyle(0x90a4ae, 1).fillRect(left, 218, 170, BASE - 218);
  g.lineStyle(5, 0x455a64, 1).strokeRect(left, 218, 170, BASE - 218);
  g.fillStyle(0x263238, 1).fillRect(left + 22, 238, 126, BASE - 238);
  // The roller door hangs from the top of the opening and rolls up.
  const door = add.graphics();
  door.fillStyle(0xcfd8dc, 1).fillRect(0, 0, 126, BASE - 238);
  door.lineStyle(3, 0x90a4ae, 1);
  for (let y = 12; y < BASE - 238; y += 12) door.lineBetween(0, y, 126, y);
  const roller = add.container(left + 22, 238, [door]).setDepth(d);
  put(left + 85, 190, '🎨', 34).setDepth(d);
  return {
    zone: rect(left - 8, 170, 186, 136),
    // The door rolls up, and the paints and hats come out to choose from.
    tap: oneAtATime(async () => {
      sfx.creak();
      await tw(scene, { targets: roller, scaleY: 0.12, duration: 320, ease: 'Sine.inOut' });
      openWardrobe();
      await pause(scene, 900);
      await tw(scene, { targets: roller, scaleY: 1, duration: 320, ease: 'Sine.inOut' });
    }),
  };
}

function coop(scene, { sfx, add, put }) {
  const d = depthAt(BASE - 4);
  const left = 1128;
  const g = add.graphics().setDepth(d);
  g.fillStyle(0x6b4423, 1).fillRect(left + 8, 276, 8, 26).fillRect(left + 84, 276, 8, 26);
  g.fillStyle(0xe8c58c, 1).fillRect(left, 226, 100, 54);
  g.lineStyle(4, 0x6b4423, 1).strokeRect(left, 226, 100, 54);
  g.fillStyle(0xa9442b, 1).fillTriangle(left - 12, 228, left + 50, 196, left + 112, 228);
  g.fillStyle(0x2b1810, 1).fillRoundedRect(left + 36, 244, 28, 36, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.lineStyle(6, 0xb9793f, 1).lineBetween(left + 40, 282, left + 14, 304);
  const hen = put(left + 50, 262, '🐔', 40).setDepth(d + 0.01).setScale(0);
  return {
    zone: rect(left - 12, 194, 126, 114),
    // A hen pops out and lays an egg, and the egg hatches.
    tap: oneAtATime(async () => {
      hen.setPosition(left + 50, 262);
      await tw(scene, { targets: hen, scale: 1, y: 258, duration: 220, ease: 'Back.out' });
      sfx.cluck();
      await tw(scene, { targets: hen, y: 250, duration: 110, yoyo: true, repeat: 2 });
      const egg = put(left + 20, 318, '🥚', 30).setDepth(depthAt(332)).setScale(0);
      sfx.pop(4);
      await tw(scene, { targets: egg, scale: 1, duration: 200, ease: 'Back.out' });
      scene.tweens.add({ targets: hen, scale: 0, duration: 200 });
      await tw(scene, { targets: egg, angle: { from: -14, to: 14 }, duration: 110, yoyo: true, repeat: 4 });
      egg.setText('🐥').setAngle(0);
      sfx.pop(7);
      await tw(scene, { targets: egg, y: 308, duration: 140, yoyo: true, repeat: 1 });
      await tw(scene, { targets: egg, x: left - 150, alpha: 0, duration: 1100, ease: 'Sine.in' });
      egg.destroy();
    }),
  };
}

// ---------- out in the field ----------

function pond(scene, { sfx, add, put }) {
  const g = add.graphics().setDepth(0.9);
  const x = 400;
  const y = 512;
  g.fillStyle(0x4a9d3f, 1).fillEllipse(x, y + 4, 310, 128);
  g.fillStyle(0x4fc3f7, 1).fillEllipse(x, y, 280, 106);
  g.fillStyle(0x81d4fa, 1).fillEllipse(x - 30, y - 14, 140, 40);
  return {
    zone: rect(x - 140, y - 53, 280, 106),
    // A fish jumps out and splashes back in.
    tap: oneAtATime(async () => {
      const fish = put(x - 60, y, '🐟', 44).setDepth(depthAt(y)).setAngle(50);
      sfx.splash();
      scene.tweens.add({ targets: fish, x: x + 60, angle: -50, duration: 700, ease: 'Sine.inOut' });
      await tw(scene, { targets: fish, y: y - 120, duration: 350, yoyo: true, ease: 'Quad.out' });
      fish.destroy();
      sfx.splash();
      const ring = add.ellipse(x + 60, y, 20, 8).setStrokeStyle(4, 0xffffff, 0.9).setDepth(1.5);
      await tw(scene, { targets: ring, scaleX: 6, scaleY: 6, alpha: 0, duration: 600 });
      ring.destroy();
    }),
  };
}

function garden(scene, { sfx, add, put }) {
  const x = 640;
  const y = 372;
  const g = add.graphics().setDepth(0.9);
  g.fillStyle(0x6b4423, 1).fillRoundedRect(x - 112, y - 44, 224, 88, 14);
  g.fillStyle(0x8d5a2b, 1).fillRoundedRect(x - 104, y - 36, 208, 72, 10);
  g.fillStyle(0x7a4b22, 1);
  for (const dy of [-12, 14]) g.fillRoundedRect(x - 92, y + dy, 184, 6, 3);
  const crops = ['🥕', '🌽', '🍅', '🎃'];
  const plants = crops.map((_, i) => put(x - 78 + i * 52, y - 4, '🌱', 34).setDepth(depthAt(y)).setScale(0));
  let stage = 0; // 0 bare, then one more sprout per tap, then ripe, then picked
  return {
    zone: rect(x - 112, y - 44, 224, 88),
    // Tap to plant a row, tap again to ripen it, tap again to pick it.
    tap: oneAtATime(async () => {
      if (stage < crops.length) {
        const plant = plants[stage++];
        plant.setText('🌱');
        sfx.pop(stage);
        await tw(scene, { targets: plant, scale: 1, duration: 220, ease: 'Back.out' });
      } else if (stage === crops.length) {
        stage++;
        sfx.chime();
        plants.forEach((plant, i) => plant.setText(crops[i]));
        await Promise.all(plants.map((plant, i) => tw(scene, { targets: plant, scale: { from: 0.6, to: 1.25 }, delay: i * 70, duration: 240, ease: 'Back.out' })));
      } else {
        stage = 0;
        for (const [i, plant] of plants.entries()) {
          sfx.pop(i + 3);
          await tw(scene, { targets: plant, y: y - 50, scale: 0, duration: 200, ease: 'Quad.in' });
          plant.setY(y - 4);
        }
      }
    }),
  };
}

function well(scene, { sfx, add, put }) {
  const x = 78;
  const y = 462;
  const d = depthAt(y + 34);
  const g = add.graphics().setDepth(d);
  g.fillStyle(0x6b4423, 1).fillRect(x - 42, y - 82, 8, 86).fillRect(x + 34, y - 82, 8, 86);
  g.fillStyle(0xa9442b, 1).fillTriangle(x - 58, y - 78, x, y - 116, x + 58, y - 78);
  g.fillStyle(0x263238, 1).fillEllipse(x, y, 84, 26);
  const rope = add.rectangle(x, y - 78, 4, 34, 0x5d4037).setOrigin(0.5, 0).setDepth(d);
  const bucket = put(x, y - 34, '🪣', 30).setDepth(d);
  // The stone wall is drawn last, so the bucket goes down behind it.
  const wall = add.graphics().setDepth(d + 0.01);
  wall.fillStyle(0x90a4ae, 1).fillRoundedRect(x - 44, y - 4, 88, 40, 8);
  wall.lineStyle(3, 0x607d8b, 1);
  for (const dy of [8, 22]) wall.lineBetween(x - 44, y + dy, x + 44, y + dy);
  return {
    zone: rect(x - 58, y - 116, 116, 156),
    // The bucket goes down, splashes, and comes back up with water.
    tap: oneAtATime(async () => {
      sfx.creak();
      scene.tweens.add({ targets: rope, scaleY: 2.4, duration: 500 });
      await tw(scene, { targets: bucket, y: y + 14, duration: 500, ease: 'Sine.in' });
      sfx.splash();
      await pause(scene, 300);
      scene.tweens.add({ targets: rope, scaleY: 1, duration: 600 });
      await tw(scene, { targets: bucket, y: y - 34, duration: 600, ease: 'Sine.out' });
      const drop = put(x + 24, y - 40, '💧', 26).setDepth(d + 0.03);
      await tw(scene, { targets: drop, y: y - 4, alpha: 0, duration: 500, ease: 'Quad.in' });
      drop.destroy();
    }),
  };
}

function beehive(scene, { sfx, add, put }) {
  const x = 1190;
  const y = 410;
  const d = depthAt(y + 30);
  const g = add.graphics().setDepth(d);
  g.fillStyle(0x6b4423, 1).fillRect(x - 30, y + 14, 8, 22).fillRect(x + 22, y + 14, 8, 22).fillRect(x - 38, y + 8, 76, 8);
  g.fillStyle(0xf2b632, 1);
  [[0, 56], [-14, 50], [-28, 40], [-40, 26]].forEach(([dy, w]) => g.fillEllipse(x, y + dy - 6, w, 20));
  g.lineStyle(3, 0xb9791a, 1);
  [0, -14, -28].forEach((dy) => g.strokeEllipse(x, y + dy - 6, 56 - Math.abs(dy) * 0.5, 20));
  g.fillStyle(0x3b2414, 1).fillEllipse(x, y - 4, 16, 12);
  return {
    zone: rect(x - 44, y - 62, 88, 100),
    // Bees fly out, loop around, and come home.
    tap: oneAtATime(async () => {
      sfx.buzz();
      await Promise.all([0, 1, 2].map(async (i) => {
        const bee = put(x, y - 4, '🐝', 26).setDepth(depthAt(600));
        const out = { x: x - 150 - i * 60, y: y - 60 + i * 50 };
        await tw(scene, { targets: bee, x: out.x, y: out.y, duration: 520 + i * 80, ease: 'Sine.inOut' });
        await tw(scene, { targets: bee, x: out.x - 40, y: out.y + 34, duration: 300, yoyo: true, ease: 'Sine.inOut' });
        await tw(scene, { targets: bee, x, y: y - 4, duration: 520 + i * 80, ease: 'Sine.inOut' });
        bee.destroy();
      }));
    }),
  };
}

function scarecrow(scene, { sfx, add, put }) {
  const x = 806;
  const y = 396;
  const d = depthAt(y + 40);
  const g = add.graphics();
  g.fillStyle(0x8d5a2b, 1).fillRect(-4, -70, 8, 110).fillRect(-44, -48, 88, 8);
  g.fillStyle(0x4f83cc, 1).fillRoundedRect(-22, -52, 44, 46, 8);
  g.fillStyle(0xf2c94c, 1).fillRect(-50, -50, 10, 12).fillRect(40, -50, 10, 12);
  g.fillStyle(0xf5deb3, 1).fillCircle(0, -70, 17);
  g.fillStyle(0x8d5a2b, 1).fillTriangle(-24, -80, 0, -108, 24, -80).fillRect(-28, -82, 56, 6);
  g.fillStyle(0x2b2118, 1).fillCircle(-6, -72, 2.5).fillCircle(6, -72, 2.5);
  const body = add.container(x, y, [g]).setDepth(d);
  const perch = { x: x + 44, y: y - 62 };
  const crow = put(perch.x, perch.y, '🐦‍⬛', 30).setDepth(d + 0.01);
  return {
    zone: rect(x - 52, y - 112, 104, 156),
    // The scarecrow wobbles and the crow flaps off, then sneaks back.
    tap: oneAtATime(async () => {
      scene.tweens.add({ targets: body, angle: { from: -9, to: 9 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => body.setAngle(0) });
      sfx.caw();
      await tw(scene, { targets: crow, x: perch.x + 240, y: perch.y - 230, duration: 800, ease: 'Sine.in' });
      await pause(scene, 1400);
      await tw(scene, { targets: crow, x: perch.x, y: perch.y, duration: 900, ease: 'Sine.out' });
    }),
  };
}

function raincloud(scene, { sfx, add, put }) {
  const x = 560;
  const y = 86;
  const puffs = add.graphics();
  const draw = (colour) => {
    puffs.clear().fillStyle(colour, 1);
    puffs.fillEllipse(0, 0, 170, 62).fillEllipse(-56, 12, 110, 50).fillEllipse(60, 14, 120, 48).fillEllipse(8, -22, 96, 56);
  };
  draw(0xf5f7fa);
  const cloud = add.container(x, y, [puffs]).setDepth(0.3);
  scene.tweens.add({ targets: cloud, x: x + 18, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  // The rainbow sits behind the ground, so only the arch above the horizon shows.
  const bow = add.graphics().setDepth(0.2).setAlpha(0);
  [0xef4444, 0xf59e0b, 0xfde047, 0x22c55e, 0x3b82f6, 0xa855f7].forEach((colour, i) => {
    bow.lineStyle(14, colour, 0.85);
    bow.beginPath();
    // Centred on the screen whatever part of the sky the cloud is in (see PLACE).
    bow.arc(940, 336, 280 - i * 14, Math.PI, 0, false);
    bow.strokePath();
  });
  return {
    zone: rect(x - 120, y - 56, 240, 106),
    // The cloud turns grey and rains, then a rainbow comes out for a while.
    tap: oneAtATime(async () => {
      draw(0x9aa5b1);
      sfx.rain();
      for (let i = 0; i < 26; i++) {
        const drop = add.rectangle(cloud.x - 90 + ((i * 53) % 180), y + 30, 4, 16, 0x4fc3f7).setDepth(0.35);
        scene.tweens.add({ targets: drop, y: HORIZON + 40, alpha: 0.2, delay: i * 70, duration: 520, ease: 'Quad.in', onComplete: () => drop.destroy() });
      }
      await pause(scene, 2200);
      draw(0xf5f7fa);
      sfx.chime();
      await tw(scene, { targets: bow, alpha: 1, duration: 900 });
      await pause(scene, 6000);
      await tw(scene, { targets: bow, alpha: 0, duration: 1200 });
    }),
  };
}

const UPGRADES = {
  tent, cabin, farmhouse, bighouse,
  fence, barn, silo, windmill, tree, garage, coop,
  pond, garden, well, beehive, scarecrow, raincloud,
};

// Where each upgrade stands. `anchor` is the middle of its foot in the builder's own
// coordinates, `at` is where that point goes on the farm, and `scale` is how big it
// is drawn. The buildings are large and stand in front of the fence, in two loose
// rows: the home, barn, garage and hen house at the front, the tree, silo and
// windmill a little behind and between them.
const PLACE = {
  tent: { anchor: [170, BASE], at: [165, 345], scale: 1.3 },
  cabin: { anchor: [170, BASE], at: [165, 345], scale: 1.3 },
  farmhouse: { anchor: [170, BASE], at: [165, 345], scale: 1.3 },
  bighouse: { anchor: [170, BASE], at: [168, 345], scale: 1.25 },
  tree: { anchor: [385, 304], at: [372, 326], scale: 1.15 },
  barn: { anchor: [560, BASE], at: [560, 350], scale: 1.3 },
  silo: { anchor: [717, BASE], at: [742, 320], scale: 1.15 },
  windmill: { anchor: [840, BASE], at: [905, 322], scale: 1.15 },
  garage: { anchor: [1010, BASE], at: [1040, 345], scale: 1.25 },
  coop: { anchor: [1178, 304], at: [1195, 342], scale: 1.25 },
  // The fence runs along the back, behind everything.
  fence: { anchor: [640, BASE], at: [640, BASE], scale: 1 },
  // Out in the field. The pond and garden lie flat, under anything he places.
  pond: { anchor: [400, 512], at: [400, 522], scale: 1, depth: 0.9 },
  garden: { anchor: [640, 372], at: [650, 432], scale: 1, depth: 0.9 },
  well: { anchor: [78, 498], at: [82, 506], scale: 1 },
  beehive: { anchor: [1190, 446], at: [1232, 452], scale: 1 },
  scarecrow: { anchor: [806, 436], at: [808, 476], scale: 1 },
  // In the sky, behind the hills, so the rainbow's feet are hidden.
  raincloud: { anchor: [560, 86], at: [260, 56], scale: 1, depth: 0.3 },
};

export const UPGRADE_IDS = Object.keys(UPGRADES).filter((id) => PLACE[id]);

/** A stand-in for `scene.add` that puts everything it makes into `layer`. */
function addInto(scene, layer) {
  return new Proxy(scene.add, {
    get(target, name) {
      const make = target[name];
      if (typeof make !== 'function') return make;
      return (...args) => {
        const made = make.apply(target, args);
        // Anything that was handed to a container of its own is already inside the layer.
        if (made?.setPosition && !made.parentContainer) layer.add(made);
        return made;
      };
    },
  });
}

/**
 * Draw one upgrade on the farm and return { id, pivot, zone, depth, scale, tap }.
 * `pivot` is the whole upgrade as one object, standing on its foot, so it can be
 * grown, shrunk or nudged as a unit. `api` is { sfx, openWardrobe }.
 */
export function buildUpgrade(scene, id, api) {
  const place = PLACE[id];
  const build = UPGRADES[id];
  if (!place || !build) return null;
  const scale = place.scale ?? 1;
  const depth = place.depth ?? depthAt(place.at[1]);
  const pivot = scene.add.container(place.at[0], place.at[1]).setScale(scale).setDepth(depth);
  const layer = scene.add.container(-place.anchor[0], -place.anchor[1]);
  pivot.add(layer);
  const put = (x, y, char, px) => {
    const text = emoji(scene, x, y, char, px);
    layer.add(text);
    return text;
  };
  const built = build(scene, { ...api, add: addInto(scene, layer), put });
  const z = built.zone;
  const zone = rect(
    place.at[0] + (z.x - place.anchor[0]) * scale,
    place.at[1] + (z.y - place.anchor[1]) * scale,
    z.width * scale,
    z.height * scale,
  );
  // A building is tapped in front of itself but behind anything he has placed.
  return { id, pivot, zone, depth: depth + 0.5, scale, tap: built.tap };
}

/** Where an upgrade stands: { x, y } of its foot. */
export function upgradeSpot(id) {
  const place = PLACE[id];
  return place ? { x: place.at[0], y: place.at[1], scale: place.scale ?? 1 } : null;
}

/** The home farm with nothing on it yet: sky, sun, grass. */
export function drawHomeBackdrop(scene) {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(0);
  g.fillGradientStyle(0x6ebcf0, 0x6ebcf0, 0xcdeeff, 0xcdeeff, 1);
  g.fillRect(0, 0, width, HORIZON + 60);
  g.fillStyle(0xfff3b0, 0.6).fillCircle(1160, 90, 78);
  g.fillStyle(0xffd94a, 1).fillCircle(1160, 90, 56);
  g.fillStyle(0xffffff, 0.9);
  for (const [x, y, s] of [[640, 52, 0.9], [960, 40, 0.7]]) {
    g.fillEllipse(x, y, 150 * s, 56 * s);
    g.fillEllipse(x - 50 * s, y + 12 * s, 100 * s, 44 * s);
    g.fillEllipse(x + 56 * s, y + 14 * s, 110 * s, 42 * s);
  }
  const ground = scene.add.graphics().setDepth(0.5);
  ground.fillStyle(0x9bd67a, 1).fillEllipse(640, HORIZON + 60, 1700, 190);
  ground.fillStyle(0x7ec850, 1).fillRect(0, HORIZON + 50, width, height - HORIZON - 50);
  ground.fillStyle(0x8ad45c, 1).fillEllipse(360, 480, 520, 120).fillEllipse(900, 560, 620, 130);
}
