# HANDOVER — ZeroPoint worlds page, detail upgrade

*Written 25 Jul 2026 at the end of a long session. Read this top to bottom before
touching anything. Everything here is verified, not assumed.*

---

## 0. The one-paragraph brief

`worlds.html` is a scroll-driven descent through ZeroPoint's four business worlds,
rendered in real time on a 2D canvas (`assets/js/zp-worlds.js`). It is **the route
we are shipping.** Gerrit's goal is one thing: **push its graphical detail to the
level of AI-generated cinematic stills, without giving up the real-time engine.**
The method for doing that is proven and described in §3 — your job is to apply it
to what is left, then harden and ship.

**Do not rebuild this as video.** That was tried this session and failed; see §7.

---

## 1. Where things stand right now

Branch `immersive-3d`, **nothing committed** — all work is uncommitted in the
working tree. Review before you commit.

### Working and verified
- **All four worlds render from HD plates** (`assets/img/worlds/*.webp`, 391 KB
  total). No world is procedurally shaded any more, so the old ~941 ms deferred
  fbm queue is **gone**. Veil drops at ~1.8 s, no console errors.
- **The core** is still procedurally shaded, hand-matched to `CI/Landing.png`.
  Its sprite is verified byte-identical to the Job A original (sha256), so any
  refactor you do must keep it that way — see §5.
- **The origin beat holds.** Scene progress clamps at `SCENE_END = 6/7`; past that
  the world freezes and only copy scrolls. Probe-verified: eye x/z go bit-identical.
- **No ring around the mark.** The reference engine's starlight torus was removed;
  the mark resolves alone on a soft radial lift.
- Engine header notes 1–17 in `zp-worlds.js` document every deviation from the
  reference engine, with the reasoning. **Read them.** They are dense but they will
  save you from re-making decisions that were already made carefully.

### Parked, not deleted
- `worlds-film.html` + `assets/film/descent.mp4` (18.6 MB) — the video-backdrop
  build. It works, but it is **not** the route (§7). Leave it on disk.

---

## 2. Your objective, in priority order

**P0 — Plate the core.** It is the single biggest element on screen and the first
thing anyone sees. It is the last procedurally-shaded body. Same pipeline as §3.
This is the highest visual return available and it is maybe 30 minutes.

**P1 — Portrait / mobile.** Completely untested this session. The engine has a
portrait path (`cx 0.5, cy 0.40`, 0.55 star density, sprite sizes drop to 512) but
nobody has looked at it since the plates landed. Plates are fixed-resolution, so
check they do not look soft on a 3× DPR phone, and check the copy still clears the
subject. **Assume something is broken here.**

**P2 — Richness passes** (in descending value):
- the **dust/helix stream** is single-pixel points; it is the connective tissue of
  the whole descent and currently the least detailed thing on screen
- the **asteroids** are flat procedural polygons around World 03
- the **origin beat** is near-empty; it could carry more
- the fbm budget freed by plating (~941 ms) is yours to spend on star/dust counts

**P3 — Ship.** `npx vercel --prod --yes`. Production alias is
**`zp-website-eta.vercel.app`** (NOT `zp-website.vercel.app` — different project).

---

## 3. THE PIPELINE — how to upgrade a body's detail

This is the whole trick. It is proven on all four worlds; it will work on the core.

```
canvas sprite  →  upscale (Magnific)  →  re-cut alpha  →  drop into pl.plate
```

**Why an upscaler and not image generation:** an upscaler *cannot reframe*. The
engine renders a sprite whose disc is exactly `0.68 × canvas` (see
`renderSpriteRows`: `R = S * 0.34`), and `drawPlanet` depends on that contract. An
upscale preserves it for free. Image **generation** with the sprite as a reference
was tried and rescales the subject up to 3×, which breaks the contract and the
inter-body scale relationships. Do not use `images_generate` for this.

### Exact steps

1. **Render the sprite to a square JPEG on black.** Use
   `scratchpad/sprite-out.mjs` from this session, or reproduce it: borrow the class
   via `window.__W = Worlds`, `Object.create(W.prototype)`, set `inst.dpr = 1`, call
   `inst.renderSpriteRows(img.data, kind, S, 0, S)`, composite on `#000`, export JPEG.
   Needs a **range-capable local server** — see §6.

2. **Upload → upscale.** `creations_request_upload` → HTTP PUT the bytes →
   `creations_finalize_upload` → `images_upscale`:
   ```
   mode: creative, scale: 2x, presets: subtle,
   creativity: 5, resemblance: 6, hdr: 4
   prompt: <describe the surface + "isolated on pure black", cold palette,
            "no warm tones, no stars, no other objects, no text, no logo">
   ```
   **Do not raise creativity past ~6.** At 9 it hallucinates ridged debris into the
   background, which destroys the empty void the copy needs. Tested.

3. **Re-cut the alpha:**
   ```
   python3 tools/make-world-plate.py <upscaled.jpg> <out.png> 0 --fitted
   ```
   `--fitted` skips disc detection because the sprite already obeys the contract.
   The script prints corner alpha and asserts it is 0 — **if it is not 0 you will
   get a visible rectangle around the body in-scene.** That bug is real and cost
   an hour; the script now guards it.

4. **Convert to WebP** (`quality=90, method=6`) and drop in
   `assets/img/worlds/`, then add `plate: 'assets/img/worlds/<kind>.webp'` to the
   planet def in `zp-worlds.js`. `loadPlates()` handles the rest and falls back to
   the shader if the file 404s.

**Cost:** 90 credits per body at sprite resolution. The whole four-world set cost
under 400. Budget is not a constraint here — ~120,000 credits remain.

