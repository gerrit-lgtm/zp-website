"""Hero core -> engine plate. (Recipe that produced assets/img/worlds/core.webp, Jul 2026.)

Order of operations, each on the full-res source:
  1. erase the dust trail (bright sparkles only; the ambient glow stays)
  2. rotate about the disc centre so the light lands upper-left after mirroring
  3. crop a square sized 2r/0.68 centred on the disc  (contract by construction)
  4. mirror left-right (crescent right -> left; relighting is rejected, mirror is free)
  5. alpha-cut via make-world-plate.py --fitted (detection is skipped because
     find_disc AND disc_frac both provably misread this art: the giant baked
     halo holds the radial profile above threshold past the limb)
"""
import numpy as np
from PIL import Image, ImageFilter
import subprocess

# disc circle fitted from the crescent arc (Kasa, outlier-rejected) then
# corrected against dark-limb edge profiles — see engine header note 20a.
cx, cy, r = 3600.0, 1297.5, 1008.0
SRC = 'reference/worlds/generated/hero-core-cinematic.jpg'
ROT = 65.5   # CCW pre-mirror; post-mirror centroid = 217.5 - ROT (measured), target ~152deg
GAIN = 1.5   # highlight stretch: shadow-anchored, crescent-protected (see tone_curve)


def tone_curve(a, gain):
    """Lift the LIT side only. Identity below lum 18 (the near-black threshold:
    the shadow must stay a shadow), full gain through the 45..150 mid-highlight
    band where the facet detail lives, tapering out by 245 so the crescent's
    whites do not clip. Multiplies RGB by a luminance-keyed factor, so hue is
    untouched — this is not a brightness/gamma lift."""
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    def sstep(x):
        return x * x * (3 - 2 * x)
    t_in = sstep(np.clip((lum - 18.0) / (45.0 - 18.0), 0, 1))
    t_out = 1.0 - sstep(np.clip((lum - 150.0) / 95.0, 0, 1))
    boost = 1.0 + (gain - 1.0) * t_in * t_out
    return np.clip(a * boost[:, :, None], 0, 255)

im = Image.open(SRC).convert('RGB')
a = np.asarray(im).astype(np.float32)

# --- 1. erase the dust trail + heal the frame-top cut, in POLAR space --------
# Previous attempts (sparkle kill + wedge suppression toward ambient) dug a
# dark wedge out of the halo fan: the trail RIDES ON smooth fan glow, and the
# wedge's angular boundaries are rays from the centre, which the engine bloom
# amplifies into hard L-edges in-scene. Instead: for every radius, the glow
# field is smooth in angle — so mark the trail wedge and any out-of-frame
# sector invalid and rebuild them by circular interpolation between the valid
# ring values on either side. No rays, no reflections, no ambient holes.
H, W = a.shape[:2]
TR_A, TR_B = 208.0, 308.0          # trail wedge (deg, y-up, 0=right)
R0, R1 = int(r * 1.00), int(r * 1.47)
gsm = np.asarray(Image.fromarray(a.mean(axis=2).astype(np.uint8))
                 .filter(ImageFilter.GaussianBlur(4))).astype(np.float32)
asm = np.stack([np.asarray(Image.fromarray(a[:, :, c].astype(np.uint8))
                           .filter(ImageFilter.GaussianBlur(4))).astype(np.float32)
                for c in range(3)], axis=2)

NT = 1440                          # 0.25 deg steps
thetas = np.arange(NT) * (360.0 / NT)
cost = np.cos(np.radians(thetas)); sint = np.sin(np.radians(thetas))
grid = np.zeros((NT, R1 - R0, 3), np.float32)
filled = np.zeros((NT, R1 - R0), bool)
for di, d in enumerate(range(R0, R1)):
    xs = cx + d * cost; ys = cy - d * sint
    inframe = (xs >= 0) & (xs < W - 1) & (ys >= 0) & (ys < H - 1)
    intrail = (thetas > TR_A) & (thetas < TR_B)
    valid = inframe & ~intrail
    vals = np.zeros((NT, 3), np.float32)
    xi = np.clip(xs.astype(int), 0, W - 1); yi = np.clip(ys.astype(int), 0, H - 1)
    vals[inframe] = asm[yi[inframe], xi[inframe]]
    if valid.sum() < 8:
        continue
    # circular interpolation across invalid runs
    vt = thetas[valid]
    for c in range(3):
        vv = vals[valid, c]
        vt2 = np.concatenate([vt - 360, vt, vt + 360])
        vv2 = np.concatenate([vv, vv, vv])
        vals[:, c] = np.interp(thetas, vt2, vv2)
    grid[:, di] = vals
    filled[:, di] = ~valid

# paint back: replace every invalid cartesian pixel by a bilinear sample of the
# polar grid, feathered at the wedge/radial boundaries
Y, X = np.mgrid[0:H, 0:W]
dxp, dyp = X - cx, Y - cy
dist = np.sqrt(dxp * dxp + dyp * dyp)
ang = np.degrees(np.arctan2(-dyp, dxp)) % 360

def sm(x):
    return x * x * (3 - 2 * x)

