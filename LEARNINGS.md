# Findings & Learnings — ZeroPoint Immersive Site
*Everything discovered before/while planning, so any future session can pick up cold. 24 Jul 2026.*

## From the Lion Cage immersive build (what we reuse)

- **The engine works and is proven live:** video → frames → drawn onto a fixed full-screen `<canvas>`, scroll position selects the frame (Apple-style scrub). Scrolls forward AND backward. Plain HTML/CSS/JS + GSAP ScrollTrigger + Lenis smooth scroll. No build step — files upload straight to xneelo `public_html`.
- **Structure to copy:** decide render mode before first paint (immersive vs simple) to avoid flashes; poster image behind each canvas so nothing is ever black while frames load; lazy-load current + next scene; dots nav + progress bar; cursor parallax on hero; contact form posts to `send-email.php` (works on xneelo, fake-succeeds on Vercel previews).
- **Its limits we must beat:** only 30 frames/scene at 1280×720 JPEG → visible stepping on slow scroll, soft on big screens. ZeroPoint: ~120 frames/clip, 1920w WebP (~q68), progressive loading, per-scene focal point for mobile crops.
- **Lion Cage crossfades between unrelated clips.** ZeroPoint is ONE continuous reversed helix — chained start/end frames instead of dissolves.

## From the ZEROPOINT CI (the rules we build under)

