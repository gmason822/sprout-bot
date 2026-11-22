// Small drawing and animation helpers shared by the scenes.

/** One look for every numeral and letter: big, dark, with a white edge so it reads on anything. */
export function numberStyle(px) {
  return {
    fontFamily: '"Arial Rounded MT Bold", "Nunito", "Arial", sans-serif',
    fontStyle: 'bold',
    fontSize: `${px}px`,
    color: '#2b2118',
    stroke: '#ffffff',
    strokeThickness: Math.round(px / 9),
    // Drawn at twice the size so text stays sharp when the canvas is scaled up.
    resolution: 2,
  };
}

/** The green ▶ used for "play" and for "send the truck". */
export function makePlayButton(scene, x, y, radius) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x1b5e20, 1).fillCircle(0, 8, radius);
  g.fillStyle(0x43a047, 1).fillCircle(0, 0, radius);
  g.fillStyle(0x66bb6a, 1).fillCircle(0, -radius * 0.08, radius * 0.86);
  g.fillStyle(0xffffff, 1);
  const r = radius * 0.5;
  g.fillTriangle(-r * 0.7, -r, -r * 0.7, r, r, 0);
  c.add(g);
  return c;
}

export function tween(scene, config) {
  return new Promise((resolve) => scene.tweens.add({ ...config, onComplete: resolve }));
}

export function wait(scene, ms) {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}

export function bounce(scene, target, dy = -24, duration = 130) {
  return tween(scene, { targets: target, y: target.y + dy, duration, yoyo: true, ease: 'Quad.out' });
}

/** A big numeral that pops up where something is being counted aloud, then floats away. */
export function popNumber(scene, x, y, n) {
  const text = scene.add.text(x, y, String(n), numberStyle(110)).setOrigin(0.5).setDepth(15).setScale(0);
  scene.tweens.add({ targets: text, scale: 1, duration: 160, ease: 'Back.out' });
  scene.tweens.add({
    targets: text, y: y - 60, alpha: 0, delay: 520, duration: 320,
    onComplete: () => text.destroy(),
  });
}

export function makeConfetti(scene) {
  if (!scene.textures.exists('confetti')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 16, 10);
    g.generateTexture('confetti', 16, 10);
    g.destroy();
  }
  return scene.add.particles(0, 0, 'confetti', {
    speed: { min: 250, max: 620 },
    angle: { min: 200, max: 340 },
    gravityY: 900,
    lifespan: 1800,
    rotate: { min: 0, max: 360 },
    scale: { start: 1.2, end: 0.6 },
    tint: [0xff5252, 0xffd740, 0x40c4ff, 0x69f0ae, 0xff80ab, 0xffffff],
    emitting: false,
  }).setDepth(20);
}

const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

/** An emoji drawn with the device's own emoji font. The padding stops it being clipped. */
export function emoji(scene, x, y, char, px) {
  return scene.add.text(x, y, char, {
    fontFamily: EMOJI_FONT,
    fontSize: `${px}px`,
    padding: { x: Math.round(px * 0.15), y: Math.round(px * 0.22) },
  }).setOrigin(0.5);
}

/**
 * The robot's truck: a container, so things loaded into it ride along.
 * It wears whatever paint and hat he has chosen on the farm.
 */
export function makeTruck(scene, x, y) {
  const farm = scene.registry.get('state')?.farm ?? {};
  const rewards = scene.registry.get('content')?.rewards ?? [];
  const painted = `truck-${farm.paint}`;
  const truck = scene.add.container(x, y).setDepth(5);
  truck.add(scene.add.image(0, 0, farm.paint && scene.textures.exists(painted) ? painted : 'truck').setDisplaySize(440, 240));
  const hat = rewards.find((r) => r.id === farm.hat);
  // The hat sits on the robot's head, over the antenna.
  if (hat?.emoji) truck.add(emoji(scene, -116, -104, hat.emoji, 74));
  return truck;
}

const RAINBOW = [0xef4444, 0xf59e0b, 0xfde047, 0x22c55e, 0x3b82f6, 0xa855f7];

