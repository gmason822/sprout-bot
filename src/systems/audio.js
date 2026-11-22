// Voice. A line is a list of recorded clips played in order ("need" + "num-3" + "item-apples").
// If any clip is missing, the whole line is spoken with speechSynthesis instead, so a sentence
// is never half recorded voice and half robot voice.

const VOICE_DIR = 'assets/audio/voice/';
const TTS_RATE = 0.85;

/** Pure: decide how to say a line given which clips exist. */
export function planSequence(clipIds, available, tts) {
  if (clipIds.length > 0 && clipIds.every((id) => available.has(id))) {
    return { mode: 'clips', ids: clipIds };
  }
  if (tts) return { mode: 'tts', text: tts };
  // No TTS allowed for this line (letter sounds): play whatever was recorded.
  return { mode: 'clips', ids: clipIds.filter((id) => available.has(id)) };
}

/** Pure: how long to wait for a spoken line before giving up on the "end" event. */
export function ttsTimeoutMs(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return 1500 + words * 600;
}

/** `recorded` is the list of clip names that exist in public/assets/audio/voice/. */
export function createAudio(recorded = []) {
  const names = new Set(recorded);
  const clips = new Map(); // id → HTMLAudioElement, made the first time a clip is needed
  let generation = 0;      // bumped by stop(); in-flight lines check it and bail out
  let current = null;
  let volume = 1;

  const hasTts = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

  function element(id) {
    if (!names.has(id)) return null;
    if (!clips.has(id)) {
      const el = new Audio();
      el.preload = 'auto';
      el.src = `${import.meta.env.BASE_URL}${VOICE_DIR}${id}.mp3`;
      clips.set(id, el);
    }
    return clips.get(id);
  }

  function playClip(id) {
    return new Promise((resolve) => {
      const el = element(id);
      if (!el) return resolve();
      current = el;
      el.currentTime = 0;
      el.volume = volume;
      el.onended = el.onerror = () => resolve();
      el.play().catch(() => resolve());
    });
  }

  function speak(text) {
    return new Promise((resolve) => {
      if (!hasTts()) {
        // Keep the game's pacing even with no voice at all.
        return setTimeout(resolve, 300 * text.split(/\s+/).length);
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = TTS_RATE;
      u.lang = 'en-US';
      u.volume = volume;
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;
      // Some Android builds never fire "end".
      setTimeout(finish, ttsTimeoutMs(text));
      window.speechSynthesis.speak(u);
    });
  }

  function stop() {
    generation++;
    if (current) { current.pause(); current = null; }
    if (hasTts()) window.speechSynthesis.cancel();
  }

  return {
    /** Start loading every recording, so the first request is not delayed. */
    preload() { names.forEach(element); },
    /** Has this clip been recorded? */
    has(id) { return names.has(id); },
    /** Call from the first tap: browsers only allow sound after a user gesture. */
    unlock() {
      if (hasTts()) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      }
    },
    /** Say a line. Any line already playing is cut off. Resolves when it has finished. */
    async say(clipIds, tts) {
      stop();
      const mine = generation;
      const plan = planSequence(clipIds, names, tts);
      if (plan.mode === 'tts') {
        await speak(plan.text);
        return;
      }
      for (const id of plan.ids) {
        if (mine !== generation) return;
        await playClip(id);
      }
    },
    stop,
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); },
  };
}
