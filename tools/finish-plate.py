"""Re-cut a plate's alpha from BLURRED luminance and encode WebP with lossy alpha.

Why: make-world-plate's alpha = (lum-11)/20 inherits per-pixel photographic
grain, and WebP encodes the alpha plane LOSSLESSLY by default — on the new
core that plane alone was 512 KB of noise. Alpha is a coverage mask for glow;
cutting it from a 3px-blurred luminance is visually identical and compresses
~10x. Corner-alpha==0 is re-asserted (the radial window guarantees it).

usage: finish-plate.py PLATE_PNG OUT_WEBP [quality] [alpha_quality]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
q = int(sys.argv[3]) if len(sys.argv) > 3 else 88
aq = int(sys.argv[4]) if len(sys.argv) > 4 else 55

im = Image.open(src).convert('RGBA')
S = im.width
a = np.asarray(im).astype(np.float32)
rgb = a[:, :, :3]

lum_blur = np.asarray(Image.fromarray(rgb.astype(np.uint8)).convert('L')
                      .filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
alpha = np.clip((lum_blur - 11.0) / 20.0, 0, 1)

target_r = S * 0.34
yy, xx = np.mgrid[0:S, 0:S]
dist = np.sqrt((xx - S / 2) ** 2 + (yy - S / 2) ** 2)
window = np.clip((target_r * 1.42 - dist) / (target_r * 0.30), 0, 1)
alpha *= window
inside = dist <= target_r * 0.995
feather = np.clip((target_r * 1.004 - dist) / 2.0, 0, 1)
alpha = np.maximum(alpha, np.maximum(inside.astype(np.float32), feather))

out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
corners = [int(out[0, 0, 3]), int(out[0, -1, 3]), int(out[-1, 0, 3]), int(out[-1, -1, 3])]
assert max(corners) == 0, f'corner alpha {corners} must be 0'

res = Image.fromarray(out, 'RGBA')
res.save(dst, 'WEBP', quality=q, alpha_quality=aq, method=6)
import os
print(f'{dst}: q{q}/aq{aq}, corner alpha {corners} OK, {os.path.getsize(dst)//1024} KB')
