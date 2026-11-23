#!/usr/bin/env bash
# Makes the game's voice: one MP3 per line, in public/assets/audio/voice/lines/.
# Needs the Kokoro model and a Python environment, which live outside the repository.
# See docs/AUDIO.md for the one-time setup.
set -euo pipefail

home="${SPROUT_VOICE_HOME:-$HOME/.cache/sprout-bot-voice}"
python="$home/venv/bin/python"
root="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ ! -x "$python" || ! -f "$home/model/kokoro-v1.0.onnx" ]]; then
  echo "The voice model is not set up in $home. See docs/AUDIO.md." >&2
  exit 1
fi

jobs="$(mktemp)"
trap 'rm -f "$jobs"' EXIT
node "$root/tools/voice/lines.mjs" "$jobs"
# -I keeps Python from picking up modules from the current folder.
"$python" -I "$root/tools/voice/synthesize.py" "$jobs" "$home/model" "$root/public/assets/audio/voice/lines" "$root/tools/voice/built.json"
