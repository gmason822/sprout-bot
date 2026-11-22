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

/** The robot's truck: a container, so things loaded into it ride along. */
export function makeTruck(scene, x, y) {
  const truck = scene.add.container(x, y).setDepth(5);
  truck.add(scene.add.image(0, 0, 'truck').setDisplaySize(440, 240));
  return truck;
}

/** A yellow ring for the keyboard / button-box highlight. */
export function drawFocusRing(graphics, target) {
  if (!target) return graphics.setVisible(false);
  graphics.clear().lineStyle(10, 0xffeb3b, 1).strokeCircle(target.x, target.y, target.r + 6);
  graphics.lineStyle(4, 0x5b4636, 1).strokeCircle(target.x, target.y, target.r + 12);
  return graphics.setVisible(true);
}