- Palette: Peacoat `#192231` (60%, backgrounds) · Surf the Web `#1D3557` (20%) · Dazzling Blue `#2B579A` (10%, highlights/interactive ONLY) · Stormy Weather `#5A6F8A` · Cool Gray `#75787B` · Bright White `#F4F4F0`.
- Type: Plus Jakarta Sans (Display 72 XBold → H3 28 SemiBold), Inter for body/UI (18/16/14/12). Sentence case. Never ALL-CAPS paragraphs. Blue for emphasis only.
- Layout: 12-col grid, 1168px content, 96px margins, 24px gutter, 8pt spacing scale, 12px radius, 48px controls. Breakpoints 1280/768.
- Photography rules that shaped our video prompts: high contrast, single directional light, blue as ambient/rim only, restrained grading, depth & scale. BANNED: neon, cyberpunk, purple/teal/orange nebulae, oversaturation, sci-fi kitsch, futuristic robots.
- Brand narrative we reuse as site copy: "The point where value begins." / "Everything begins from a point → decision → direction → momentum → value." / "A single point. Infinite potential."
- Logo: aperture/lens iris — outer ring (the zero), five blades, optic at (0,0). Assets in `CI/` (Black.svg, White.svg, White.png, logo black.png). The black hole hero IS this mark at cosmic scale (Gerrit's cover image, locked 24 Jul).

## Magnific / Freepik MCP — operational notes

- **Credits:** account is Premium+ with unlimited in the web UI, but **unlimited does NOT apply to MCP** — every MCP generation burns credits (balance was 210,144/540,000 on 23 Jul). Always `simulate_cost` first; tell Gerrit before big spends.
- **Costs seen:** Nano Banana Pro still, 4K, ≈150/image. Magnific ultra-photo 2x upscale ≈270. Kling 3.0 15s 1080p ≈1,350/take. 4K video needs extra connector permissions.
- **Models chosen:** stills = Nano Banana Pro (`imagen-nano-banana-2`); video = `kling-30` (15s, 16:9, 1080p, start+end keyframes — exactly what the chain needs).
- **Quirks:** don't fire two generation calls in parallel — it killed the connection once ("Connection closed"; fixed by reconnecting the connector in Settings). The Freepik CDN (`pikaso.cdnpk.net`) and upload endpoints are blocked from Claude's sandbox — Claude can generate/upscale/reference by identifier, but **cannot download files to disk**; Gerrit downloads keepers from Freepik (or magnific.com → creation page) into `video-pipeline/chain/` manually. Uploads from disk go through the inline upload widget.
- Kling clip prompts must stay ≤2500 chars (all g1–g5 prompts verified: 1.5–1.7k).

## The core generation trick (Gerrit's, validated)

Generate the journey as an ASCENT (destination grows ahead — AI video is good at this), play it REVERSED on site. Chain clips with real frames: each clip's start image = previous clip's extracted last frame; pin the two ends with locked stills (Still B bottom, Still A top). Regenerating any middle clip later with its stored start+end PNGs keeps every neighbour pixel-valid — miniature updates forever.

## Camera grammar — SOLVED, 25 Jul 2026 → `tools/CAMERA-GRAMMAR.md`

The descent's camera law ("falls backwards down the outside of the coil, always
looking BACK UP its own path") **cannot be produced by prompting.** Read
`tools/CAMERA-GRAMMAR.md` before touching the film or the scene. Short version of
how it was eventually fixed:

- **Describing the camera move in prose fails.** "Helical stream corkscrewing away"
  produces a face-on galaxy whirlpool; "looking back up its own path" gets ignored
  and adds astronauts; "wide empty margin" invents a poster matte. Full table of
  failure modes is in the grammar file — they cost real credits to find, don't
  rediscover them.
- **The canvas engine already implements the grammar correctly**, so it is the
  structural source of truth. Render each beat from it (hide copy with
  `visibility:hidden`, never `display:none` — that collapses scroll height and every
  beat captures the same frame), then **upscale** those frames.
- **Upscale, don't re-generate.** An upscaler cannot reframe; that is the entire
  point. Feeding a frame to `images_generate` as a reference keeps the direction but
  rescales the subject up to 3×, and inter-beat scale consistency is what sells the
  fall.
- **Video is priced per second, not per clip.** Two 6s clips cost exactly the same as
  one 12s clip — so there is never a reason to span two story beats with one clip.
  Doing so just loses a beat (it is how World 02 went missing on the first cut).
- Encoding gotchas (one keyframe per clip from Seedance → force `-g 6`; H.264 not
  VP9 because the file is seeked not played; `python -m http.server` has no Range
  support so local scrub silently fails) are all in the grammar file too.

## A clean immersive 3D scroll — the playbook, 25 Jul 2026 → `tools/CAMERA-GRAMMAR.md` §7

Distilled after fixing the early-descent wobble ("camera seems to follow a small
ring around the black hole"). If we ever build another scroll-world, start here.

**The architecture that works** (all in `assets/js/zp-worlds.js`):
one continuous world geometry (here a helix) · camera keys, one per section,
smoothstep-interpolated, riding just outside the geometry · aim = crossfade
between consecutive featured bodies, hand-off complete at 80% of the seam ·
copy as DOM overlay driven by RAW scroll (answers the wheel instantly) while
the scene reads a damped follower (0.085) · per-beat emergence fade so bodies
enter exactly once · scene freezes at SCENE_END and the last copy scrolls over
a held frame · bodies are pre-rendered plates (billboards), procedural shader
only as fallback.

**The discipline that keeps it clean** (full version: grammar file §7):
1. The viewer sees the SUBJECT's screen path, not the camera's world path —
   its screen X may reverse direction only while the camera rests on a beat.
2. Never orbit a body that sits on the path's axis while aiming at it; angular
   travel per section is the lever that fixes this (we cut 305° → 151° before
   World 01). Aim shaping (eases, windows, weights) barely moves the needle.
3. Prove it with numbers BEFORE shipping: a ~100-line offline replica of
   `camera()`+`proj()` printing per-body screen-X turning points; then
   `tools/scroll-sweep.mjs` (enter-once, both orientations, vs baseline),
   `tools/measure-draw.mjs` (plate budgets — peak draw is often mid-seam, not
   at the beat), and before/after screenshots via `git stash`.
4. Beats are pinned (plates + copy contrast were measured against them);
   all cleanliness work happens between beats, by moving spliced keys.
5. Connective geometry must reach its anchors: the stream tapers INTO the
   core above (HEAD) and the origin mark below (TAIL) — a stream that stops
   short pops out of frame when the camera pitches at the body it should
   join. And when comparing renders across a session, check the plate files'
   mtimes first: art swapped on disk mid-session looks exactly like a
   rendering regression.

## Cross-checked against `oso95/scroll-world`, 26 Jul 2026

Reviewed the public scroll-world Claude skill (video-chain scroll pages,
Higgsfield-based). Its core method — connectors frame-locked to the ACTUAL
extracted last/first frames of neighbouring renders, budget confirmed before
rendering — independently matches ours. Nothing in it replaces the canvas
engine or the camera grammar (its prompted dive/connector moves are exactly
what the grammar file proved unpromptable for our law). Not installed; four
things harvested:

- **iOS scrub priming** — a never-played video paints no frames on iOS
  Safari; one muted play()+pause() on first touchstart fixes it. Applied to
  `assets/js/zp-worlds-film.js`.
- **Blob-based seeking** (fetch clip → object URL → always seekable) as the
  host-independent answer to the Range trap. Documented in the kit, NOT
  applied here: Vercel/xneelo serve ranges, and an 18.6 MB blob fetch would
  delay first scrub.
- **Native 9:16 portrait chain** recipe (720w, `-g 4`, crf 23, first frame
  as mobile poster) and the **height-only resize guard** → both in
  `Immersive world/docs/LEARNINGS-DISTILLED.md`.
- **Budget formula** (N stills + (2N−1) clips + 15% re-roll headroom,
  confirmed before rendering) → now a step in the kit's `BRIEF-TEMPLATE.md`.

## world.json is now live wiring, not just a sketch, 26 Jul 2026

`CI/World/world.json` (exported from the Immersive-world sketcher) now drives
worlds.html directly: zp-worlds.js fetches it at boot and, when it validates,
takes the coil (turns/radius/top/bottom), the four worlds' u/r from beats 1–4,
core/origin sizes from beats 0/5, and the SKETCH camera contract — eye rides
the path scaled by `out` (inside the coil when < 1), `lead` below its path
point, aim crossfading between consecutive set pieces over `handoff`, lens
`k = min(w,h)·fov/2`. Anything else (404, malformed) boots the legacy scene
untouched. The iterate loop is: sketch → Export → drop into CI/World/ →
refresh. Three things learned wiring it:

1. Beats may carry per-beat camera keys — `cam: { out, lead }` — written by
   dragging the CAM dot in the sketcher's god view; keys interpolate between
   beats. Implemented identically in sketcher, engine-starter and zp-worlds
   (the departure key splices as the average of its neighbours).
2. Every tools/*.mjs harness probe-anchors on the literal `new Worlds();` —
   the async fetch boot keeps exactly ONE occurrence of that statement (and
   the anchor must not appear in a comment: String.replace hits the comment
   first and the probe silently no-ops into "scene never settled").
3. Measured after the switch: enter-once holds on BOTH metrics in both
   orientations (the inside-the-coil flight is cleaner than the legacy
   camera, which held centre-metric 2 on clouds/ice). Plate budgets on the
   16in class: clouds now peaks 1251px vs its 1024px source (1.22× upscale,
   soft at its biggest moment — re-plate if this camera ships) and core
   2654 vs 2560 (1.04×, imperceptible). All others keep 2×+ headroom.

**Outcome, same day:** Gerrit reviewed the inside-the-coil flight and judged
it worse than the shipped camera. `world.json` is parked as
`CI/World/world.draft.json` (the loader stays live and dormant — restoring a
flow is renaming a file), legacy verified back at its exact recorded baseline
(landscape 1/1, portrait centre-metric 2 on clouds/fissure/ice) and
redeployed to zp-website-eta.vercel.app. The loader + sketcher camera-key
tooling survive for the next attempt: the failure was this particular
trajectory, not the sketch→site loop.
