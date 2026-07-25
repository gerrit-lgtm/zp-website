#!/usr/bin/env bash
# ZeroPoint — build the scroll-scrubbed backdrop film from generated clips.
#
# Input:  tools/film-src/clip[ABC].mp4  (raw Seedance renders, 1080p 24fps)
# Output: assets/film/descent.mp4  + .webm + poster.jpg
#
# WHY THIS EXISTS — the raw renders cannot be shipped as-is:
#
#  1. ONE KEYFRAME. Seedance emits a single I-frame at frame 0 and P-frames
#     for the rest. Seeking to t=7s then costs ~170 frames of decode, which
#     is what makes a naive scrub build stutter. We force GOP=6 (a keyframe
#     every 0.25s at 24fps), turning every seek into at most 6 frames of
#     decode. This is the single most important setting in this file.
#  2. AUDIO. The renders carry an AAC track nobody will ever hear. Dropping
#     it costs nothing and is most of the file-size win.
#  3. FASTSTART. The moov atom must lead so the browser can seek before the
#     whole file has arrived.
#
# Denser GOP = smoother scrub but bigger file. 6 is the balance point; if the
# file must shrink, raise CRF before touching -g.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/tools/film-src"
OUT="$ROOT/assets/film"
mkdir -p "$OUT"

CRF="${CRF:-23}"
GOP="${GOP:-6}"

# Clips are concatenated in filename order, so they must sort into story order.
#
# THE CLIP MAP — every one of the 7 beats must be a keyframe of some clip, or
# that world simply does not appear in the film. This was learned the hard way:
# the first cut spanned beats 2->4 with one clip and World 02 (the banded gas
# giant) vanished entirely, leaving its copy playing over the wrong world.
#
#   clipA  beat 0 -> 2   12s   core, departure, arrive World 01
#   clipB  beat 2 -> 3    6s   World 01 -> World 02
#   clipC  beat 3 -> 4    6s   World 02 -> World 03
#   clipD  beat 4 -> 5    6s   World 03 -> World 04
#   clipE  beat 5 -> 6    6s   World 04 -> origin
#                       ----
#                        36s   = 6 beat-intervals x 6s, uniform
#
# Durations are deliberately UNEQUAL: each clip's length is proportional to how
# many beat-intervals it spans, so a linear scroll->time mapping puts each world
# under its own copy. Do not "tidy" them to equal lengths.
#
# Video is priced PER SECOND, so two 6s clips cost exactly what one 12s clip
# costs. There is never a saving in spanning two beats with one clip — only a
# lost beat. Always split.
echo "→ concatenating clips (they share keyframes, so the seams are continuous)"
LIST="$(mktemp)"
# Glob directly and quote every expansion — the repo path contains spaces,
# so `for f in $(ls ...)` word-splits it into nonsense.
shopt -s nullglob
FOUND=0
for f in "$SRC"/clip*.mp4; do
  echo "  + $(basename "$f") $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s"
  echo "file '$f'" >> "$LIST"
  FOUND=1
done
[ "$FOUND" = 1 ] || { echo "no clips in $SRC"; exit 1; }
ffmpeg -v error -f concat -safe 0 -i "$LIST" -c copy -y "$OUT/.raw.mp4"
rm -f "$LIST"

echo "→ encoding H.264 for scrubbing (GOP=$GOP, CRF=$CRF, no audio)"
ffmpeg -v error -i "$OUT/.raw.mp4" -an \
  -c:v libx264 -profile:v high -crf "$CRF" -preset slow \
  -g "$GOP" -keyint_min "$GOP" -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart -y "$OUT/descent.mp4"

# NO VP9/webm on purpose. It encodes ~30% smaller, but this file is SEEKED
# every frame rather than played, and H.264 has hardware-accelerated seek on
# every target device where VP9 frequently does not. A jankier scrub is a
# worse outcome than 4 MB, and shipping both just means shipping a dead file.

echo "→ poster = first frame, so a failed video degrades to the right image"
ffmpeg -v error -i "$OUT/.raw.mp4" -frames:v 1 -q:v 3 -y "$OUT/poster.jpg"

rm -f "$OUT/.raw.mp4"

echo
echo "built:"
for f in "$OUT/descent.mp4" "$OUT/poster.jpg"; do
  [ -f "$f" ] && printf '  %-22s %6s KB\n' "$(basename "$f")" "$(( $(wc -c < "$f") / 1024 ))"
done
KF=$(ffprobe -v error -select_streams v -show_entries frame=key_frame -of csv=p=0 "$OUT/descent.mp4" | grep -c '^1' || true)
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/descent.mp4")
echo "  keyframes: $KF over ${DUR}s  (a seek costs at most $GOP frames of decode)"
