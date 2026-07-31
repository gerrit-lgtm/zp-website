# ZeroPoint — Camera Grammar

*The single source of truth for how the descent moves. Applies to BOTH renderers:
the real-time canvas engine (`assets/js/zp-worlds.js`) and the pre-rendered film
(`worlds-film.html`). If the two ever disagree, this file is right and the code is
wrong. Written 25 Jul 2026 after several rounds of getting it wrong.*

---

## 1. The law

> **The camera falls BACKWARDS and DOWNWARD along the outside of a helical stellar
> stream, and it always looks BACK UP its own path at where it came from.**

Everything else follows from that one sentence. Concretely, in every frame:

| | |
|---|---|
| **Bodies already passed** | recede UP and AWAY — shrinking, drifting toward the top of frame, then out |
| **The body being entered** | rises INTO frame from below, grows, then becomes a "passed" body |
| **The dust stream** | trails away from camera toward the upper right; it is the path just travelled |
| **Net feeling** | falling, weightless, unhurried — never flying forward, never orbiting |

**The camera never turns around.** It does not look where it is going. That is the
whole idea: you are falling away from the origin of value and watching it recede.

## 2. Fixed staging rules

These are not aesthetic preferences; break them and the page stops working.

- **Light comes from ONE side and never moves.** Every body is crescent-lit on the
  same limb throughout the entire descent. A light that switches sides between
  beats reads as a cut.
- **Subject lives in the RIGHT half. The LEFT half stays empty and dark.** The copy
  column sits there. This is a layout constraint, not a composition preference.
- **Scale descends with the story.** Core (vast) → World 01 → 02 → 03 → World 04
  (smallest) → origin (empty). A world that reads bigger than the one before it
  breaks the sense of falling away.
- **The CI mark is NEVER in the footage.** It composites as SVG at the origin beat.
  See §5.

## 3. The 7 beats

Page scroll maps linearly onto the descent across sections 0–6, then **freezes** at
beat 6 while the arrival copy scrolls over the held frame.

| Beat | Section | What the camera sees |
|---|---|---|
| 0 | hero | The core, close and vast. The stream begins here. |
| 1 | departure | Core receding; we have started to fall. |
| 2 | World 01 · Enterprise | Hex-plated stone world. Core now small above. |
| 3 | World 02 · Consulting | Banded gas giant. Two bodies above, diminishing. |
| 4 | World 03 · Factory | Veined world + asteroid belt. Three above. |
| 5 | World 04 · Team | The smallest world, crescent-lit, thin atmosphere. |
| 6 | origin | Near-empty void; stream converges to a point of light. |

## 4. How to produce film keyframes (the method that actually works)

**Do NOT describe the camera grammar in a text prompt.** This was tried repeatedly
and fails hard — see §6. Instead:

1. **Render the beat from the canvas engine.** It already implements this grammar
   correctly. Capture with the copy layer hidden via `visibility:hidden` — *not*
   `display:none`, which collapses the page height so every beat captures the
   same frame.
2. **Upscale that frame** (`images_upscale`, mode `creative`, preset `subtle`,
   creativity ~4, resemblance ~6). An upscaler **cannot reframe** — preserving
   composition is its entire function. This is why it works where generation does
   not.
3. **Never use `images_generate` with the frame as a reference** to "re-render it in
   HD". It preserves direction but rescales the subject unpredictably (measured:
   up to 3× zoom), and scale consistency between beats is the thing that sells the
   descent.
4. **Chain clips on shared keyframes** — clip N's end frame IS clip N+1's start
   frame — so seams are continuous by construction rather than by luck.

### Clip durations are deliberately unequal
Each clip's length is proportional to how many beat-intervals it spans, so that a
linear scroll→time mapping puts each world under its own copy. Do not normalise
them. Video is priced per second, so splitting a 12s clip into two 6s clips costs
exactly the same — **there is no cost saving in spanning two beats with one clip,
only a loss of one beat.**

### Every beat must be a keyframe
If a beat is not the start or end frame of some clip, that world **does not appear
in the film** — the clip just interpolates straight past it. The first cut spanned
beats 2→4 in one clip and World 02 vanished completely, leaving "Clarity before
code" playing over the veined world. The current map (also in `build-film.sh`):

| clip | beats | secs | |
|---|---|---|---|
| A | 0 → 2 | 12 | core, departure, arrive World 01 |
| B | 2 → 3 | 6 | World 01 → World 02 |
| C | 3 → 4 | 6 | World 02 → World 03 |
| D | 4 → 5 | 6 | World 03 → World 04 |
| E | 5 → 6 | 6 | World 04 → origin |

36s total = 6 intervals × 6s, uniform.

## 5. Why the mark is never generated

Every image and video model mangles the aperture logo. It is composited as
`#mark-overlay` (SVG) over the film at the origin beat. When capturing the canvas
beat 6 as a keyframe reference, patch the mark draw out first (route-intercept
`zp-worlds.js` and neutralise the `this.markImg.complete` branch), or the upscaler
will bake a mangled logo into the plate.

