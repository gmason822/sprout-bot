// The permanent parts of the home farm. Each one is earned as an "upgrade" reward
// (content/rewards.json, "value") and drawn here. The farm starts with none of them.

export const HORIZON = 250;

// Things stand in front of whatever is behind them: depth follows how far down the
// screen something's feet are.
export const depthAt = (y) => 100 + y / 10;

function fence(scene) {
  const g = scene.add.graphics().setDepth(depthAt(300));
  const y = 300;
  // A gap is left where the path comes through.
  const inGap = (x) => x > 170 && x < 270;
  g.fillStyle(0xe8c58c, 1);
  for (const [from, to] of [[30, 170], [270, 1250]]) {
    g.fillRoundedRect(from, y - 44, to - from, 9, 4);
    g.fillRoundedRect(from, y - 22, to - from, 9, 4);
  }
  for (let x = 40; x <= 1240; x += 64) {
    if (inGap(x)) continue;
    g.fillStyle(0xc99a5b, 1).fillRoundedRect(x - 7, y - 58, 14, 62, 5);
    g.fillStyle(0xe8c58c, 1).fillRoundedRect(x - 7, y - 58, 5, 62, 3);
  }
}

function barn(scene) {
  const g = scene.add.graphics().setDepth(depthAt(296));
  g.fillStyle(0x8e1c1c, 1).fillTriangle(70, 178, 220, 84, 370, 178);
  g.fillStyle(0xc62828, 1).fillRect(90, 172, 260, 128);
  g.fillStyle(0xb71c1c, 1).fillTriangle(96, 174, 220, 98, 344, 174);
  g.lineStyle(7, 0xffffff, 1).strokeTriangle(96, 174, 220, 98, 344, 174);
  // Hayloft window and the big door with its cross.
  g.fillStyle(0x4e2a1a, 1).fillRoundedRect(200, 124, 40, 34, 6);
  g.lineStyle(5, 0xffffff, 1).strokeRoundedRect(200, 124, 40, 34, 6);
  g.fillStyle(0x7f1d1d, 1).fillRect(180, 206, 80, 94);
  g.lineStyle(6, 0xffffff, 1).strokeRect(180, 206, 80, 94);
  g.lineBetween(180, 206, 260, 300).lineBetween(260, 206, 180, 300);
}

function silo(scene) {
  const g = scene.add.graphics().setDepth(depthAt(294));
  g.fillStyle(0x90a4ae, 1).fillRect(372, 130, 70, 170);
  g.fillStyle(0xb0bec5, 1).fillRect(372, 130, 22, 170);
  g.fillStyle(0x607d8b, 1).fillEllipse(407, 130, 78, 60);
  g.fillStyle(0x78909c, 1).fillRect(372, 190, 70, 6).fillRect(372, 246, 70, 6);
}

function pond(scene) {
  const g = scene.add.graphics().setDepth(0.9);
  g.fillStyle(0x4a9d3f, 1).fillEllipse(470, 504, 330, 140);
  g.fillStyle(0x4fc3f7, 1).fillEllipse(470, 500, 300, 118);
  g.fillStyle(0x81d4fa, 1).fillEllipse(440, 486, 150, 44);
  g.fillStyle(0xffffff, 0.7).fillEllipse(520, 520, 60, 10);
}

function tree(scene) {
  // Kept clear of the top-right corner: the sun there is the way into the parent area.
  const x = 650;
  const g = scene.add.graphics().setDepth(depthAt(302));
  g.fillStyle(0x8d5a2b, 1).fillRoundedRect(x - 17, 210, 34, 96, 10);
  g.fillStyle(0x2e7d32, 1).fillCircle(x, 170, 84);
  g.fillStyle(0x43a047, 1).fillCircle(x - 45, 150, 54).fillCircle(x + 45, 150, 54).fillCircle(x, 120, 60);
  g.fillStyle(0xe53935, 1);
  for (const [dx, y] of [[-40, 160], [5, 130], [40, 170], [-10, 190], [25, 110]]) g.fillCircle(x + dx, y, 11);
}

function path(scene) {
  const g = scene.add.graphics().setDepth(0.8);
  g.fillStyle(0xd9b98a, 1);
  g.beginPath();
  g.moveTo(190, 296);
  g.lineTo(250, 296);
  g.lineTo(300, 440);
  g.lineTo(250, 620);
  g.lineTo(130, 620);
  g.lineTo(210, 440);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xc7a474, 1);
  for (const [x, y] of [[222, 330], [240, 400], [232, 480], [204, 550]]) g.fillEllipse(x, y, 26, 10);
}

function windmill(scene) {
  const g = scene.add.graphics().setDepth(depthAt(298));
  g.fillStyle(0xf5efe0, 1);
  g.beginPath();
  g.moveTo(884, 300);
  g.lineTo(964, 300);
  g.lineTo(942, 150);
  g.lineTo(906, 150);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xb9793f, 1).fillTriangle(896, 152, 924, 112, 952, 152);
  g.fillStyle(0x6b4423, 1).fillRoundedRect(910, 250, 28, 50, 6);
  // The sails turn slowly, so the farm never looks frozen.
  const sails = scene.add.graphics();
  sails.fillStyle(0xd9a05b, 1);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const at = (along, across) => [along * c - across * s, along * s + across * c];
    const [x1, y1] = at(12, -5);
    const [x2, y2] = at(96, -20);
    const [x3, y3] = at(96, 6);
    const [x4, y4] = at(12, 5);
    sails.fillPoints([{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }, { x: x4, y: y4 }], true);
  }
  sails.fillStyle(0x6b4423, 1).fillCircle(0, 0, 10);
  const hub = scene.add.container(924, 140, [sails]).setDepth(depthAt(299));
  scene.tweens.add({ targets: hub, angle: 360, duration: 9000, repeat: -1 });
}

function rainbow(scene) {
  // Behind the ground, so only the arch above the horizon shows.
  const g = scene.add.graphics().setDepth(0.2);
  [0xef4444, 0xf59e0b, 0xfde047, 0x22c55e, 0x3b82f6, 0xa855f7].forEach((colour, i) => {
    g.lineStyle(16, colour, 0.85);
    g.beginPath();
    g.arc(640, HORIZON + 40, 330 - i * 16, Math.PI, 0, false);
    g.strokePath();
  });
}

const UPGRADES = { fence, barn, silo, pond, tree, path, windmill, rainbow };

export const UPGRADE_IDS = Object.keys(UPGRADES);

/** Draw every upgrade he owns. `owned` is a list of upgrade names. */
export function drawUpgrades(scene, owned) {
  for (const id of owned) UPGRADES[id]?.(scene);
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
  for (const [x, y, s] of [[300, 80, 1], [760, 60, 0.75]]) {
    g.fillEllipse(x, y, 150 * s, 56 * s);
    g.fillEllipse(x - 50 * s, y + 12 * s, 100 * s, 44 * s);
    g.fillEllipse(x + 56 * s, y + 14 * s, 110 * s, 42 * s);
  }
  const ground = scene.add.graphics().setDepth(0.5);
  ground.fillStyle(0x9bd67a, 1).fillEllipse(640, HORIZON + 60, 1700, 190);
  ground.fillStyle(0x7ec850, 1).fillRect(0, HORIZON + 50, width, height - HORIZON - 50);
  ground.fillStyle(0x8ad45c, 1).fillEllipse(360, 470, 520, 120).fillEllipse(900, 560, 620, 130);
}
