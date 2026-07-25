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

## 7. Encoding (see `tools/build-film.sh`)

- Seedance emits **one keyframe** for the whole clip. Forcing `-g 6` is mandatory or
  scrubbing stutters — a seek would otherwise cost ~170 frames of decode.
- H.264 only. The file is *seeked*, not played, and hardware seek beats VP9's ~30%
  size win.
- Strip audio. Nobody hears it and it is most of the file size.
- Local testing needs a **range-capable server** — `python -m http.server` has none,
  and video seeking silently fails in a way that looks like a code bug.