/** How a reward looks: its emoji, or a pot of paint in its colour. */
export function rewardPicture(scene, x, y, reward, size) {
  if (reward.type !== 'paint') return emoji(scene, x, y, reward.emoji, size);
  const g = scene.add.graphics();
  const r = size / 2;
  g.fillStyle(0x5f6b7a, 1).fillRoundedRect(-r * 0.8, -r * 0.55, r * 1.6, r * 1.5, r * 0.2);
  if (reward.value === 'rainbow') {
    RAINBOW.forEach((c, i) => g.fillStyle(c, 1).fillRect(-r * 0.8 + (i * r * 1.6) / RAINBOW.length, -r * 0.75, (r * 1.6) / RAINBOW.length + 1, r * 0.5));
  } else {
    g.fillStyle(parseInt(String(reward.value).slice(1), 16) || 0x4caf50, 1).fillEllipse(0, -r * 0.5, r * 1.6, r * 0.6);
  }
  g.lineStyle(4, 0x37474f, 1).strokeRoundedRect(-r * 0.8, -r * 0.55, r * 1.6, r * 1.5, r * 0.2);
  return scene.add.container(x, y, [g]);
}

/** One delivery as a small picture: the thing, plus its letter or how many. */
export function deliveryIcon(scene, x, y, delivery, size) {
  const icon = scene.add.container(x, y);
  if (scene.textures.exists(delivery.art)) {
    const image = scene.add.image(0, 0, delivery.art).setDisplaySize(size, size);
    if (delivery.tint !== undefined) image.setTint(delivery.tint);
    icon.add(image);
  }
  if (delivery.label) icon.add(scene.add.text(0, 0, delivery.label, numberStyle(size * 0.5)).setOrigin(0.5));
  if (delivery.numeral !== undefined) {
    icon.add(scene.add.text(size * 0.36, size * 0.3, String(delivery.numeral), numberStyle(size * 0.5)).setOrigin(0.5));
  }
  return icon;
}

/**
 * The row of today's deliveries. Empty rings are deliveries still to come, so he
 * can see how much of the day is left without reading a number.
 */
export function drawDayRow(scene, today, deliveriesPerDay, { y = 52, size = 58, depth = 4 } = {}) {
  const gap = size * 1.45;
  const count = Math.max(deliveriesPerDay, today.length);
  const x0 = scene.scale.width / 2 - ((count - 1) * gap) / 2;
  const rings = scene.add.graphics().setDepth(depth);
  const icons = [];
  for (let i = 0; i < count; i++) {
    const x = x0 + i * gap;
    rings.fillStyle(0xffffff, 0.55).fillCircle(x, y, size * 0.62);
    rings.lineStyle(4, 0x5b4636, 0.6).strokeCircle(x, y, size * 0.62);
    if (today[i]) icons.push(deliveryIcon(scene, x, y, today[i], size).setDepth(depth));
  }
  return { rings, icons };
}

/** A big sun: the "start a new day" button. */
export function makeSunButton(scene, x, y, radius) {
  const g = scene.add.graphics();
  g.fillStyle(0xffb300, 1);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillTriangle(
      Math.cos(a - 0.14) * radius, Math.sin(a - 0.14) * radius,
      Math.cos(a + 0.14) * radius, Math.sin(a + 0.14) * radius,
      Math.cos(a) * radius * 1.38, Math.sin(a) * radius * 1.38,
    );
  }
  g.fillStyle(0xf59e0b, 1).fillCircle(0, 4, radius);
  g.fillStyle(0xffd94a, 1).fillCircle(0, 0, radius * 0.94);
  g.fillStyle(0x5b4636, 1).fillCircle(-radius * 0.32, -radius * 0.15, radius * 0.09).fillCircle(radius * 0.32, -radius * 0.15, radius * 0.09);
  g.lineStyle(radius * 0.09, 0x5b4636, 1);
  g.beginPath();
  g.arc(0, radius * 0.08, radius * 0.42, 0.25, Math.PI - 0.25, false);
  g.strokePath();
  return scene.add.container(x, y, [g]);
}

/** A yellow ring for the keyboard / button-box highlight. */
export function drawFocusRing(graphics, target) {
  if (!target) return graphics.setVisible(false);
  graphics.clear().lineStyle(10, 0xffeb3b, 1).strokeCircle(target.x, target.y, target.r + 6);
  graphics.lineStyle(4, 0x5b4636, 1).strokeCircle(target.x, target.y, target.r + 12);
  return graphics.setVisible(true);
}
