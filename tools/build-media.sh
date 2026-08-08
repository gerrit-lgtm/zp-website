#!/usr/bin/env bash
# ZeroPoint cinematic media pipeline (v2 — canvas sequence era).
#
# Input : the Claude Design handoff bundle (8 master clips + activation clip).
# Output: public/media/ — everything the page serves.
#
# The page scrubs a CANVAS IMAGE SEQUENCE, not a video: frames are extracted
# PER SOURCE CLIP (skipping any stitched-master re-encode generation) with
# gradfun debanding for the near-black gradients. 61 (desktop) / 31 (touch)
# frames per clip + a pinned exact final frame, so anchor k sits exactly on
# frame FPC·k. If clip counts change, update FPC/SEQ_COUNT in src/main.js.
#
# The anchor stills f1–f9.jpg + poster tiers were produced separately via the
# Magnific MCP (images_upscale, mode ultra-photo, 2x — fidelity only; the F9
# founder faces are locked). Re-running THIS script does not regenerate them.
#
# Usage: tools/build-media.sh /path/to/handoff/project
set -euo pipefail

SRC="${1:?usage: build-media.sh <handoff project dir>}"
A="$SRC/assets"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media"
mkdir -p "$OUT/seq-1080" "$OUT/seq-720"

CLIPS=(clip-f1-f2 clip-f2-f3 clip-f3-f4 clip-f4-f5 clip-f5-f6 clip-f6-f7 clip-f7-f8 clip-f8-f9)

# ---- 1 · Scrub sequences, extracted per clip (bash arrays are 0-indexed;
#          run this file with bash, not zsh) ----
echo "== scrub sequences =="
rm -f "$OUT"/seq-1080/*.jpg "$OUT"/seq-720/*.jpg
for k in "${!CLIPS[@]}"; do
  c="${CLIPS[$k]}"
  ffmpeg -y -v error -i "$A/$c.mp4" -vf "gradfun=1.2:16" \
    -q:v 2 -frames:v 61 -start_number $((61 * k + 1)) "$OUT/seq-1080/f_%03d.jpg"
  ffmpeg -y -v error -i "$A/$c.mp4" -vf "gradfun=1.2:16,scale=1280:720:flags=lanczos" \
    -q:v 5 -frames:v 31 -start_number $((31 * k + 1)) "$OUT/seq-720/f_%03d.jpg"
done
# pinned exact final frame (F9 FINAL)
ffmpeg -y -v error -sseof -0.06 -i "$A/clip-f8-f9.mp4" -vf "gradfun=1.2:16" \
  -frames:v 1 -q:v 2 "$OUT/seq-1080/f_489.jpg"
ffmpeg -y -v error -sseof -0.06 -i "$A/clip-f8-f9.mp4" -vf "gradfun=1.2:16,scale=1280:720:flags=lanczos" \
  -frames:v 1 -q:v 5 "$OUT/seq-720/f_249.jpg"

# ---- 2 · Activation: played forward once, never scrubbed ----
echo "== activation =="
ffmpeg -y -v error -i "$A/clip-activation.mp4" -an -vf "gradfun=1.2:16" \
  -c:v libx264 -preset slow -crf 19 -g 48 -pix_fmt yuv420p -profile:v high \
  -movflags +faststart "$OUT/activation.mp4"

# ---- 3 · og image ----
echo "== og =="
ffmpeg -y -v error -i "$SRC/uploads/existing exterior sphere image.png" \
  -vf "scale=1200:675:flags=lanczos,crop=1200:630" -frames:v 1 -q:v 3 "$OUT/og.jpg"

echo "== done =="
echo "seq-1080: $(ls "$OUT/seq-1080" | wc -l) frames · seq-720: $(ls "$OUT/seq-720" | wc -l) frames"