## 6. Failure modes — do not re-litigate these

Each cost real credits to discover.

| Prompt intent | What the model actually produced |
|---|---|
| "helical stream / spiral corkscrewing away" | a face-on **galaxy whirlpool** |
| "camera looking back up its own path" | ignored; plus **astronauts in 3 of 6 shots** despite "no people" |
| "wide empty margin around the subject" | an invented **white border / poster matte** |
| "the planet is small in an empty frame" | subject **fills the frame** anyway (subject-fills-frame bias) |
| "banded gas giant, cold blue, NO brown" | **Jupiter's browns**, across 4 explicit vetoes |
| `images_expand` to complete a cropped sphere | **regenerated** the image; destroyed the crescent |

**The lesson:** fight none of these in prose. Supply the composition as an image and
let the model only add fidelity. Correct palette in post (`tools/make-world-plate.py`
has `cold_grade`), never in the prompt.

## 7. The screen-space law (added 25 Jul 2026, after the early-descent wobble)

The law in §1 constrains the camera's WORLD path — but the viewer never sees the
world path. They see where the salient body sits on screen, frame to frame. A
camera that is perfectly smooth in world space can still wobble on screen, and
the eye reads that as "the camera is circling something."

> **Judge every camera change by the featured body's screen trajectory, not by
> the camera's path. Its screen X may reverse direction ONLY at a beat's rest
> point — never mid-seam.**

What produced the violation (so it isn't rebuilt): the first two camera keys sat
far up the helix, so the eye swept 158° + 147° of orbit across the first two
sections while the aim stayed pinned to the core — which sits ON the helix axis.
Orbiting an on-axis subject while staring at it is a ring, not a fall. On screen
the core went left, +163px right, −476px left, then a +1079px whip right. The
fix was not aim shaping (eases and hand-off windows moved the dip by ~10%); it
was moving the two spliced keys down the coil (`buildKeys()`: 0.045 / 0.115),
cutting the pre-World-01 orbit from 305° to 151°. **Angular travel per section
is the lever; the aim only decorates it.**

Related traps, all measured on this build:

- **Eased key interpolation concentrates rotation mid-seam.** Smoothstep means
  angular velocity peaks at the seam's middle — the aim must already own the
  next body by then (the 80% hand-off in `camera()`), or the peak whips it.
- **Beats pin the endpoints.** Beat framings are load-bearing (plate sizes,
  copy contrast) — cleanliness work happens BETWEEN beats. If a seam cannot be
  made monotone with the beats fixed, move a spliced key, not a beat key.
- **An entering body can overshoot its beat size.** The camera key can sit
  closer to the body's orbit than the beat does, so it swells past beat size
  mid-entry and shrinks to rest. Check size-over-time on entry, and remember
  plate budgets are set by measured PEAK draw (`tools/measure-draw.mjs`), which
  is often mid-seam, not at the beat.
- **The stream must CONNECT to both of its anchors.** The coil's geometry
  stopped at TOP while the core floats 2.6 above it; in stills the gap read
  fine, but a camera pitched up at the core saw only empty space between them —
  the stream left the frame around f 0.7 and re-entered with World 01, an
  exit-and-re-enter of the film's own current. Fix: taper the dust INTO each
  anchor (the HEAD to the core's limb, the TAIL into the origin mark — both in
  `buildScene()`). And tune such connective dust against the body's real plate:
  values that read against empty black disappear against a bright halo.

### How to verify a camera change (the sweep discipline)

1. **Replicate `camera()` + `proj()` in a ~100-line node sim** and print each
   body's screen-X turning points with swing amplitudes across the sweep. This
   makes wobble a NUMBER (px of reversal) before anything ships. Grid-search
   knobs offline with hard constraints: beat frames pixel-identical, peak draws
   not exceeded.
2. **Run the real harnesses** (probe injection via Playwright route
   interception — the shipped file is never modified): `tools/scroll-sweep.mjs`
   landscape + portrait (enter-once invariant, compare against baseline, not
   against perfection) and `tools/measure-draw.mjs` (plate budgets).
3. **Capture before/after frames** at ~10 scroll positions (`git stash` to
   capture the committed baseline) and look at them. The numbers catch
   reversals; only eyes catch a composition that stopped telling the story.

## 8. Encoding (see `tools/build-film.sh`)

- Seedance emits **one keyframe** for the whole clip. Forcing `-g 6` is mandatory or
  scrubbing stutters — a seek would otherwise cost ~170 frames of decode.
- H.264 only. The file is *seeked*, not played, and hardware seek beats VP9's ~30%
  size win.
- Strip audio. Nobody hears it and it is most of the file size.
- Local testing needs a **range-capable server** — `python -m http.server` has none,
  and video seeking silently fails in a way that looks like a code bug.
