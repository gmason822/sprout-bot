// The build's version, shown small on the title screen and in the parent area so a
// parent can tell when an update has arrived. `vite.config.js` fills it in.

/* global __APP_VERSION__ */
export const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
