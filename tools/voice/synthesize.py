"""Step 2 of `npm run voice`: make an MP3 for every line that does not have one yet.

    python synthesize.py <jobs.json> <model dir> <output dir> <built.json>

Lines whose text or voice settings have not changed are left alone, so after a small
edit only the affected lines are made again. Files for lines the game no longer says
are deleted.
"""
import json
import re
import sys
import time
from pathlib import Path

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

jobs_path, model_dir, out_dir, built_path = (Path(p) for p in sys.argv[1:5])
jobs = json.loads(jobs_path.read_text())
settings = jobs["settings"]
out_dir.mkdir(parents=True, exist_ok=True)
built = json.loads(built_path.read_text()) if built_path.exists() else {}


def signature(spoken):
    """Everything that affects how a line sounds. If it changes, the line is remade."""
    return json.dumps([spoken, settings], sort_keys=True)


def tidy(samples, rate):
    """Trim the silence the model leaves at each end, but gently.

    The library's own trim cuts close enough to clip the last sound of a short word,
    which is a large part of why very short lines can sound unnatural. Here a little
    room is kept, the ending is faded, and a short rest is added so that lines played
    one after another do not run together.
    """
    loud = np.flatnonzero(np.abs(samples) > 0.012)
    if loud.size:
        start = max(0, loud[0] - int(rate * 0.04))
        end = min(len(samples), loud[-1] + int(rate * 0.20))
        samples = samples[start:end].copy()
    fade = min(len(samples), int(rate * 0.06))
    if fade:
        samples[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)
    return np.concatenate([samples, np.zeros(int(rate * 0.10), dtype=np.float32)])


# Words that begin with a hiss or a puff of air: s, f, sh, ch, h, p, t, k, c.
# ("th" is left out: in "that" and "the" it is voiced.)
STARTS_UNVOICED = re.compile(r"^[^a-z]*(s|f|ch|h|p|k|c|t(?!h))", re.IGNORECASE)


def remove_stray_onset(samples, rate, spoken):
    """Cut a short voiced blip that the engine sometimes puts before a hiss.

    "Six." comes out with about 40 ms of soft voice before the "s", which is heard as
    "uh-six". This only acts on lines that start with an unvoiced sound, and only if
    the voiced part is brief and a real hiss follows straight after, so a word that
    truly starts with a vowel is never touched.
    """
    if not STARTS_UNVOICED.match(spoken):
        return samples
    frame = int(rate * 0.01)
    peak = float(np.max(np.abs(samples))) or 1.0
    kinds = []
    for i in range(0, min(len(samples), int(rate * 0.6)) - frame, frame):
        chunk = samples[i:i + frame]
        level = float(np.sqrt(np.mean(chunk ** 2))) / peak
        crossings = float(np.mean(np.abs(np.diff(np.sign(chunk))) > 0))
        kinds.append("." if level < 0.02 else ("s" if crossings > 0.25 else "v"))
    profile = "".join(kinds)
    match = re.match(r"^(\.*)(v{1,8})(s{4,})", profile)
    if not match:
        return samples
    cut = (len(match.group(1)) + len(match.group(2))) * frame
    cut = max(0, cut - int(rate * 0.01))
    kept = samples[cut:].copy()
    fade = min(len(kept), int(rate * 0.008))
    kept[:fade] *= np.linspace(0.0, 1.0, fade, dtype=np.float32)
    return np.concatenate([np.zeros(int(rate * 0.03), dtype=np.float32), kept])


def stretch_keeping_pitch(samples, stretch, rate):
    """Make speech `stretch` times longer without lowering its pitch (WSOLA).

    The sound is rebuilt from short overlapping windows taken at a slower rate than
    they are laid down. Each window is nudged a few milliseconds to line up with the
    one before, which is what keeps the voice from sounding hollow or wobbly.
    """
    window = int(rate * 0.04)
    window += window % 2
    hop_out = window // 2
    hop_in = hop_out / stretch
    reach = int(rate * 0.012)
    shape = np.hanning(window + 1)[:window]  # halves overlap to a constant 1
    source = np.concatenate([np.zeros(reach + hop_out), samples.astype(np.float64), np.zeros(2 * window + 2 * reach)])
    count = int(len(samples) / hop_in) + 2
    out = np.zeros(count * hop_out + window)
    previous = None
    for k in range(count):
        ideal = reach + int(round(k * hop_in))
        if previous is None:
            start = ideal
        else:
            follows = source[previous + hop_out:previous + hop_out + window]
            region = source[ideal - reach:ideal + reach + window]
            start = ideal - reach + int(np.argmax(np.correlate(region, follows, mode="valid")))
        out[k * hop_out:k * hop_out + window] += source[start:start + window] * shape
        previous = start
    return out[hop_out:hop_out + int(len(samples) * stretch)].astype(np.float32)


def slow_down(samples, engine_speed, speed, rate):
    """Take the recording from the engine's pace to the pace he should hear.

    The engine is not simply asked to speak slowly: at 0.8 it stretches the start of
    a short line into an audible "uh" ("a five"). Measured on "Six.", that stray
    sound is 40 ms at normal speed and 130 ms at 0.8. So the engine speaks at its
    natural pace and the audio is slowed afterwards.
    """
    stretch = engine_speed / speed
    if abs(stretch - 1.0) < 0.01:
        return samples
    return stretch_keeping_pitch(samples, stretch, rate)


def to_mp3(samples, rate):
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(int(settings["bitrate"]))
    encoder.set_in_sample_rate(rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return encoder.encode(pcm.tobytes()) + encoder.flush()


wanted = {line["key"]: line for line in jobs["lines"]}
todo = [
    line for line in jobs["lines"]
    if built.get(line["key"]) != signature(line["spoken"]) or not (out_dir / f"{line['key']}.mp3").exists()
]

removed = 0
for path in out_dir.glob("*.mp3"):
    if path.stem not in wanted:
        path.unlink()
        removed += 1
built = {key: sig for key, sig in built.items() if key in wanted}

if todo:
    kokoro = Kokoro(str(model_dir / "kokoro-v1.0.onnx"), str(model_dir / "voices-v1.0.bin"))
    start = time.time()
    seconds = 0.0
    for i, line in enumerate(todo, 1):
        engine_speed = float(settings.get("engineSpeed", 1.0))
        samples, rate = kokoro.create(
            line["spoken"], voice=settings["voice"], speed=engine_speed, lang=settings["lang"],
            trim=False, sentence_pause=float(settings["sentencePause"]),
        )
        samples = tidy(np.asarray(samples, dtype=np.float32), rate)
        samples = remove_stray_onset(samples, rate, line["spoken"])
        samples = slow_down(samples, engine_speed, float(settings["speed"]), rate)
        (out_dir / f"{line['key']}.mp3").write_bytes(to_mp3(samples, rate))
        built[line["key"]] = signature(line["spoken"])
        seconds += len(samples) / rate
        if i % 40 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)} made", flush=True)
            # Saved as it goes, so an interrupted run carries on where it stopped.
            built_path.write_text(json.dumps(built, indent=1, sort_keys=True) + "\n")
    print(f"made {len(todo)} lines ({seconds:.0f}s of speech) in {time.time() - start:.0f}s")

built_path.write_text(json.dumps(built, indent=1, sort_keys=True) + "\n")
size = sum(p.stat().st_size for p in out_dir.glob("*.mp3"))
print(f"{len(wanted)} lines in total, {len(todo)} made, {len(wanted) - len(todo)} unchanged, {removed} removed; {size / 1e6:.1f} MB")
