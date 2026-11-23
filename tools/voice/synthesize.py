"""Step 2 of `npm run voice`: make an MP3 for every line that does not have one yet.

    python synthesize.py <jobs.json> <model dir> <output dir> <built.json>

Lines whose text or voice settings have not changed are left alone, so after a small
edit only the affected lines are made again. Files for lines the game no longer says
are deleted.
"""
import json
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
        samples, rate = kokoro.create(
            line["spoken"], voice=settings["voice"], speed=float(settings["speed"]), lang=settings["lang"],
            trim=False, sentence_pause=float(settings["sentencePause"]),
        )
        samples = tidy(np.asarray(samples, dtype=np.float32), rate)
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
