# BRIEF — the bodies are crushed, not soft. Fix the TONALITY.

*Written 25 Jul 2026 after shipping the resolution pass. Read `HANDOVER.md` first
for the engine, the pipeline and the invariants. This brief is one job only.*

---

## The complaint

Gerrit, looking at the live site: *"why are all these planets still such shit
quality renders? this should be equal to the Landing.png image in quality. We
have so many HD planets now to turn into HTML. this looks like low end code."*

He is right, and the previous session fixed the wrong axis. **Resolution is now
correct and is not the problem.** Every plate is sized to its measured peak draw
(`tools/measure-draw.mjs`); nothing is browser-upscaled at 1440x900.

## The actual defect, measured

Luminance inside the disc — the share of the body that carries visible detail:

| source | median | **p90 (highlights)** | near-black |
|---|---|---|---|
| **`CI/Landing.png`** — the brand target | 16.3 | **104.7** | 53% |
| `reference/worlds/generated/hero-core-cinematic.jpg` | 19.3 | 53.0 | 43% |
| **shipped `core.webp`** | 6.7 | **11.7** | **94%** |
| shipped `basalt.webp` | 20.3 | 65.3 | 45% |
| shipped `clouds.webp` | 129.7 | 227.0 | 14% |
| shipped `ice.webp` | 138.0 | 215.0 | 21% |

**The core's highlights are 9x dimmer than the brand reference.** 94% of its disc
is near-black: it is a silhouette with a rim. There is nothing there to sharpen,
which is exactly why the resolution pass did not make it look better.

**This originates in the procedural shader, not in the upscale.** The raw shader
sprite measures median 8.0 / p90 14.3 / 93% near-black; after the Magnific
upscale it is 7.0 / 11.3 / 94%. The upscaler faithfully sharpened a black ball.
Engine note 11 says the core shader was "matched to `CI/Landing.png`" — it was
matched on the crescent and rim, **not** on the lit side's tonal range.

Note the pattern in the table: the two bodies that read best (clouds, ice) have
real dynamic range. The two that read as "low end" (core, basalt) are the two
built by upscaling the procedural shader.

## The job

Bring `core` and `basalt` up to Landing.png's tonal range, without breaking
anything in §5 of `HANDOVER.md`.

**Target metric — do not ship without hitting roughly this:**
- core: p90 inside the disc **>= 80** (currently 11.7), near-black **<= 60%**
- basalt: p90 **>= 85** (currently 65.3)
- keep the median low-ish (Landing.png is 16.3) — it is still a dark body. The
  goal is a lit side that carries facet detail, NOT a grey ball. Do not simply
  raise brightness or gamma; that greys the shadow and kills the crescent.

Measure with this, which is the same routine used for the table above:

```python
from PIL import Image; import numpy as np
im = Image.open('assets/img/worlds/core.webp').convert('RGBA').resize((512,512), Image.LANCZOS)
a = np.asarray(im).astype(np.float32); l = a[:,:,:3].mean(axis=2)
s=512; Y,X = np.mgrid[0:s,0:s]; r = np.sqrt((X-s/2)**2+(Y-s/2)**2)
v = l[(r < s*0.34*0.93) & (a[:,:,3] > 200)]
print(np.median(v), np.percentile(v,90), (v<18).mean()*100)
```

## The mechanism — and a correction to the previous handover

`HANDOVER.md` §7 says *"`images_generate` with a canvas frame as reference —
keeps direction, rescales subject up to 3x. Breaks the plate contract."* and §3
says never use generation.

**That rule is too broad, and following it literally is what capped the quality.**
It is true for *drop-in* use (`--fitted`, which trusts the source framing). It is
false once you refit: `tools/make-world-plate.py` WITHOUT `--fitted` runs
`find_disc`, detects the body at whatever scale the model framed it, and rescales
it to the 0.68 contract. **That is exactly how `fissure` and `ice` were made, and
they are the two best-looking bodies on the site.** Generated art is fine. It
just has to go through the detection path.

So:

1. **Try the art you already own first — it is free.**
   `reference/worlds/generated/hero-core-cinematic.jpg` is 5376x3072 and is the
   agreed look target for the core. `basalt-hero-detail.jpg` and
   `basalt-hexplate-closeup.jpg` are 4096x4096. Crop to the sphere, then:
   ```
   python3 tools/make-world-plate.py <crop>.jpg .work/core.png 0 --size 2048
   ```
   (no `--fitted` — let it detect and refit).
2. **Only generate new art if the existing art will not crop to a complete disc
   with margin.** Seedream has a subject-fills-frame bias; pushing against it
   made it invent floors, borders and second moons. Generate at whatever framing
   the model likes and refit in code — do not fight framing in the prompt.

## Traps that will cost you time if you do not know them

- **The hero render's crescent is on the RIGHT. The engine needs upper-LEFT.**
  Do not try to relight it: multiplying by a lambert term cannot undo baked
  lighting, it muddies the body and kills the rim (tried, rejected). **Mirror or
  rotate the plate** — free, keeps all the detail, and a sphere has no inherent
  up. This is exactly how the ice plate's light direction was fixed. Verify with
  the brightness-centroid check in `HANDOVER.md` §5.7; every body must land at
  roughly 140–165 degrees. Fissure is exempt (lit from within by design).
- **`find_disc` and centre-chord measurements lie on dark bodies.** They latch
  onto the crescent alone and call the known-good core sprite 0.59-of-canvas and
  15% off-centre. `make-world-plate.py`'s `check_fit` now uses a normalised
  radial profile — trust that one, and always pass `--verify-against`.
- **Corner alpha must be exactly 0** or you get a visible rectangle in-scene.
  The script asserts it.
- **The engine draws its own bloom and shells on top** (`drawCore`). A plate that
  looks right in isolation can blow out in-scene. Judge it with
  `node tools/capture-beats.mjs`, not in an image viewer.
- **The mark is never generated and never in any plate.**
- **Do not raise upscale creativity past 6** — at 9 it hallucinates debris into
  the background and destroys the empty void the copy needs.

## Do not regress these

Re-run before you commit; all of them pass today:

```
node tools/serve.mjs &                      # range-capable, port 8900
npm i --no-save playwright-core
node tools/measure-draw.mjs landscape       # nothing UPSCALED
node tools/boot-check.mjs landscape         # veil ~570 ms, 0 errors, 0 failed
node tools/boot-check.mjs portrait
node tools/scroll-sweep.mjs landscape 60    # every body enters ONCE
node tools/copy-contrast.mjs                # worst label <= ~5% on lit ground
node tools/perf-check.mjs landscape         # draw() ~1.3 ms
node tools/capture-beats.mjs                # eyeball all 7 beats
```

Plate weight is currently **1.16 MB** across five bodies and boot is ~570 ms.
`fissure.webp` alone is 505 KB. If the new core lands much heavier than its
current 77 KB, check boot again — the core is the one plate the veil waits on.

## Definition of done

- [ ] core p90 >= 80 inside the disc, near-black <= 60%, and it still reads as a
      dark body — not a grey one
- [ ] basalt p90 >= 85
- [ ] every body still lit upper-left (140–165 deg), fissure excepted
- [ ] all seven beats captured and compared against `CI/Landing.png` side by side
- [ ] every harness above still passes; plate weight and boot reported
- [ ] engine header gains note 20 describing what changed and why
- [ ] deployed to **`zp-website-eta.vercel.app`** (`npx vercel --prod --yes`)
