# WORLDS-POLISH — hand-off brief for the next agent
*25 Jul 2026. Scope: `worlds.html` ONLY. Two jobs: (A) hero/render quality to
`CI/Landing.png` standard, (B) fix the camera flow so no body ever leaves the
frame and comes back. Everything else about the page is signed off.*

---

## Context — read these first, in this order

1. `STATUS.md` — where the project is. `worlds.html` is one of three parallel
   experiences (index = frame-scrub film, lab = Three.js core, worlds = this).
2. `assets/js/zp-worlds.js` — the engine. It is a **verbatim port** of
   `prompts/reference-core-engine.js` (Gerrit's designed scene) with every
   deliberate deviation listed in the file's header comment. Keep that
   discipline: any change you make to a verbatim region gets added to that
   numbered list.
3. `worlds.html` + `assets/css/worlds.css` — 8 sections of exactly 100vh.
   **The timing model is sacred:** scroll fraction `p ∈ [0,1]`, `f = p*7`,
   section i rests at `f = i`. Do not add sections, change heights, or touch
   the other two pages (except a shared bug, as site.css was for underlines).
4. `LEARNINGS.md` §CI — brand rules. Blue is emphasis/rim only, space is never
   pure black, no neon/teal/purple, Plus Jakarta Sans + Inter.

The scene: black-hole core at the summit of a braided star helix → manifesto →
four worlds (one per turn, one per business world) → origin ring resolves into
`assets/logo/mark.svg` → pull-back finale + contact form.

Work on branch `immersive-3d`. A verification pass already ran on this page;
don't re-litigate what's there — only the two jobs below.

---

## Job B first (it's the sharper bug) — the black hole exits and re-enters

**Symptom:** scrolling from the hero, the black hole drifts out of frame, then
*comes back into frame* around the manifesto beat before leaving again. The
same aim "dip" happens at every seam. It breaks the one-continuous-fall
illusion; worlds should emerge one by one, each entering the frame once,
holding, and exiting once.

**Root cause — `camera()` in `assets/js/zp-worlds.js`:**

```js
const si = Math.max(0, Math.min(6, Math.round(f)));
const w  = Math.max(0, 1 - Math.abs(f - si) * 1.7) * (si === 0 ? 1 : si === 1 ? 0.5 : 0.62);
if (w > 0) tgt = tgt.map((x, j) => x + (feats[si][j] - x) * w);
```

The look-target is a blend between a default "look back up the path" target
and the section's featured body (`feats[si]`). The blend weight `w` falls to
**zero** whenever `|f − si| ≥ 0.588` — i.e. in the middle of every seam the
camera stops looking at ANY body, swings to the path default, then re-acquires
the next body and swings back. That swing is what throws the black hole (and
later each planet) out of frame and back in. It's inherited from the original
7-section design where the seams were shorter; with 8 sections the dip is
visible on every transition, worst on hero→manifesto where both sections
feature the SAME body (the core) with weights 1.0 and 0.5 and a zero-dip
between them.

**Required fix — make the aim continuous.** Replace the round-to-nearest +
dip-to-zero scheme with a crossfade between *consecutive* features, e.g.:

```js
const i0 = Math.min(5, Math.floor(f)), i1 = i0 + 1;
const tt = f - i0, e2 = tt * tt * (3 - 2 * tt);          // smoothstep
const wA = W(i0) * (1 - e2), wB = W(i1) * e2;            // W(i) = per-section weight (1 / 0.5 / 0.62)
// blend: default-path target gets (1 - wA - wB), feats[i0] gets wA, feats[i1] gets wB
```

so the featured-body weight never collapses to zero mid-seam — the camera
hands its gaze from one body to the next in a single move. Requirements:

- **Invariant:** for any monotonic scroll, each body's projected screen
  position moves continuously and never re-enters after exiting. The black
  hole must stay framed from `p = 0` through the manifesto and hand off to
  World 01 in ONE motion.
- Preserve the finale override (`f > 6`) and the hero pull-out (`f < 1`).
- Keep or gently tune the scroll smoothing (`ps += (p − ps) * 0.085`); the
  fall must feel weighty, not floaty. Do not add a scroll-hijack library.
- Retune the per-section weights (`1 / 0.5 / 0.62`) freely if the crossfade
  changes how strongly bodies are held — judge by eye against the invariant.

**How to verify (this is the acceptance test):** dense scroll sweep.
`python3 -m http.server 8899` in the repo, then a Playwright script
(`npm i playwright` in a temp dir; launch with channel `'chrome'` and
`--enable-unsafe-swiftshader`) that steps `scrollTo(0, k * 0.02 * 7 * innerHeight)`
for k = 0…50 with ~1.2 s settle, screenshotting each step. Flip through the
frames: every body should enter once, hold, exit once — no body pops back.
Do the sweep for the full journey, not just the hero. Also test by hand in a
real browser; the sweep can miss feel.

---

## Job A — "Super HD" opening, `CI/Landing.png` as the quality bar

Open `CI/Landing.png`. That image IS the brand cover: a dark hex-faceted
sphere, a **dazzling electric-blue crescent** on the left limb with layered
bloom that reads almost white at its core, lit facet seams sparkling near the
terminator, faint concentric arcs echoing off the GLOW side, deep blue-black
space. The current hero is the same design language but visibly softer and
dimmer. Close the gap:

1. **Sprite resolution.** `makeSprite()` renders every body at S = 384 px and
   the core is drawn ~700–1000 px wide on a dpr-2 desktop — it's upscaled and
   soft. Render the core sprite at 1024–1536 px and planets at ~768 px.
   The per-pixel loop is O(S²·fbm) — keep boot time in check by generating
   the core first (it's the first thing seen), deferring the four planet
   sprites to after first paint (rAF-chunked or idle), and keeping the veil
   until the core sprite exists. Set `ctx.imageSmoothingQuality = 'high'`.
2. **Rim intensity.** Landing.png's crescent is far hotter than the current
   `rimK = 8.5`. Push the core's rim toward blown-white at the limb with an
   electric-blue falloff (two bloom layers: tight + wide), and let facet
   seams near the terminator catch the rim light (the reference shows lit
   hex edges creeping around the curve).
3. **Concentric arcs.** `drawCore()` draws 8 full circles; in Landing.png the
   arcs live on the lit side and fade off. Bias arc alpha toward the glow
   side (modulate by angle relative to the light direction).
4. **Stay procedural if possible.** If the procedural core genuinely can't
   reach the bar, fallback option: bake one high-res core once (offline, into
   `assets/img/`) and draw it as the sprite — but it must still accept the
   engine's spin/parallax/scale, and the four planets stay procedural.
5. **Do not** solve it with more grain, blur, or a neon palette shift — the
   colour family of Landing.png (white-hot core → electric blue → deep
   peacoat) is already CI-legal; match it, don't exceed it.

**Acceptance:** side-by-side of the live hero at 1440×900@2x against
`CI/Landing.png` — comparable crescent intensity, comparable edge sharpness on
the facets. 55+ fps while scrolling on desktop (measure with a rAF counter),
no boot longer than ~1.5 s behind the veil, mobile still on the 0.55 star
density path.

---

## Ship it

- Test locally (desktop 1440×900 + mobile 390×844 emulation), then commit on
  `immersive-3d` with a message that says what changed and why, push, and
  deploy: `npx vercel --prod --yes` from the repo root.
- Verify live at **https://zp-website-eta.vercel.app/worlds.html** (that's the
  production alias — `zp-website.vercel.app` is NOT this project). Screenshot
  the live hero and the finale as proof.
- Update `STATUS.md`'s worlds.html bullet with one line about the polish pass.

## Don'ts

- Don't change the section count, section heights, copy, or the mark
  resolution at the origin — signed off.
- Don't add build tooling or runtime dependencies; the site deploys as plain
  static files.
- Don't touch `index.html` / `lab.html`.
- Don't remove the reduced-motion, no-canvas, or resize-guard paths.
