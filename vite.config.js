import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative paths so the build works from any folder on a static host
  // (GitHub Pages serves it from /sprout-bot/).
  base: './',
  build: {
    // Phaser is one big library; the default warning is just noise here.
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    VitePWA({
      // A new version installs itself the next time the game is opened; a 4-year-old
      // cannot be asked to press "update".
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sprout Bot',
        short_name: 'Sprout Bot',
        description: 'A farm learning game: help the animals with a robot truck.',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#7cc4f0',
        theme_color: '#7cc4f0',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the game needs, so it plays with no connection at all.
        // Voice clips are included as they are recorded.
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
