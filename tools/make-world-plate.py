"""Turn a generated planet render into an engine-ready sprite plate.

The engine draws a sprite as `drawImage(sprite, s[0]-d, s[1]-d, d*2, d*2)` with
d = r/0.68, i.e. it assumes the planet's disc occupies 0.68 of the sprite's
width, centred, with the rest transparent. Generated renders are framed however
the model felt like framing them, so every plate has to be re-fitted to that
contract or the planet will come out the wrong size and off-centre.

Steps: find the disc -> fit a circle -> rescale so the disc is 0.68 of the
canvas -> cut the black background to alpha (keeping the halo, which is real
light, not background) -> optional cold grade to kill warm drift.
"""
import sys, numpy as np
from PIL import Image, ImageFilter

DEFAULT_OUT_SIZE = 1024
DISC_FRAC = 0.68          # must match renderSpriteRows: R = S * 0.34


def find_disc(rgb):
    """Circle (cx, cy, r) of the planet body, in source pixels."""
    g = np.asarray(Image.fromarray(rgb).convert('L').filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
    # The body is everything meaningfully above the black ground. A low
    # threshold also catches the halo, so take a firmer one for the SOLID body
    # and let the halo ride along in the alpha step.
    m = g > 26
    if m.sum() < 500:
        m = g > 10
    ys, xs = np.where(m)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    # radius from area is robust to a dark limb that thresholding clips
    r_area = np.sqrt(m.sum() / np.pi)
    r_bbox = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2
    return cx, cy, max(r_area, r_bbox * 0.92)


def cold_grade(a, strength=1.0):
    """Kill warm drift: desaturate, then re-tint to the CI's cold blue.
    Deterministic, unlike asking the model not to paint Jupiter."""
    f = a.astype(np.float32)
    lum = f @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    grey = np.repeat(lum[:, :, None], 3, axis=2)
    desat = f + (grey - f) * (0.92 * strength)
    tint = np.array([0.86, 0.95, 1.14], dtype=np.float32)
    tinted = desat * (1 + (tint - 1) * strength)
    return np.clip(tinted, 0, 255).astype(np.uint8)


def dewarm(a, strength=1.0):
    """Remove a warm cast WITHOUT touching anything already cold.

    cold_grade is the right tool when a whole render came back as Jupiter. It is
    the wrong tool when an upscale is 99% cold and has a few ochre storm swirls
    in it: desaturating by 92% to fix 1% of the pixels throws away all the
    subtle blue variation that makes the body read as weather. This pulls the
    red channel down toward blue only where red actually leads, in proportion to
    how far it leads, so cold pixels come through bit-identical."""
    f = a.astype(np.float32)
    r, g, b = f[:, :, 0], f[:, :, 1], f[:, :, 2]
    excess = np.clip(r - b, 0, None)                 # 0 where already cold
    r -= excess * 0.85 * strength
    g -= excess * 0.35 * strength                    # green rides with it, or it turns magenta
    return np.clip(np.dstack([r, g, b]), 0, 255)


def disc_frac(im, size=512):
    """Disc diameter as a fraction of canvas width — brightness-independent.

    Average luminance in concentric rings, normalise against the interior mean,
    and take the outermost ring still holding half of it.

    THREE measures were tried before this one and all three cry wolf:
      - find_disc thresholds at luminance 26, so on a body with a near-black
        unlit side it latches onto the crescent alone. It calls the known-good
        engine core sprite 0.59-of-canvas and 15% off-centre.
      - a chord through the centre row fails the same way on dark limbs; it
        failed basalt at 1.7% drift when the disc was in fact identical.
      - radius-of-gyration is brightness-WEIGHTED, so a brighter crescent or a
        bigger baked halo moves it. It flagged the core as reframed by 3.1%
        when the drawn silhouette in-scene was unchanged to 0.6%.
    Normalising per-ring against the body's own interior is what makes this one
    immune to one render simply being brighter than another."""
    a = np.asarray(im.convert('L').resize((size, size), Image.LANCZOS)).astype(np.float32)
    yy, xx = np.mgrid[0:size, 0:size]
    r = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2)
    nb = 256
    prof = np.array([a[(r >= i * size / 2 / nb) & (r < (i + 1) * size / 2 / nb)].mean()
                     for i in range(nb)])
    idx = np.where(prof > prof[:int(nb * 0.45)].mean() * 0.5)[0]
    return (idx.max() + 1) / nb


def check_fit(im, ref_path, tol=0.02):
    """Prove the body still occupies the same share of the canvas as its source.

    This is the assumption the whole pipeline rests on ("an upscaler cannot
    reframe"), and a silent reframe draws the body at the wrong size with
    nothing else looking wrong — so prove it per plate rather than trusting it."""
    got = disc_frac(im)
    want = disc_frac(Image.open(ref_path))
    ratio = got / want
    ok = abs(ratio - 1) <= tol
    print(f"  fit check vs {ref_path}: disc {got:.4f} vs source {want:.4f}, "
          f"ratio {ratio:.4f} — {'OK' if ok else '!! REFRAMED, do not ship'}")
    return ok


