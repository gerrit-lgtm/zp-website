#!/usr/bin/env python3
"""ZeroPoint video pipeline — MP4 -> reversed scroll-scrub WebP frames.

HELIX v2: supports the four-leg chain (v1..v4, prompts/HELIX-V2.md) and the
legacy three-clip take (g1..g3). Every clip is generated as an ASCENT and played
in REVERSE on site, so frame order is always flipped here.

Run with no args = v1 v2 v3 v4. Pass g1 g2 g3 to rebuild the legacy take.

Per clip this writes:
  assets/frames/<segment>/f_001.webp..            desktop, 1920w
  assets/frames/<segment>/mob/f_001.webp..        mobile, 1280w
  assets/frames/<segment>/manifest.json           {"frames": N, "mob": M} (engine v2 reads this)
  video-pipeline/chain/<clip>-first.png / -last.png   chain anchors in GENERATION order

Seam guarantees (HELIX-V2.md §3):
  - the playback FIRST frame of each v-leg is substituted with the true designed
    end-keyframe PNG from chain/ when present, so every on-site seam (and the
    hero frame) is pixel-exact on BOTH sides;
  - the extracted <clip>-last.png is diffed against its target keyframe and the
    script warns loudly if the model drifted (reject the take if it did).

Existing output frames are only wiped AFTER the new take extracts successfully —
a corrupt MP4 can never leave a segment frameless.
"""
import os, sys, json, subprocess, shutil
from PIL import Image, ImageChops

DESK_FRAMES = 120
MOB_FRAMES = 60
DESK_W = 1920; DESK_Q = 68
MOB_W = 1280;  MOB_Q = 62
SEAM_DIFF_WARN = 12  # mean abs pixel diff (0-255) between clip end and target keyframe

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAIN = os.path.join(ROOT, "video-pipeline", "chain")
IN_DIR = os.path.join(ROOT, "video-pipeline", "in")

# Generation clip -> SITE segment dir (playback/descent order).
SEGMENT_MAP = {
    "v1": "01-leg-aperture-bastion",   # K0 hero -> K1 Enterprise
    "v2": "02-leg-bastion-signal",     # K1 -> K2 Consulting & Media
    "v3": "03-leg-signal-forge",       # K2 -> K3 AI Factory
    "v4": "04-leg-forge-vista",        # K3 -> K4 Team + vista
    "g1": "03-base-team",
    "g2": "02-galaxy-mid",
    "g3": "01-summit-enterprise",
}

# Generation clip -> the designed keyframe its END image was pinned to.
# (Reversed on site, this keyframe is the leg's playback FIRST frame.)
END_KEYFRAME = {
    "v1": "K0-hero.png",
    "v2": "K1-enterprise.png",
    "v3": "K2-consulting.png",
    "v4": "K3-factory.png",
}


def mean_abs_diff(path_a, path_b):
    """Cheap perceptual drift check: mean abs diff on 256x144 grayscale."""
    with Image.open(path_a) as a, Image.open(path_b) as b:
        a = a.convert("L").resize((256, 144), Image.Resampling.BILINEAR)
        b = b.convert("L").resize((256, 144), Image.Resampling.BILINEAR)
        hist = ImageChops.difference(a, b).histogram()
        total = sum(hist)
        return sum(i * n for i, n in enumerate(hist)) / max(1, total)


