# HANDOVER — ZeroPoint worlds page, detail upgrade

*Written 25 Jul 2026 at the end of a long session, then UPDATED the same day
after a second session finished P0–P2 and shipped. Read this top to bottom
before touching anything. Everything here is verified, not assumed.*

## UPDATE — second session, 25 Jul 2026

P0, P1 and P2 are **done and deployed**. Commits `88201ce`, `e0ca40a` and the
detail pass that follows them. What changed, and what is left:

- **All five bodies are plated**, sized from measurement rather than by eye.
  `tools/measure-draw.mjs` wraps `ctx.drawImage` and reports how large each body
  is actually drawn at full opacity. It found that EVERY body was being
  browser-upscaled at its own beat — clouds 2.41x, fissure 2.15x, core 1.59x.
  "HD plate" was never the same claim as "enough pixels where it counts". Now
  nothing is upscaled at 1440x900 @2x; worst case on a 16in MBP fell 3.00x ->
  1.24x. Plate weight 467 KB -> 1.16 MB, so the four worlds load at
  `fetchPriority: 'low'` behind the veil-blocking core.
- **Boot got faster despite that**: 1070 ms -> ~570 ms. `makeSprite` is gone
  with its only caller, so nothing renders a whole sprite synchronously before
  first paint; the veil waits on the core plate instead, which is preloaded.
- **Portrait had a real defect** and it is fixed. The copy block is
  bottom-anchored, so on taller beats its eyebrow rides to ~38% of the frame,
  and at World 02 43% of that label sat on lit cloud at 2.8:1 contrast. Camera
  centre `cy` 0.40 -> 0.30. Now 2% at 5.9:1.
- **Light direction is a shippable invariant** — and ice was breaking it. See
  §5.7 below. Fixed for free by rotating the plate 180 degrees.
- **The freed render budget went to detail** (Gerrit chose this explicitly):
  dust 900 -> 2600 as a braided stream that converges on the origin, asteroids
  138 -> 230 with pits and a fixed lighting bug. draw() 1.2 -> 1.3 ms.
- **The harnesses now actually run.** They were pointing at a wiped session
  scratchpad and at the wrong port, so none of them did. Four new ones added.

**What is left**, in priority order:
1. The residual ~1.2x upscale on the very largest displays (5K/27in). Costly in
   bytes; probably not worth it — measure with `measure-draw.mjs large` first.
2. `fissure.webp` is 505 KB, nearly half the plate budget, because it is the
   brightest and most detailed. Worth a look if page weight matters.
3. Nothing else is known-broken. `git status` is clean and prod is current.

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

## 2. Your objective, in priority order — ALL OF P0-P2 ARE DONE (see the update above)

**P0 — Plate the core.** DONE. It is the single biggest element on screen and the first
thing anyone sees. It is the last procedurally-shaded body. Same pipeline as §3.
This is the highest visual return available and it is maybe 30 minutes.

**P1 — Portrait / mobile.** DONE — a real contrast defect was found and fixed. Was: completely untested. The engine has a
portrait path (`cx 0.5, cy 0.40`, 0.55 star density, sprite sizes drop to 512) but
nobody has looked at it since the plates landed. Plates are fixed-resolution, so
check they do not look soft on a 3× DPR phone, and check the copy still clears the
subject. **Assume something is broken here.**

**P2 — Richness passes** DONE (dust + asteroids; origin deliberately left minimal). Was, in descending value:
- the **dust/helix stream** is single-pixel points; it is the connective tissue of
  the whole descent and currently the least detailed thing on screen
- the **asteroids** are flat procedural polygons around World 03
- the **origin beat** is near-empty; it could carry more
- the fbm budget freed by plating (~941 ms) is yours to spend on star/dust counts