in_annulus = (dist >= R0 + 1) & (dist < R1 - 2)
out_of_frame_src = np.zeros((H, W), bool)   # everything IS in frame pre-rotation
trail_m = sm(np.clip((ang - TR_A) / 6, 0, 1)) * (1 - sm(np.clip((ang - (TR_B - 6)) / 6, 0, 1)))
rad_m = sm(np.clip((dist - r * 1.01) / (r * 0.04), 0, 1))
wmask = trail_m * rad_m * in_annulus
sel = wmask > 0.001
ti = (ang[sel] / (360.0 / NT))
di_ = (dist[sel] - R0)
t0 = np.floor(ti).astype(int) % NT; t1 = (t0 + 1) % NT; tf = ti - np.floor(ti)
d0 = np.clip(np.floor(di_).astype(int), 0, R1 - R0 - 2); df = np.clip(di_ - d0, 0, 1)
rec = ((grid[t0, d0] * (1 - tf[:, None]) + grid[t1, d0] * tf[:, None]) * (1 - df[:, None])
       + (grid[t0, d0 + 1] * (1 - tf[:, None]) + grid[t1, d0 + 1] * tf[:, None]) * df[:, None])
wv = wmask[sel][:, None]
a[sel] = a[sel] * (1 - wv) + rec * wv
print(f'polar heal: rebuilt {sel.sum()} px across the trail wedge')

im2 = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

# --- 2. rotate about the disc centre ----------------------------------------
# No padding: after the polar heal, the only unavoidable void (the source
# frame's top edge, min distance 1.287r) rotates into the halo's DIM side,
# below the alpha floor — black fill there can never composite.
im2 = im2.rotate(ROT, resample=Image.BICUBIC, center=(float(cx), float(cy)), fillcolor=(0, 0, 0))

# --- 3. crop ------------------------------------------------------------------
half = r / 0.68
box = (int(round(cx - half)), int(round(cy - half)), int(round(cx + half)), int(round(cy + half)))
side = box[2] - box[0]
canvas = Image.new('RGB', (side, side), (0, 0, 0))
sx0, sy0 = max(box[0], 0), max(box[1], 0)
sx1, sy1 = min(box[2], im2.width), min(box[3], im2.height)
canvas.paste(im2.crop((sx0, sy0, sx1, sy1)), (sx0 - box[0], sy0 - box[1]))

# --- 3.5 heal every void, post-rotation ---------------------------------------
# Three void sources all end as black with a straight edge: the source frame's
# own top-edge cut, content CLIPPED by rotate() keeping the frame size, and
# the crop box extending past the image. Geometry-deriving them one by one is
# error-prone (it was) — instead push a validity mask through the IDENTICAL
# rotate+crop, and heal wherever it comes back short of fully valid, blended
# wide so no residual line can form. Values come from the polar grid, indexed
# by the source-orientation angle (verified against the measured centroid).
ca = np.asarray(canvas).astype(np.float32)
CS = ca.shape[0]
vmask = Image.new('L', (im.width, im.height), 255).rotate(
    ROT, resample=Image.BICUBIC, center=(float(cx), float(cy)), fillcolor=0)
vcan = Image.new('L', (side, side), 0)
vcan.paste(vmask.crop((sx0, sy0, sx1, sy1)), (sx0 - box[0], sy0 - box[1]))
invalid = 1.0 - np.asarray(vcan).astype(np.float32) / 255.0
inv_sm = np.asarray(Image.fromarray((invalid * 255).astype(np.uint8))
                    .filter(ImageFilter.GaussianBlur(60))).astype(np.float32) / 255.0
oof = np.clip(inv_sm * 2.2, 0, 1)
oof = oof * oof * (3 - 2 * oof)
Yc, Xc = np.mgrid[0:CS, 0:CS]
dxc, dyc = Xc - CS / 2, Yc - CS / 2
dc = np.sqrt(dxc * dxc + dyc * dyc)
tc = np.degrees(np.arctan2(-dyc, dxc)) % 360
ts = (tc - ROT) % 360                       # angle in SOURCE orientation
heal = (dc >= R0 + 1) & (dc < R1 - 2) & (oof > 0.001)
tiH = ts[heal] / (360.0 / NT)
diH = dc[heal] - R0
t0h = np.floor(tiH).astype(int) % NT; t1h = (t0h + 1) % NT; tfh = tiH - np.floor(tiH)
d0h = np.clip(np.floor(diH).astype(int), 0, R1 - R0 - 2); dfh = np.clip(diH - d0h, 0, 1)
recH = ((grid[t0h, d0h] * (1 - tfh[:, None]) + grid[t1h, d0h] * tfh[:, None]) * (1 - dfh[:, None])
        + (grid[t0h, d0h + 1] * (1 - tfh[:, None]) + grid[t1h, d0h + 1] * tfh[:, None]) * dfh[:, None])
wH = oof[heal][:, None]
ca[heal] = ca[heal] * (1 - wH) + recH * wH
canvas = Image.fromarray(np.clip(ca, 0, 255).astype(np.uint8))
print(f'top-void heal: {heal.sum()} px')

# --- 4. mirror, then lift the lit side ---------------------------------------
canvas = canvas.transpose(Image.FLIP_LEFT_RIGHT)
canvas = Image.fromarray(tone_curve(np.asarray(canvas).astype(np.float32), GAIN).astype(np.uint8))
canvas.save('.work/core-crop2.png')
print('saved .work/core-crop2.png', canvas.size)

# --- 5. alpha-cut through the standard tool -----------------------------------
subprocess.run(['python3', 'tools/make-world-plate.py', '.work/core-crop2.png',
                '.work/core-new.png', '0', '--fitted', '--size', '2048'], check=True)