def make_plate(src, dst, grade=0.0, fitted=False, out_size=DEFAULT_OUT_SIZE, verify_against=None, dewarm_s=0.0):
    """fitted=True: the source ALREADY obeys the 0.68 contract, so skip disc
    detection entirely and just resize. Use this for upscaled canvas sprites —
    the engine rendered the disc at exactly 0.68 and an upscaler cannot
    reframe, so detection can only introduce error on a dark limb it fails to
    threshold. Detection is for generated art, which is framed arbitrarily."""
    OUT_SIZE = out_size
    im = Image.open(src).convert('RGB')
    target_r = OUT_SIZE * DISC_FRAC / 2

    if fitted:
        if verify_against:
            check_fit(im, verify_against)
        canvas = im.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    else:
        rgb = np.asarray(im)
        cx, cy, r = find_disc(rgb)
        # rescale so the disc lands on DISC_FRAC of the output, then centre it
        scale = target_r / r
        nw, nh = int(round(im.width * scale)), int(round(im.height * scale))
        im2 = im.resize((nw, nh), Image.LANCZOS)
        ncx, ncy = cx * scale, cy * scale
        canvas = Image.new('RGB', (OUT_SIZE, OUT_SIZE), (0, 0, 0))
        canvas.paste(im2, (int(round(OUT_SIZE / 2 - ncx)), int(round(OUT_SIZE / 2 - ncy))))

    a = np.asarray(canvas).astype(np.float32)
    if grade > 0:
        a = cold_grade(a, grade).astype(np.float32)
    if dewarm_s > 0:
        before = ((a[:, :, 0] > a[:, :, 2] + 8) & (a.mean(axis=2) > 40)).mean()
        a = dewarm(a, dewarm_s)
        after = ((a[:, :, 0] > a[:, :, 2] + 8) & (a.mean(axis=2) > 40)).mean()
        print(f"  dewarm {dewarm_s}: warm-tinted pixels {before*100:.2f}% -> {after*100:.2f}%")

    # Alpha from luminance: the render sits on black, so brightness IS coverage.
    # A soft knee keeps the halo (real light) instead of clipping it to a hard
    # disc edge, which would read as a cut-out pasted on the starfield.
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    # The source "black" is NOT zero — JPEG noise puts it around 3-8 — so a low
    # threshold leaves faint coverage across the entire square, which composites
    # as a visible RECTANGLE around the planet. Lift the floor above that noise.
    alpha = np.clip((lum - 11.0) / 20.0, 0, 1)

    yy, xx = np.mgrid[0:OUT_SIZE, 0:OUT_SIZE]
    dist = np.sqrt((xx - OUT_SIZE / 2) ** 2 + (yy - OUT_SIZE / 2) ** 2)

    # ...and belt-and-braces: a radial window that reaches zero well before the
    # corners. Keeps the halo out to 1.42r (real light, it should bleed) while
    # guaranteeing the plate's edges are exactly transparent.
    window = np.clip((target_r * 1.42 - dist) / (target_r * 0.30), 0, 1)
    alpha *= window

    # inside the disc the body is fully opaque regardless of how dark it is
    inside = dist <= target_r * 0.995
    feather = np.clip((target_r * 1.004 - dist) / 2.0, 0, 1)
    alpha = np.maximum(alpha, np.maximum(inside.astype(np.float32), feather))

    out = np.dstack([a, alpha * 255]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(dst)
    corners = [int(out[0, 0, 3]), int(out[0, -1, 3]), int(out[-1, 0, 3]), int(out[-1, -1, 3])]
    mode = 'fitted (no detection)' if fitted else 'detected+refitted'
    print(f"{dst}: {im.width}px source -> {OUT_SIZE}px plate, {mode}, grade {grade}, "
          f"corner alpha {corners} {'OK' if max(corners) == 0 else '!! must be 0'}")


if __name__ == '__main__':
    # usage: make-world-plate.py SRC DST [grade] [--fitted] [--size N]
    #                            [--verify-against ORIGINAL_SPRITE] [--dewarm S]
    #
    # --size sets the plate's pixel resolution. It is NOT a free knob: pick it
    # from tools/measure-draw.mjs, which reports the largest each body is drawn
    # at full opacity. A plate below that number is being upscaled by the
    # browser at exactly the body's own beat.
    argv = sys.argv[1:]
    fitted = '--fitted' in argv
    dewarm_s = 0.0
    if '--dewarm' in argv:
        i = argv.index('--dewarm')
        dewarm_s = float(argv[i + 1])
        del argv[i:i + 2]
    verify_against = None
    if '--verify-against' in argv:
        i = argv.index('--verify-against')
        verify_against = argv[i + 1]
        del argv[i:i + 2]
    out_size = DEFAULT_OUT_SIZE
    if '--size' in argv:
        out_size = int(argv[argv.index('--size') + 1])
        del argv[argv.index('--size'):argv.index('--size') + 2]
    args = [a for a in argv if not a.startswith('--')]
    src, dst = args[0], args[1]
    grade = float(args[2]) if len(args) > 2 else 0.0
    make_plate(src, dst, grade, fitted, out_size, verify_against, dewarm_s)
