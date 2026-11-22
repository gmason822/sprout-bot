import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const VOICE_DIR = fileURLToPath(new URL('./public/assets/audio/voice', import.meta.url));
const VOICE_MODULE = 'virtual:voice-clips';

/**
 * Exposes the names of the recorded voice clips as `virtual:voice-clips`, so the game
 * knows which lines have a recording without asking the server for every possible file.
 */
function voiceClips() {
  const resolved = `\0${VOICE_MODULE}`;
  return {
    name: 'voice-clips',
    resolveId(source) {
      return source === VOICE_MODULE ? resolved : null;
    },
    load(id) {
      if (id !== resolved) return null;
      const names = existsSync(VOICE_DIR)
        ? readdirSync(VOICE_DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4))
        : [];
      return `export default ${JSON.stringify(names.sort())};`;
    },
    // While developing, dropping a new recording into the folder reloads the game.
    configureServer(server) {
      const refresh = (file) => {
        if (!file.startsWith(VOICE_DIR)) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

export default defineConfig({
  // Relative paths so the build works from any folder on a static host
  // (GitHub Pages serves it from /sprout-bot/).
  base: './',
  build: {
    // Phaser is one big library; the default warning is just noise here.
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    voiceClips(),
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