def process_clip(clip):
    name = SEGMENT_MAP.get(clip)
    if not name:
        print(f"✗ Unknown clip {clip} (expected v1..v4 or g1..g3)")
        return False

    in_mp4 = os.path.join(IN_DIR, f"{clip}.mp4")
    if not os.path.exists(in_mp4):
        print(f"✗ Missing {in_mp4}")
        return False

    out_d = os.path.join(ROOT, "assets", "frames", name)
    out_m = os.path.join(out_d, "mob")
    temp_dir = os.path.join(ROOT, "video-pipeline", f"temp_{clip}")

    try:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        os.makedirs(temp_dir, exist_ok=True)
        os.makedirs(out_m, exist_ok=True)
        os.makedirs(CHAIN, exist_ok=True)

        print(f"→ Processing {clip} ({name}) into WebP frames...")

        # 1. Extract + validate BEFORE touching live output.
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", in_mp4,
             os.path.join(temp_dir, "frame_%04d.png")],
            check=True,
        )
        png_files = sorted(f for f in os.listdir(temp_dir)
                           if f.startswith("frame_") and f.endswith(".png"))
        total_raw = len(png_files)
        if total_raw < 2:
            print(f"✗ {clip}: only {total_raw} frames extracted — live frames left untouched.")
            return False
        print(f"Extracted {total_raw} raw PNG frames.")

        # 2. Chain anchors in GENERATION order (true first/last, pre-reversal).
        shutil.copy(os.path.join(temp_dir, png_files[0]),  os.path.join(CHAIN, f"{clip}-first.png"))
        shutil.copy(os.path.join(temp_dir, png_files[-1]), os.path.join(CHAIN, f"{clip}-last.png"))

        # 3. Seam contract check: did the take actually land on its end keyframe?
        key = END_KEYFRAME.get(clip)
        key_path = os.path.join(CHAIN, key) if key else None
        if key_path and os.path.exists(key_path):
            drift = mean_abs_diff(os.path.join(CHAIN, f"{clip}-last.png"), key_path)
            if drift > SEAM_DIFF_WARN:
                print(f"⚠ {clip}: end frame drifted from chain/{key} "
                      f"(diff {drift:.1f} > {SEAM_DIFF_WARN}) — inspect before shipping; "
                      f"a drifted ending means a visible seam. Consider re-rolling.")
            else:
                print(f"✓ {clip}: end frame matches chain/{key} (diff {drift:.1f}).")

        # 4. Extraction is good — NOW clear live output (incl. stale manifest).
        for d in (out_d, out_m):
            for f in os.listdir(d):
                if f.startswith("f_") and f.endswith(".webp"):
                    os.remove(os.path.join(d, f))
        manifest_path = os.path.join(out_d, "manifest.json")
        if os.path.exists(manifest_path):
            os.remove(manifest_path)

        # 5. REVERSE: ascent footage plays as descent on site.
        png_files.reverse()

        def emit(count, width, quality, dest, keyframe_sub=None):
            count = min(count, total_raw)
            indices = [int(i * (total_raw - 1) / (count - 1)) for i in range(count)]
            for i, idx in enumerate(indices):
                # Playback frame 1 = the leg's designed keyframe when available:
                # substituting the true still makes every seam pixel-exact.
                src_path = keyframe_sub if (i == 0 and keyframe_sub) \
                    else os.path.join(temp_dir, png_files[idx])
                out_path = os.path.join(dest, f"f_{i+1:03d}.webp")
                with Image.open(src_path) as im:
                    if im.mode != "RGB":
                        im = im.convert("RGB")
                    if im.width != width:
                        h = int(im.height * (width / im.width))
                        im = im.resize((width, h), Image.Resampling.LANCZOS)
                    im.save(out_path, "WEBP", quality=quality)
            return count

        sub = key_path if (key_path and os.path.exists(key_path)) else None
        if key and not sub:
            print(f"  (chain/{key} not found — playback first frame stays the rendered approximation)")
        n_desk = emit(DESK_FRAMES, DESK_W, DESK_Q, out_d, sub)
        n_mob = emit(MOB_FRAMES, MOB_W, MOB_Q, out_m, sub)
        if n_desk < DESK_FRAMES:
            print(f"⚠ {clip}: clip too short for {DESK_FRAMES} unique frames — emitted {n_desk} "
                  f"desktop / {n_mob} mobile (manifest reflects actual counts).")

        with open(manifest_path, "w") as fh:
            json.dump({"frames": n_desk, "mob": n_mob}, fh)

        print(f"✓ {clip} ({name}): {n_desk} desktop + {n_mob} mobile frames, "
              f"manifest.json, chain anchors written.")
        return True
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


if __name__ == "__main__":
    if not shutil.which("ffmpeg"):
        print("✗ ffmpeg not found. Install: brew install ffmpeg")
        sys.exit(1)
    clips = sys.argv[1:] if len(sys.argv) > 1 else ["v1", "v2", "v3", "v4"]
    failed = []
    for c in clips:
        try:
            if not process_clip(c):
                failed.append(c)
        except Exception as e:
            print(f"✗ {c}: {e}")
            failed.append(c)
    if failed:
        print(f"\n{len(failed)} clip(s) failed: {', '.join(failed)}")
        sys.exit(1)
