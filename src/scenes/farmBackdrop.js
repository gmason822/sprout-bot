// The farm background, shared by every scene so the world never jumps between screens.

export const GROUND_Y = 440;

export function drawFarmBackdrop(scene) {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(0);

  // Sky
  g.fillGradientStyle(0x6ebcf0, 0x6ebcf0, 0xcdeeff, 0xcdeeff, 1);
  g.fillRect(0, 0, width, GROUND_Y);

  // Sun
  g.fillStyle(0xfff3b0, 0.6).fillCircle(1160, 90, 78);
  g.fillStyle(0xffd94a, 1).fillCircle(1160, 90, 56);

  // Clouds
  g.fillStyle(0xffffff, 0.9);
  for (const [x, y, s] of [[360, 70, 1], [960, 40, 0.7]]) {
    g.fillEllipse(x, y, 150 * s, 56 * s);
    g.fillEllipse(x - 50 * s, y + 12 * s, 100 * s, 44 * s);
    g.fillEllipse(x + 56 * s, y + 14 * s, 110 * s, 42 * s);
  }

  // Far hills
  g.fillStyle(0x9bd67a, 1);
  g.fillEllipse(260, GROUND_Y + 30, 760, 220);
  g.fillEllipse(1020, GROUND_Y + 40, 900, 260);

  // Grass, then the dirt road the truck lives on
  g.fillStyle(0x7ec850, 1).fillRect(0, GROUND_Y, width, height - GROUND_Y);
  g.fillStyle(0xd9b98a, 1).fillRect(0, 610, width, 110);
  g.fillStyle(0xc7a474, 1).fillRect(0, 610, width, 8);

  return g;
}
