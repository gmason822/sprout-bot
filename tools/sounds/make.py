"""Cut the animal noises out of their source recordings.

    python make.py <folder of source recordings> <repository root> [--look]

The sources are free-licence recordings from Wikimedia Commons (CREDITS.md lists each
one). They are not kept in the repository. This cuts one short, clean noise out of
each, evens out the loudness, and writes public/assets/audio/animals/<name>.mp3 and
src/systems/animalClips.js. With --look it only prints a picture of each source's
loudness over time, for choosing where to cut.

Needs gst-launch-1.0 (to decode Ogg and WAV) and the voice tool's Python environment
(numpy and lameenc).
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import lameenc
import numpy as np

RATE = 24000
src_dir, repo = Path(sys.argv[1]), Path(sys.argv[2])
look = "--look" in sys.argv

# name: the parts to join. Each part is (source file, how to cut it):
#   ("event", longest gap inside one noise in s, longest it may be in s)
#       the loudest single noise in the recording
#   ("span", start, end)   exactly these seconds
RECIPES = json.loads((Path(__file__).parent / "recipes.json").read_text())


def decode(path):
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "out.wav"
        subprocess.run([
            "gst-launch-1.0", "-q", "filesrc", f"location={path}", "!", "decodebin", "!", "audioconvert", "!",
            "audioresample", "!", f"audio/x-raw,format=S16LE,channels=1,rate={RATE}", "!", "wavenc", "!",
            "filesink", f"location={out}",
        ], check=True, capture_output=True)
        with wave.open(str(out)) as w:
            return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def loudness(samples, ms=10):
    n = int(RATE * ms / 1000)
    frames = samples[: len(samples) // n * n].reshape(-1, n)
    return np.sqrt(np.mean(frames ** 2, axis=1)), n


def events(samples, gap):
    """Stretches of sound, as (start, end) in samples, joined across gaps shorter than `gap` s."""
    level, n = loudness(samples)
    active = level > 0.15 * level.max()
    spans, start, quiet = [], None, 0
    for i, on in enumerate(active):
        if on:
            start = i if start is None else start
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet * n > gap * RATE:
                spans.append((start * n, (i - quiet + 1) * n))
                start, quiet = None, 0
    if start is not None:
        spans.append((start * n, (len(active) - quiet) * n))
    return spans


def cut(samples, how):
    if how[0] == "span":
        return samples[int(how[1] * RATE): int(how[2] * RATE)]
    _, gap, longest = how
    spans = [s for s in events(samples, gap) if s[1] - s[0] > 0.12 * RATE]
    # The one with the most sound in it, which is the animal rather than a bump or a click.
    a, b = max(spans, key=lambda s: float(np.sum(samples[s[0]:s[1]] ** 2)))
    a = max(0, a - int(0.04 * RATE))
    b = min(len(samples), b + int(0.10 * RATE), a + int(longest * RATE))
    return samples[a:b]


def finish(samples):
    samples = samples.copy()
    fade_in, fade_out = int(0.008 * RATE), min(len(samples) // 3, int(0.07 * RATE))
    samples[:fade_in] *= np.linspace(0, 1, fade_in)
    samples[-fade_out:] *= np.linspace(1, 0, fade_out)
    return samples * (0.85 / (np.max(np.abs(samples)) or 1.0))


def sketch(samples, ms=100):
    level, _ = loudness(samples, ms)
    top = level.max() or 1.0
    return "".join(" .:-=+*#%@"[min(9, int(10 * v / top))] for v in level)


def to_mp3(samples):
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(64)
    encoder.set_in_sample_rate(RATE)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return encoder.encode((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes()) + encoder.flush()


if look:
    for path in sorted(p for p in src_dir.iterdir() if p.suffix != ".json"):
        samples = decode(path)
        spans = events(samples, 0.25)
        print(f"{path.name}  {len(samples) / RATE:.1f}s  events: " + " ".join(f"{a / RATE:.2f}-{b / RATE:.2f}" for a, b in spans[:14]))
        print("   " + sketch(samples)[:260])
    sys.exit(0)

out_dir = repo / "public/assets/audio/animals"
out_dir.mkdir(parents=True, exist_ok=True)
lengths = {}
for name, parts in RECIPES.items():
    pieces = []
    for i, (source, how) in enumerate(parts):
        if i:
            pieces.append(np.zeros(int(0.13 * RATE), dtype=np.float32))
        pieces.append(finish(cut(decode(src_dir / source), how)))
    samples = np.concatenate(pieces)
    (out_dir / f"{name}.mp3").write_bytes(to_mp3(samples))
    lengths[name] = round(len(samples) / RATE, 2)
    print(f"{name:7} {lengths[name]:.2f}s  {sketch(samples, 50)}")
for stale in out_dir.glob("*.mp3"):
    if stale.stem not in RECIPES:
        stale.unlink()

table = "\n".join(f"  {name}: {seconds}," for name, seconds in lengths.items())
(repo / "src/systems/animalClips.js").write_text(
    "// The recorded animal noises in public/assets/audio/animals/, and how long each lasts\n"
    "// in seconds. Written by tools/sounds/make.py; do not edit by hand.\n\n"
    f"export const ANIMAL_CLIPS = {{\n{table}\n}};\n"
)
