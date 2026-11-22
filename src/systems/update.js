// Keeps an installed copy of the game up to date without anyone pressing "update".
//
// The service worker fetches a new version in the background and takes over as soon
// as it is ready, but the page already on screen keeps running the old code. An
// installed app on Android can stay alive in the background for days, so "it updates
// next time you open it" may never happen. Instead we notice the takeover and let the
// game reload itself at a moment when nothing is lost.

/**
 * Calls `onReady` once when a newer version has taken over this page.
 * Also checks for a new version every time the game comes back to the foreground.
 */
export function watchForUpdates(onReady, { nav = globalThis.navigator, doc = globalThis.document } = {}) {
  if (!nav || !('serviceWorker' in nav) || !doc) return;
  const sw = nav.serviceWorker;

  // On the very first visit the worker "takes over" too, but that is an install,
  // not an update, and reloading for it would be pointless.
  const hadWorker = Boolean(sw.controller);
  let told = false;
  sw.addEventListener('controllerchange', () => {
    if (!hadWorker || told) return;
    told = true;
    onReady();
  });

  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) return;
    sw.getRegistration().then((registration) => registration?.update()).catch(() => {});
  });
}