### For the core specifically
The core sprite is 1280 px (mobile 768) and is rendered **synchronously before
first paint** behind the veil. If you plate it, that blocking render disappears and
boot gets faster. Keep `makeSprite('core')` intact as the fallback path. Its shader
is matched to `CI/Landing.png` — use that image as your upscale prompt reference so
the plate does not drift off-brand.

---

## 4. Reference material — you already own it

`reference/worlds/` (23 MB, committed for you):

| path | what it is |
|---|---|
| `generated/hero-core-cinematic.jpg` | 4K Seedream hero of the core. **The look target.** |
| `generated/basalt-hero-detail.jpg` | best hex-stone surface detail produced all session |
| `generated/fissure-4k.jpg`, `ice-4k.jpg` | source art for the current fissure/ice plates |
| `generated/basalt-hexplate-closeup.jpg` | bevelled hex plate macro detail |
| `beats/beat*.jpg` | the 7 story beats at 4K, upscaled — use as composition/lighting targets |
| `plates/` | the shipped plates, for diffing |

`CI/Landing.png` is the original brand reference the core shader was matched to.
More material lives in the Magnific account library if you need it.

---

## 5. Invariants you must not break

1. **The core sprite must stay byte-identical** unless you are deliberately
   replating it. Verify with the sprite-dump harness (renders each kind headless
   and sha256s it) before and after any shader refactor.
2. **The plate contract is `disc = 0.68 × canvas`, centred, alpha-cut.** Break it
   and bodies draw at the wrong size.
3. **Plate corner alpha must be exactly 0.** Generated/JPEG "black" is 3–8, not 0;
   a naive luminance alpha paints a visible rectangle.
4. **The mark is never generated and never in any plate.** It is `assets/logo/mark.svg`,
   drawn as a billboard by the engine. Every image model mangles it.
5. **The descent ends at `SCENE_END = 6/7` and freezes.** The copy layer and rail
   keep reading full-page progress. Do not "restore" the finale swing-out without
   asking — it was cut deliberately.
6. **Baked plate lighting only works because `drawPlanet` billboards without
   rotation.** If you ever rotate a body, that kind must revert to the shader.

---

## 6. Tooling and verification

**Local server must support HTTP Range** or video/media silently fails and looks
like a code bug. `python -m http.server` does **not**. Use the Node server from
this session's scratchpad, or any equivalent.

Harnesses that exist and are worth rebuilding if lost (all Playwright + system
Chrome with `--enable-unsafe-swiftshader`):
- **sprite dump** — renders each kind headless, composites on `#0b1322`, sha256s.
  Catches unintended shader drift. *Composite on the scene ground, never dump on
  transparency — Chrome emits a palettised PNG that invents colour banding and
  you will chase an artifact that does not exist.*
- **beat capture** — screenshots the scene at each of the 7 beats. Hide copy with
  `visibility:hidden`, **never `display:none`** — that collapses scroll height and
  every beat captures an identical frame.
- **scroll sweep** — probe-injection via `page.route` on `zp-worlds.js` to publish
  camera/body state per frame, verifying the enter-once invariant.

Key docs in-repo:
- **`tools/CAMERA-GRAMMAR.md`** — the descent's camera law and the full table of
  prompt approaches that do not work. Read before any generation.
- **`LEARNINGS.md`** — brand rules, CI palette, prior pipeline findings.
- **`zp-worlds.js` header notes 1–17** — every engine deviation and why.

---

## 7. Do not repeat these

Each was tried this session and cost real money or hours.

| Attempt | Outcome |
|---|---|
| Rebuild the page as a scroll-scrubbed video backdrop | Built and working, but measured **±7% sharpness vs the canvas with no consistent winner** — i.e. it reproduces the canvas while costing 18.6 MB, pointer parallax, and portrait recomposition. Root cause: keyframes were derived from canvas renders, so the film's ceiling *is* the canvas. |
| Free-prompt the camera grammar | "Helical stream" → face-on galaxy whirlpool; "looking back up its path" → ignored, plus **astronauts in 3 of 6 shots**; "wide empty margin" → invented white poster matte. |
| `images_generate` with a canvas frame as reference | Keeps direction, **rescales subject up to 3×**. Breaks the plate contract. |
| `images_expand` to un-crop a sphere | **Regenerates** rather than extends; destroyed the crescent. |
| Prompting a cold gas giant | Reverts to Jupiter browns across 4 explicit vetoes. **Grade in post** (`cold_grade` in `make-world-plate.py`), never in the prompt. |
| Dropping fbm octaves for speed | Recovered 1.4%. The cost was resolution, not octaves. Moot now that everything is plated. |

---

## 8. Definition of done

- [ ] Core runs from an HD plate; boot no longer blocks on a synchronous 1280 px render
- [ ] All five bodies read as one consistent set — same light direction, same crescent
      side, sane relative scale down the descent
- [ ] Portrait verified on a real phone viewport: nothing soft, copy clears every subject
- [ ] Sprite-dump hashes recorded for the new baseline
- [ ] No console errors; veil drops < 2 s
- [ ] Deployed to `zp-website-eta.vercel.app`
- [ ] Engine header gains a note describing what you changed and why

## 9. One judgement call to make early

With everything plated, the engine no longer shades anything per-frame except the
core's screen effects. That frees a real budget. Ask early whether to spend it on
**more bodies/detail** (denser dust, real asteroid sprites, a richer origin) or on
**motion quality** (higher star counts, smoother parallax). Gerrit's stated goal is
*detail*, so bias toward the former — but confirm rather than assume.
