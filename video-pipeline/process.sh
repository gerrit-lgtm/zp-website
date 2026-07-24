#!/usr/bin/env bash
# ZeroPoint video pipeline (HELIX v1.1) — Kling MP4 -> scroll-scrub frames + chain PNGs
#
# All clips are generated ASCENDING and play REVERSED on site, so every clip's
# frame order is flipped here.
#
# Usage:   ./process.sh g1   (… g2 g3 g4 g5)
# Input:   video-pipeline/in/gN.mp4
# Output:  assets/frames/<site-segment>/f_001.webp…     (desktop, 1920w)
#          assets/frames/<site-segment>/mob/f_001.webp… (mobile, 1280w)
#          video-pipeline/chain/gN-first.png / gN-last.png (generation order;
#          gN-last.png is the start image for the NEXT clip)
#
# Requires ffmpeg + ffprobe (macOS: brew install ffmpeg)

set -euo pipefail

DESK_FRAMES=120
MOB_FRAMES=60
DESK_W=1920; DESK_Q=68
MOB_W=1280;  MOB_Q=62

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# Generation clip -> SITE segment dir (ascent generated, descent played)
seg_name() {
  case "$1" in
    g1) echo "03-base-team" ;;
    g2) echo "02-galaxy-mid" ;;
    g3) echo "01-summit-enterprise" ;;
    *)  echo "" ;;
  esac
}

CLIP="${1:-}"
NAME="$(seg_name "$CLIP")"
[ -n "$NAME" ] || { echo "Usage: ./process.sh g1|g2|g3"; exit 1; }
IN="$SCRIPT_DIR/in/$CLIP.mp4"
[ -f "$IN" ] || { echo "Missing $IN — download the Kling clip there first."; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found. Install: brew install ffmpeg"; exit 1; }

DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")"
OUT_D="$ROOT/assets/frames/$NAME"
OUT_M="$OUT_D/mob"
CHAIN="$SCRIPT_DIR/chain"
mkdir -p "$OUT_D" "$OUT_M" "$CHAIN"
rm -f "$OUT_D"/f_*.webp "$OUT_M"/f_*.webp

echo "→ $CLIP ($NAME): ${DUR}s (all clips reversed for site)"

# 1. Chain anchors in GENERATION order — gN-last.png feeds the next clip
ffmpeg -v error -y -i "$IN" -frames:v 1 "$CHAIN/$CLIP-first.png"
ffmpeg -v error -y -sseof -0.25 -i "$IN" -update 1 -frames:v 1 "$CHAIN/$CLIP-last.png"

# 2. Evenly sampled frames, desktop + mobile
ffmpeg -v error -y -i "$IN" -vf "fps=$DESK_FRAMES/$DUR,scale=$DESK_W:-2" -c:v libwebp -q:v $DESK_Q "$OUT_D/f_%03d.webp"
ffmpeg -v error -y -i "$IN" -vf "fps=$MOB_FRAMES/$DUR,scale=$MOB_W:-2"  -c:v libwebp -q:v $MOB_Q  "$OUT_M/f_%03d.webp"

# 3. Reverse frame order (memory-safe rename) — ALWAYS, helix plays descent
for DIR in "$OUT_D" "$OUT_M"; do
  N=$(ls "$DIR"/f_*.webp 2>/dev/null | wc -l | tr -d ' ')
  [ "$N" -gt 0 ] || continue
  TMP="$DIR/.rev"; mkdir -p "$TMP"
  i=1
  for f in $(ls "$DIR"/f_*.webp | sort -r); do
    mv "$f" "$TMP/$(printf 'f_%03d.webp' "$i")"; i=$((i+1))
  done
  mv "$TMP"/f_*.webp "$DIR/"; rmdir "$TMP"
done

ND=$(ls "$OUT_D"/f_*.webp | wc -l | tr -d ' ')
NM=$(ls "$OUT_M"/f_*.webp | wc -l | tr -d ' ')
SZ=$(du -sh "$OUT_D" | cut -f1)
echo "✓ $NAME: $ND desktop / $NM mobile frames (reversed), $SZ total"
echo "  data-frames=\"$ND\"  |  next clip's start image: chain/$CLIP-last.png"
