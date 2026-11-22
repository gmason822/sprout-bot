import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the build works from any folder on a static host.
  base: './',
  build: {
    // Phaser is one big library; the default warning is just noise here.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
