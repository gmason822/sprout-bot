// The farm background, shared by every scene so the world never jumps between screens.
// It can be drawn at any time of day, and moved on smoothly (see src/systems/sky.js).

import { skyAt, mixColour } from '../systems/sky.js';

export const GROUND_Y = 440;

const CLOUDS = [[360, 70, 1], [960, 40, 0.7]];
const MOON = { x: 1085, y: 118, radius: 50 };

/** The same stars every night: a small fixed scatter across the sky. */
function starField() {
  const stars = [];
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 46; i++) {
    stars.push({ x: 30 + next() * 1220, y: 14 + next() * 300, r: 2 + next() * 3, twinkles: i % 3 === 0 });
  }
  return stars;
}

/**
 * Draw the backdrop at time `time` (0 morning, 1 sunset, 2 night).
 * Returns { setTime(t) } so a scene can move the day on.
 */
export function drawFarmBackdrop(scene, time = 0) {
  const { width, height } = scene.scale;
  const sky = scene.add.graphics().setDepth(0);
  const sun = scene.add.graphics().setDepth(0.05);
  const clouds = scene.add.graphics().setDepth(0.15);
  const land = scene.add.graphics().setDepth(0.2);

  // Stars and moon sit between the sky and the clouds, and fade in after sunset.
  const steady = scene.add.graphics();
  const twinkling = scene.add.graphics();
  for (const star of starField()) {
    (star.twinkles ? twinkling : steady).fillStyle(0xffffff, 1).fillCircle(star.x, star.y, star.r);
  }
  const moon = scene.add.graphics();
  moon.fillStyle(0xfff8d6, 0.25).fillCircle(MOON.x, MOON.y, MOON.radius * 1.5);
  moon.fillStyle(0xfff8d6, 1).fillCircle(MOON.x, MOON.y, MOON.radius);
  moon.fillStyle(0xe6dcae, 1).fillCircle(MOON.x - 16, MOON.y - 10, 9).fillCircle(MOON.x + 14, MOON.y + 12, 12).fillCircle(MOON.x + 8, MOON.y - 22, 6);
  const nightSky = scene.add.container(0, 0, [steady, twinkling, moon]).setDepth(0.1).setAlpha(0);
  scene.tweens.add({ targets: twinkling, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

  const setTime = (t) => {
    const look = skyAt(t);

    sky.clear();
    sky.fillGradientStyle(look.top, look.top, look.bottom, look.bottom, 1);
    sky.fillRect(0, 0, width, GROUND_Y);

    sun.clear();
    sun.fillStyle(mixColour(look.sun, 0xffffff, 0.6), 0.6).fillCircle(look.sunX, look.sunY, 78);
    sun.fillStyle(look.sun, 1).fillCircle(look.sunX, look.sunY, 56);

    nightSky.setAlpha(look.night);

    clouds.clear();
    clouds.fillStyle(look.cloud, 0.9);
    for (const [x, y, s] of CLOUDS) {
      clouds.fillEllipse(x, y, 150 * s, 56 * s);
      clouds.fillEllipse(x - 50 * s, y + 12 * s, 100 * s, 44 * s);
      clouds.fillEllipse(x + 56 * s, y + 14 * s, 110 * s, 42 * s);
    }

    land.clear();
    // Far hills
    land.fillStyle(look.hill, 1);
    land.fillEllipse(260, GROUND_Y + 30, 760, 220);
    land.fillEllipse(1020, GROUND_Y + 40, 900, 260);
    // Grass, then the dirt road the truck lives on
    land.fillStyle(look.grass, 1).fillRect(0, GROUND_Y, width, height - GROUND_Y);
    land.fillStyle(look.road, 1).fillRect(0, 610, width, 110);
    land.fillStyle(mixColour(look.road, 0x000000, 0.1), 1).fillRect(0, 610, width, 8);
  };
  setTime(time);

  return {
    setTime,
    /** Move the day on from `from` to `to` over `duration` ms. */
    moveTo(from, to, duration = 1600) {
      if (from === to) return setTime(to);
      setTime(from);
      scene.tweens.addCounter({ from, to, duration, ease: 'Sine.inOut', onUpdate: (tween) => setTime(tween.getValue()) });
    },
  };
}
