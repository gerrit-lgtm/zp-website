#!/usr/bin/env bash
# ZeroPoint cinematic media pipeline.
#
# Input : the Claude Design handoff bundle (8 master clips + activation clip + stills).
# Output: public/media/ — everything the page serves.
#
# The trap this script exists for: the generated clips carry exactly ONE
# H.264 keyframe (frame 0). Scrubbing such a file means decoding up to ~120
# P-frames per seek — unusable. We re-encode the stitched master with GOP=6
# (a keyframe every 250ms), drop the silent AAC track, and faststart the moov
# atom so Range requests can seek immediately.
#
# Usage: tools/build-media.sh /path/to/handoff/project
set -euo pipefail

SRC="${1:?usage: build-media.sh <handoff project dir>}"
A="$SRC/assets"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media"
mkdir -p "$OUT"

CLIPS=(clip-f1-f2 clip-f2-f3 clip-f3-f4 clip-f4-f5 clip-f5-f6 clip-f6-f7 clip-f7-f8 clip-f8-f9)

# ---- 1 · Master: concat the 8 locked clips, one continuous 40.375s pull-back ----
INPUTS=(); CHAIN=""
for i in "${!CLIPS[@]}"; do
  INPUTS+=(-i "$A/${CLIPS[$i]}.mp4")
  CHAIN+="[$i:v:0]"
done
CHAIN+="concat=n=${#CLIPS[@]}:v=1:a=0"

echo "== master-1080 =="
ffmpeg -y -v error "${INPUTS[@]}" -filter_complex "${CHAIN}[v]" -map "[v]" \
  -c:v libx264 -preset slow -crf 22 -g 6 -keyint_min 6 -sc_threshold 0 \
  -pix_fmt yuv420p -profile:v high -movflags +faststart "$OUT/master-1080.mp4"

echo "== master-720 =="
ffmpeg -y -v error "${INPUTS[@]}" -filter_complex "${CHAIN}[vc];[vc]scale=1280:720:flags=lanczos[v]" -map "[v]" \
  -c:v libx264 -preset slow -crf 23 -g 6 -keyint_min 6 -sc_threshold 0 \
  -pix_fmt yuv420p -profile:v high -movflags +faststart "$OUT/master-720.mp4"

# ---- 2 · Activation: played forward once, never scrubbed — normal GOP is fine ----
echo "== activation =="
ffmpeg -y -v error -i "$A/clip-activation.mp4" -an \
  -c:v libx264 -preset slow -crf 21 -g 48 -pix_fmt yuv420p -profile:v high \
  -movflags +faststart "$OUT/activation.mp4"

# ---- 3 · Anchor stills F1–F9, pulled from the master itself (grading matches) ----
# Boundaries: 7 clips of 5.041667s then one of 5.083333s.
echo "== anchor stills =="
TIMES=(0.03 5.0417 10.0833 15.1250 20.1667 25.2083 30.2500 35.2917 40.3200)
for i in "${!TIMES[@]}"; do
  n=$((i+1))
  ffmpeg -y -v error -ss "${TIMES[$i]}" -i "$OUT/master-1080.mp4" -frames:v 1 -q:v 3 "$OUT/f$n.jpg"
done

# ---- 4 · Posters + og ----
echo "== posters =="
ffmpeg -y -v error -i "$OUT/activation.mp4" -frames:v 1 -q:v 3 "$OUT/poster-unlit.jpg"
ffmpeg -y -v error -i "$SRC/uploads/existing exterior sphere image.png" \
  -vf "scale=1200:675:flags=lanczos,crop=1200:630" -frames:v 1 -q:v 3 "$OUT/og.jpg"

echo "== done =="
ls -la "$OUT"
