# ZeroPoint website — handover

**Live:** https://zp-website-eta.vercel.app (public, no login)
**Repo:** this folder · branch `immersive-3d` · pushed through `8759c6a`
**Vercel:** project `gerrit-s-projects1/zp-website`, CLI already authenticated

Read `~/.claude/projects/.../memory/MEMORY.md` first — three notes cover the pipeline, the
asset-quality spec, and how Gerrit works. This file covers what those don't: where things
stand right now.

---

## What the site is

A scroll-driven site where an armoured figure is the whole story. He lands **dormant** —
dead visor, cold metal — and **powers up the moment you scroll**. The camera then runs one
continuous 15-second move: face → chest → his right hand → back → his left hand (where the
services appear) → back → and he **turns on the spot** while the camera holds.

Four content phases dissolve over it with opacity + translate + blur, in glass cards with
square corners: hero card, three solutions, three statements, contact form. Structure and
interaction language follow the **Bloom** reference Gerrit supplied; the skin is ZeroPoint's
CI plus Instrument Serif as an editorial display layer.

**The browser renders no 3D.** The figure is pre-rendered in Blender/Cycles as 360 frames and
the site plays them back on scroll. Real-time WebGL was tried and abandoned — it has a hard
quality ceiling well below the client's reference images. This also made the site *lighter*,
not heavier.

---

## Where it stands

| | |
|---|---|
| Live film | build `202608150358`, 360 frames, 2560×1440 |
| Rendered with | HDRI lighting + backdrop, **before** the material upgrades |
| Payload | ~36 MB HD / 14.5 MB SD, page usable in ~1s on ~5 MB, rest streams behind |
| Verified | one phase at a time, no h-scroll at 390px, reduced-motion and no-JS clean, form validates, 120fps |

### Uncommitted right now

`site/render/scene.py` has an unverified material upgrade: **procedural edge wear** (Cycles
`Geometry > Pointiness` drives bare-metal on convex edges, extra roughness in recesses) plus
anisotropy, with wear 0.38, cavity 0.20, exposure −0.80. Earlier values (0.55 / 0.30 / −0.95)
rendered too dark and too stripped; these are the corrected ones but **no frame has been
rendered at them yet**. `site/render/wear*/` are scratch outputs, safe to delete.

---

## The immediate next step — read this before rendering anything

**Do not re-render the current suit.** Gerrit's `Avatar/` folder holds four turnaround images
(front / back / left / right) of a **different and better suit**: sleek matte plate, fine blue
tracery, chrome bands at hip and knee, articulated fingers, the ZeroPoint mark on the back.
The suit currently in the render (`test/armored_suit.glb`) is chunky cracked plate — not the
same design.

Those four images are also ideal generator input: even studio light, plain grey backdrop, true
orthographic views. Regenerating from them should give both a better design *and* proper maps.

**The plan agreed with Gerrit:**

1. He opens Blender → **N** panel → **BlenderMCP** tab → **Connect to Claude**, and enables
   Hyper3D Rodin (free trial key built in). The addon is installed; Blender was simply closed.
2. Generate from the four `Avatar/*.png` via `generate_hyper3d_model_via_images`.
3. If the free trial is too limited, fall back to the Tripo or Meshy **web UI** by hand —
   upload the four images, tick **PBR** and **remove lighting**, download the GLB.
4. Drop the GLB in, re-measure landmarks, re-render once.

Re-rendering the old suit first would waste an hour.

### When a new asset arrives

```sh
cd site
node tools/landmarks.mjs      # body landmarks -> tools/landmarks.json
node tools/disc.mjs           # the chest disc, by UV-sampling the albedo
```

Then update `ANCHORS`/`CHEST_DISC` in `render/scene.py`, which is where the camera path aims.
`tools/orient.mjs` confirms which way the figure faces if the new asset differs (the current
one faces +X, screen-right is −Z).

---

## The pipeline

```sh
cd site
node render/textures.mjs                                     # de-light + DeepBump + glow + ORM
blender -b -P render/scene.py -- --at 0.32 --out render/look --width 1920 --samples 64
blender -b -P render/scene.py -- --frames 360 --out render/seq --width 2560 --samples 128
node render/frames.mjs render/seq                            # bloom, two sizes, build-stamped
npx vercel deploy --prod --archive=tgz --yes                 # from the repo root
```

Full detail in `site/render/WORKFLOW.md`, including the choreography table and the material
notes. About 10s/frame on the M5 Max, so a full pass is ~1 hour.

**Verification harness** (headless Chrome, `site/tools/`):
`phases.mjs` frames each beat · `check.mjs` portrait + a11y + reduced-motion + no-JS + form ·
`boot.mjs` time and bytes to interactive · `perf.mjs` frame times.

---

## Traps already paid for

- **Render as a keyframed animation**, never a Python loop calling `bpy.ops.render` per frame.
  The loop crashes Cycles' Metal backend recompiling kernels.
- **Blender 5.x**: compositor moved to `scene.compositing_node_group`, Glare's controls became
  sockets, `Action.fcurves` is gone (slotted actions). Bloom is done downstream in
  `frames.mjs` instead — which also retunes in seconds instead of needing a re-render.
- **Frames must be build-stamped.** Serving stable filenames under a long cache made a full
  re-render invisible to anyone who had already visited. The manifest must always revalidate.
- **`site/render` must stay in `.vercelignore`** — ~470 MB of intermediates made deploys hang.
  Same content in git made `git push` disconnect mid-pack.
- **`hidden` loses to any CSS `display` rule** — `[hidden] { display: none !important }` is
  load-bearing, or every phase renders at once.
- **Restoring `pointerEvents` with `''`** falls back to the stylesheet's `none`; it must be set
  to `'auto'` explicitly or the contact form is unclickable.
- Deploys must run in the **foreground** — backgrounded, the Vercel CLI loses auth
  ("Not authorized").

---

## Open, and only Gerrit can close

- **The copy is unverified.** Figures (R20.02/master, 600 frames in 18.1s, 97 sign-ups,
  3,000 GPUs, R3,500–25,000/asset, 200 specialists) and names (Gerrit Steenkamp & Deon Fourie
  as co-CEOs, Rob Hersov, Louis McLaren, plus four partners) came from the wireframe's
  annotations and are live on a public URL.
- **The contact form sends nothing.** It validates and says "we will be in touch", with no
  backend. He asked to leave it; it needs an endpoint or an honest mailto before real traffic.
- **`zeropoint.africa` is an unused GoDaddy parking page** — pointing it here is a DNS paste.
- **No rig.** The current model has no armature, so he cannot be posed. This is why the
  reference's "cards resting in an open palm" shot is impossible. A bought asset (€50–500,
  ArtStation) is the only route to it, and Gerrit knows.
