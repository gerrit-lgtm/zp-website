"""Generated basalt render -> engine plate candidate.

Generic version of the core build: robust circle fit (radial max-gradient edge
points + Kasa, iterated), rotate so the brightness centroid lands ~152deg,
crop to the 0.68 contract by construction, optional shadow-anchored highlight
lift, alpha-cut via make-world-plate.py --fitted.

usage: build-basalt.py SRC OUT_STEM SEED_CX SEED_CY SEED_R [GAIN]
"""
import sys
import subprocess
import numpy as np
from PIL import Image, ImageFilter

SRC, STEM = sys.argv[1], sys.argv[2]
cx, cy, r = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
GAIN = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
TARGET_ANGLE = 152.0
PLATE = 2048


def sstep(x):
    return x * x * (3 - 2 * x)


im = Image.open(SRC).convert('RGB')
g = np.asarray(im.convert('L').filter(ImageFilter.GaussianBlur(5))).astype(np.float32)
H, W = g.shape

# --- robust circle fit -------------------------------------------------------
for it in range(3):
    pts, wts = [], []
    for adeg in np.linspace(0, 360, 120, endpoint=False):
        a = np.radians(adeg)
        ts = np.linspace(0.80, 1.20, 161)
        xs = cx + ts * r * np.cos(a)
        ys = cy - ts * r * np.sin(a)
        ok = (xs >= 0) & (xs < W) & (ys >= 0) & (ys < H)
        if ok.sum() < 20:
            continue
        vals = g[ys[ok].astype(int), xs[ok].astype(int)]
        d = np.abs(np.gradient(vals))
        i = int(np.argmax(d))
        if d[i] < 1.0:
            continue
        pts.append((xs[ok][i], ys[ok][i]))
        wts.append(d[i])
    pts = np.array(pts); wts = np.array(wts)
    # Kasa weighted fit with one outlier-rejection pass
    for _ in range(3):
        A = np.column_stack([2 * pts[:, 0], 2 * pts[:, 1], np.ones(len(pts))]) * wts[:, None]
        b = (pts[:, 0] ** 2 + pts[:, 1] ** 2) * wts
        (a1, b1, c1), *_ = np.linalg.lstsq(A, b, rcond=None)
        rr = np.sqrt(c1 + a1 ** 2 + b1 ** 2)
        resid = np.abs(np.sqrt((pts[:, 0] - a1) ** 2 + (pts[:, 1] - b1) ** 2) - rr)
        keep = resid < max(4.0, np.percentile(resid, 75))
        pts, wts = pts[keep], wts[keep]
    cx, cy, r = a1, b1, rr
    print(f'fit iter {it}: cx={cx:.1f} cy={cy:.1f} r={r:.1f} ({len(pts)} edge pts)')

# --- measure light centroid inside the disc ----------------------------------
full = np.asarray(im).astype(np.float32)
lum = full.mean(axis=2)
Y, X = np.mgrid[0:H, 0:W]
mask = (X - cx) ** 2 + (Y - cy) ** 2 < (r * 0.93) ** 2
w = np.where(mask, lum, 0.0)
mx = (w * X).sum() / w.sum() - cx
my = (w * Y).sum() / w.sum() - cy
ang0 = np.degrees(np.arctan2(-my, mx)) % 360
rot = TARGET_ANGLE - ang0
print(f'centroid angle {ang0:.1f} -> rotating {rot:+.1f} deg')

# --- rotate about disc centre (reflect-pad first), crop to contract ----------
PAD = 512
padded = np.pad(full, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='reflect')
im2 = Image.fromarray(padded.astype(np.uint8)).rotate(
    rot, resample=Image.BICUBIC, center=(cx + PAD, cy + PAD), fillcolor=(0, 0, 0))
half = r / 0.68
box = (int(round(cx + PAD - half)), int(round(cy + PAD - half)),
       int(round(cx + PAD + half)), int(round(cy + PAD + half)))
side = box[2] - box[0]
canvas = Image.new('RGB', (side, side), (0, 0, 0))
sx0, sy0 = max(box[0], 0), max(box[1], 0)
sx1, sy1 = min(box[2], im2.width), min(box[3], im2.height)
canvas.paste(im2.crop((sx0, sy0, sx1, sy1)), (sx0 - box[0], sy0 - box[1]))

# --- optional shadow-anchored highlight lift ----------------------------------
if GAIN > 1.0:
    a = np.asarray(canvas).astype(np.float32)
    L = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    t_in = sstep(np.clip((L - 18.0) / 27.0, 0, 1))
    t_out = 1.0 - sstep(np.clip((L - 150.0) / 95.0, 0, 1))
    boost = 1.0 + (GAIN - 1.0) * t_in * t_out
    canvas = Image.fromarray(np.clip(a * boost[:, :, None], 0, 255).astype(np.uint8))

crop_path = f'.work/{STEM}-crop.png'
canvas.save(crop_path)
subprocess.run(['python3', 'tools/make-world-plate.py', crop_path,
                f'.work/{STEM}.png', '0', '--fitted', '--size', str(PLATE)], check=True)
