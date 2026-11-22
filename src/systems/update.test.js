import { describe, it, expect, vi } from 'vitest';
import { watchForUpdates } from './update.js';

function fakeBrowser({ controller }) {
  const swListeners = {};
  const docListeners = {};
  const registration = { update: vi.fn(() => Promise.resolve()) };
  const nav = {
    serviceWorker: {
      controller,
      addEventListener: (type, fn) => { swListeners[type] = fn; },
      getRegistration: () => Promise.resolve(registration),
    },
  };
  const doc = { hidden: false, addEventListener: (type, fn) => { docListeners[type] = fn; } };
  return { nav, doc, registration, swListeners, docListeners };
}

describe('watchForUpdates', () => {
  it('reports a newer version taking over, once', () => {
    const b = fakeBrowser({ controller: {} });
    const onReady = vi.fn();
    watchForUpdates(onReady, b);
    expect(onReady).not.toHaveBeenCalled();
    b.swListeners.controllerchange();
    b.swListeners.controllerchange();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('ignores the takeover on a first install', () => {
    const b = fakeBrowser({ controller: null });
    const onReady = vi.fn();
    watchForUpdates(onReady, b);
    b.swListeners.controllerchange();
    expect(onReady).not.toHaveBeenCalled();
  });

  it('checks for a new version when the game comes back to the front', async () => {
    const b = fakeBrowser({ controller: {} });
    watchForUpdates(() => {}, b);
    b.doc.hidden = true;
    b.docListeners.visibilitychange();
    await Promise.resolve();
    expect(b.registration.update).not.toHaveBeenCalled();
    b.doc.hidden = false;
    b.docListeners.visibilitychange();
    await Promise.resolve();
    expect(b.registration.update).toHaveBeenCalledTimes(1);
  });

  it('does nothing where service workers do not exist', () => {
    expect(() => watchForUpdates(() => {}, { nav: {}, doc: {} })).not.toThrow();
    expect(() => watchForUpdates(() => {}, { nav: undefined, doc: undefined })).not.toThrow();
  });
});