**P3 — Ship.** DONE, deployed. `npx vercel --prod --yes`. Production alias is
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
   python3 tools/make-world-plate.py <upscaled.jpg> <out.png> 0 --fitted \
       --size 2048 --verify-against .work/sprite-<kind>.jpg
   ```
   `--size` comes from `tools/measure-draw.mjs`, never from taste.
   `--verify-against` proves the upscaler did not reframe, by comparing the
   result's disc fraction to the sprite it was made from.
   `--dewarm S` removes a warm cast only where red leads blue — use it instead
   of `cold_grade` when a render is mostly cold with a few Jupiter-ish swirls;
   cold_grade's 92% desaturation would flatten the whole body to fix 1% of it.
   `--fitted` skips disc detection because the sprite already obeys the contract.
   The script prints corner alpha and asserts it is 0 — **if it is not 0 you will
   get a visible rectangle around the body in-scene.** That bug is real and cost
   an hour; the script now guards it.

4. **Convert to WebP** (`quality=90, method=6`) and drop in
   `assets/img/worlds/`, then add `plate: 'assets/img/worlds/<kind>.webp'` to the
   planet def in `zp-worlds.js`. `loadPlates()` handles the rest and falls back to
   the shader if the file 404s.

**Cost:** 90 credits for a 1024px source, 180 for 1280px+ — it scales with input
pixels. This session's five upscales cost 720. ~119,000 credits remain.
Note `account_balance` reported unlimited mode as NOT active in-session, so
generations do bill; check before a big batch.

**You may not need to spend anything.** Before upscaling, check whether the
source art already holds detail at the size you want: downscale it to the target
and compare against a round trip through half that resolution. fissure's 4K
source still had real detail at 2304 (free re-cut, no credits). ice's did not —
it was already soft at 1024, so a bigger re-cut would have bought bytes and no
detail, and it had to go through the upscaler to have detail synthesised.

### For the core specifically — DONE, kept for the method
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
7. **Every body is lit from the UPPER LEFT.** The shader's key is
   `L = (-.52, .46, .72)`. Measured as the brightness centroid inside the disc,
   core/basalt/clouds/ice sit at 162/163/143/138 degrees. Only **fissure** is
   exempt — World 03 is lit from within by design. This is easy to break with
   generated art and hard to see one body at a time: the ice plate shipped for a
   whole session at **-45 degrees**, a full phase where the rest of the descent
   is a crescent, so the light appeared to jump at World 04. Check a new plate
   against the others before shipping it, and note that relighting in post does
   NOT work — multiplying by a correct lambert term cannot undo baked lighting,
   it just muddies the body and kills the rim. Rotating the plate 180 degrees
   does work, costs nothing, and keeps the art: a sphere has no inherent up.
8. **Plate resolution is set by measurement, not by taste.** Run
   `tools/measure-draw.mjs` and size the plate to the reported peak. Do not
   assume a plate is sharp because it was called HD — all four worlds shipped at
   1024 while being drawn at up to 2470 device px.

---

## 6. Tooling and verification

**Local server must support HTTP Range** or video/media silently fails and looks
like a code bug. `python -m http.server` does **not**. Use the Node server from
this session's scratchpad, or any equivalent.

All harnesses live in `tools/` and need `npm i --no-save playwright-core` plus
the range-capable server (`node tools/serve.mjs`, port 8900). They previously
wrote to a session scratchpad that no longer exists and `sprite-dump` pointed at
the wrong port, so **none of them ran**; they now default to `.work/`
(gitignored) and share a `PORT` env var. The set:

| harness | what it answers |
|---|---|
| `measure-draw.mjs [landscape\|portrait\|large]` | how big is each body actually drawn — i.e. what resolution should its plate be |
| `boot-check.mjs [landscape\|portrait]` | veil timing, console errors, failed requests |
| `copy-contrast.mjs [cy]` | portrait legibility: how much of each eyebrow label sits on lit ground |
| `scroll-sweep.mjs [mode] [steps] [cy]` | the enter-once camera invariant |
| `perf-check.mjs [mode]` | `draw()` cost per frame — NOT the rAF interval, which is vsync-locked at 8.3 ms and tells you nothing |
| `sprite-dump.mjs [work\|head]` | shader drift, by sha256 of each kind |
| `capture-beats.mjs [mode] [--with-copy]` | the 7 story beats as images |

Three traps cost real time this session and are now commented in the code:

- **Settling a scroll sweep.** Waiting on `|ps - p| < eps` is true on the FIRST
  poll of every step, because the engine only refreshes `p` inside its own rAF
  loop and `ps` has already converged to the previous value. Reading `scrollY`
  straight back is just as stale — `worlds.css` sets `scroll-behavior: smooth`.
  Get either wrong and the sweep silently reports every body as "never drawn".
- **Measuring a disc on a dark body.** `find_disc`, a centre chord, and
  radius-of-gyration all cry wolf: the first two latch onto the crescent alone
  (they call the known-good core sprite 0.59-of-canvas and 15% off-centre), and
  the third is brightness-weighted so a brighter rim reads as a reframe. Use the
  normalised radial profile now in `make-world-plate.py`.
- **Judging label contrast.** Sampling the brightest pixel under a label fails
  everything (one star behind one letter); sampling fixed rows measures the
  planet instead of the text. Measure the share of the label's own rect that
  sits on lit ground.

Original notes, still true:
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
