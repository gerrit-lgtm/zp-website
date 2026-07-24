# HELIX v2 — The Descent, Rebuilt
*Master spec + full prompt suite. 24 Jul 2026. Supersedes `3clip-prompts.md` and `WORKFLOW.md` (g1–g3 take retired). The PLAN.md story is unchanged; v2 **amends five locked execution decisions** (generator, chain shape, hero staging, Still B's role, the ending vista) — logged in PLAN.md's change log and pending Gerrit's sign-off before generation spend.*

---

## 0. Why the current take looks clunky (verdict)

Reviewed: `video-pipeline/chain/*.png`, extracted frames in `assets/frames/`, all g-prompts, and the scrub engine.

**Asset problems (80% of the clunk):**

1. **The prompts invited the kitsch.** "Floating dark metallic geometric structures" → Kling rendered crushed metal crates with lit windows (visible in `g1-last.png`, and worse mid-clip). "Hexagonal crystalline rock clusters" → clean low-poly dodecahedra that read as board-game dice (`g2-last.png`, frame 060 of 02-galaxy-mid). "Cyan bioluminescent light" → full neon-teal lightning, explicitly banned by the CI. The model obeyed the words, not the intent.
2. **The "black hole" reads as a small neon ring** — no mass, no lensing, no scale cues. The "starlight spine" reads as a searchlight/rocket-exhaust beam, not a galactic structure.
3. **Middle legs had free endings.** Only G5's end was pinned to a designed still. With no end-image target, each 15s clip drifted into whatever Kling invented by second 8. That drift is the morphy, clunky feel.
4. **The hero still has a floor.** Still A / `CI/Landing.png` is a studio shot: ground plane, floor fog, contact shadow. Any clip that must end on it is forced to morph a floor into deep space mid-flight. The seam can never be clean.
5. **One overloaded prompt per clip.** 360° orbit + ascent + world staging + palette in one paragraph, no compositional anchors along the way.

**Engine problems (20% — fixed in `assets/js/site.js` v2):**

6. Frame index snapped with `Math.round` — visible stepping on slow scroll; no inter-frame blending, no inertia.
7. Scroll→frame velocity jumps at every beat boundary (each beat maps its own vh-span to its own frame range at a different rate).
8. Frames loaded strictly sequentially (`await` in a loop) — up to a minute before full scrub fidelity; duplicate loads on re-entry.
9. Per-scene focal point ignored in frames mode (`drawCover(img, 0.5, 1)`) — mobile crops lose their framing.
10. Segment joins are hard cuts with no cross-blend.

**Model verdict:** Kling 3.0 is *not* the core problem — start+end-frame conditioning is exactly right for this chain — but it is no longer the best tool in your Magnific account for this job. **Seedance 2.0 Pro (`bytedance-seedance-pro-2.0`) is now the primary generator**: SOTA tier, start+end keyframes, up to 15s at 1080p/4K, a 10,000-char prompt budget (the whole look bible fits), and — decisive — **explicit camera-motion presets** (`orbitLeft`, `360Orbit`, `pullOut`, `superDollyOut`…). Kling 3.0 stays as the B-take engine; Veo 3.1 (8s, start+end, 4K) is the premium option for the hero leg. Runway Gen-4/4.5 **cannot hold this chain** (no end-frame conditioning, 720p in the connector) — use it only for look exploration.

---

## 1. Motion blueprint — the one move

One unbroken shot. The camera **never cuts, never turns around**: it flies backwards down an expanding spiral, always gazing back up the axis at the black hole it is leaving.

**The trick stays (validated):** every leg is *generated as an ascent* — camera flying forward, spiraling inward and upward toward the black hole (destination grows ahead, which AI video does beautifully) — and the site plays every clip **reversed**. Reversed forward-flight = perfect backward-facing descent.

### Camera math (the exact path)

Cylindrical coordinates around the vertical spine (y-axis = the helical stellar stream, black hole at the top).
Playback progress `t ∈ [0,1]` across the whole journey, 4 legs, one full revolution per leg:

```
azimuth      θ(t) = θ₀ − 2π · 4t                    (4 revolutions total, constant direction)
radius       R(t) = R₀ · e^(3.7t)                   (R₄/R₀ ≈ 40 — exponential = constant
                                                     *perceived* zoom-out rate)
height       y(t) = −H · t^1.25                     (descent accelerates gently)
camera pos   P(t) = ( R(t)·cosθ(t),  y(t),  R(t)·sinθ(t) )
look target  L(t) = ( 0,  y(t) + 0.35·H,  0 ) + aim  (a point on the spine ABOVE the camera
                                                     → backward-facing, gazing up-axis)
aim offset   the look target is biased ≈ 0.15 frame-widths screen-LEFT of the spine,
             constant sign for the whole journey — this pushes the spine, planets and
             black hole into the right two-thirds of frame (the left third is the
             site's text zone) in every keyframe
roll         locked to horizon (no dutch), FOV constant ≈ 35°
```

Because `L(t)` sits up-axis while `P(t)` moves down-and-out, the velocity vector points *away* from the view direction at all times — the user's "flying backwards" rule, guaranteed by construction. For a future WebGL build this is a drop-in `CatmullRomCurve3` / parametric camera (including the aim offset); for the video pipeline it is the sentence every prompt repeats.

### Keyframe camera table

| Keyframe | t | Revolutions from top | R (rel.) | Black hole size in frame | What's in frame |
|---|---|---|---|---|---|
| **K0** Hero | 0.00 | 0 | 1 | ~85% height (near-field macro) | Aperture black hole macro, right two-thirds; helix coils falling away below-left |
| **K1** Enterprise | 0.25 | 1 | ~2.5 | ~22% | Planet 1 foreground lower-right; black hole upper centre-right; stellar stream connecting them |
| **K2** Consulting & Media | 0.50 | 2 | ~6.4 | ~9% | Planet 2 foreground right; Planet 1 small on the coil above; first S-curve of helix visible |
| **K3** AI Factory | 0.75 | 3 | ~16 | ~3.5% | Planet 3 foreground lower-right; asteroid belt mid-ground; Planets 2 & 1 receding up the coil |
| **K4** Team + Vista | 1.00 | 4 | ~40 | ~1.5% (a bright crown) | Planet 4 near right; ENTIRE helix revealed — four planets strung on the coil, black hole crowning it; thin ring of light at the coil's base, centre-right, above the lower edge |

(The size ladder follows 1/distance from the K1 = 22% anchor — K0 is a near-field macro where linear scaling doesn't apply. Distance grows ~2.5× per leg, so the perceived zoom-out rate stays constant.)

**Composition constants (every keyframe):** left third stays low-detail and dark — that's where the site's copy panels live (matches the existing scrim + `--margin` layout and focal 0.60–0.70 crops). Planets always in the right two-thirds. Main subjects inside the central 60% for mobile crops. Same single distant cold key light from upper-left in all five.

### Scroll mapping (site beats → frames)

| Beat | Leg / frames | Scroll behaviour |
|---|---|---|
| 0 Hero | K0 held | pinned 100vh |
| 1 Departure (manifesto) | Leg 1, 0→55% | scrub |
| 2 World 01 Enterprise | Leg 1, 55→100% | scrub, then **hold plateau on K1** while panel reads |
| 3 World 02 Consulting | Leg 2, 0→100% | scrub + hold on K2 |
| 4 World 03 AI Factory | Leg 3, 0→100% | scrub + hold on K3 |
| 5 World 04 Team | Leg 4, 0→62% | scrub + hold |
| 6 Arrival | Leg 4, 62→100% | settle on K4 vista/ring, logo forms |

Engine v2 enforces constant *frames-per-scroll-unit* inside legs, eases into holds, and cross-blends adjacent frames — see §7.

---

## 2. The world, redesigned (what replaces the kitsch)

- **The spine** is no longer a light beam. It is a **helical stellar stream**: millions of pinpoint stars braided into a soft ribbon that coils around the vertical axis — a galactic structure, engineered-looking but natural, platinum-white with cold blue edges. (This also makes the CI cover's concentric arcs read as the helix seen from above — the brand mark IS the journey map.)
- **The black hole** is the ZeroPoint aperture at cosmic scale: a pitch-black sphere, razor-thin platinum-white photon ring, faint gravitational-lensing arcs (thin concentric circles — the CI cover's arcs), and a barely-visible hexagonal lattice etched on the dark limb near the rim. No orange accretion disk, no fire.
- **Four planets**, one per world, strung along the coil. All obey the same physics and light; each has ONE distinguishing trait:
  - **P1 · Enterprise — "Bastion":** dark basalt super-earth, massive and still; faint hexagonal facet lines barely visible on its night side (engineered, sovereign). Hardest shadow of the four.
  - **P2 · Consulting & Media — "Signal":** pale grey-blue body with smooth, sweeping high-altitude cloud bands catching the key light — clean, legible, calm (clarity before code).
  - **P3 · AI Factory — "Forge":** dark rocky body with a fine network of glowing white-blue fissures across its surface — restrained, like light through cracks, not lava. Surrounded by a working belt of debris rock.
  - **P4 · Team — "Haven":** smallest, pale ice-and-rock body with a soft atmospheric halo — the warmest-feeling frame of the journey while staying inside the navy palette.
- **Deep-space set dressing only:** irregular, cratered basalt asteroids (sharp, photoreal, varied sizes), thin cold dust veils, faint far galaxies. **Nothing manufactured, nothing geometric, nothing glossy.**

### The style block (append to EVERY video prompt, replaces old look-bible tail)

Diffusion models attend to nouns and often ignore negation — a "STRICTLY NO: crates, neon…" list *inside the main prompt* plants the very words that produced last take's crates and neon. So v2 splits the old ban block in two: an all-**positive** style block that lives in the main prompt, and a **negative list** that goes ONLY into a dedicated negative-prompt field where the tool has one.

**Positive style block (main prompt, all models):**

> Ultra-realistic cinematic deep-space photography, IMAX documentary style. Space is very dark navy, almost black, never pure black. One single distant cold key light from upper left; thin cold blue rim light on edges only. Restrained monochrome navy palette — the only colours in frame are deep navy, platinum white and cold pale blue. Deep shadows, high contrast, subtle fine film grain. Buttery smooth, slow, weightless, constant camera motion; one continuous shot, no cuts. Every solid object in frame is natural: irregular, cratered, matte basalt rock or a round planet. All light comes from stars, the stellar stream and rim light — nothing artificial anywhere in frame.

**Negative list (ONLY for tools with a dedicated negative field — Kling web UI, Wan `negativePrompt`, Midjourney `--no`; Seedance via MCP has none, so there you rely on the positive block + both-ends-pinned keyframes):**

```
cubes, boxes, crates, metal, debris, windows, machinery, spaceship, building, city lights,
low-poly, polyhedron, dice, crystal, neon, teal, cyan, purple, orange, lava, lightning,
energy ribbon, beam, lens flare, text, watermark, logo, floor, ground, fog bank, cartoon,
oversaturated
```

(Positive block ≈ 680 chars — fits inside Kling's 2,500 budget with ~1,800 chars of room for the shot description; Seedance's 10,000 budget takes it trivially.)

---

## 3. Keyframe contract (how the seams become invisible)

Five master stills, K0–K4. **Every leg is pinned at BOTH ends:**

| Clip (generated as ascent) | Start image | End image | Played on site as |
|---|---|---|---|
| **V1** | K1 | **K0** | Beat 1–2: K0 → K1 |
| **V2** | K2 | **K1** | Beat 3: K1 → K2 |
| **V3** | K3 | **K2** | Beat 4: K2 → K3 |
| **V4** | K4 | **K3** | Beat 5–6: K3 → K4 |

- The old chain pinned only G5's ending — that's why the middle drifted. With both ends pinned to designed stills, **drift has nowhere to go**, and every clip can be generated **in parallel and re-rolled independently forever**. `video-pipeline/chain/K0.png … K4.png` become the immutable contract (never delete).
- A generated clip's *end frame* is the model's ~99% approximation of the supplied end image; its *start frame* is pixel-exact. Two mechanisms close the gap: **the pipeline substitutes the true keyframe PNG as each leg's playback first frame** (so every seam — and the hero itself — is pixel-exact on *both* sides), and the engine cross-blends adjacent frames at the seam, dissolving the one-frame step between the designed still and the rendered stream. The pipeline also diffs each take's ending against its target keyframe and warns if the model drifted.
- Save the stills as `chain/K0-hero.png`, `chain/K1-enterprise.png`, `chain/K2-consulting.png`, `chain/K3-factory.png`, `chain/K4-vista.png`.

**Image generation order matters (continuity by inheritance):** generate K0 first (from the CI cover as reference). Then generate K1 **with K0 attached as a reference image** plus the pull-back instruction; K2 with K1 attached; and so on. Each keyframe inherits the light, palette and geometry of the previous one — five stills, one world. Nano Banana Pro (`imagen-nano-banana-2`, 4K, 16:9) is the primary tool — same model that produced the locked Still A, best-in-account for reference-guided brand fidelity. Magnific's `images_expand` (outpaint) and `images_change_camera` are legal assists for roughing a pull-back before a quality pass.

---

## 4. IMAGE PROMPTS — the five master keyframes

Primary = Nano Banana Pro (natural language, honours composition; set 16:9, 4K).
Variants = Midjourney v6/v7 and Flux (comma style). Negatives for tools with a negative field:

```
NEGATIVE: cubes, boxes, crates, metal debris, windows, machinery, spaceship, building, low-poly,
polyhedron, dice, crystal, neon, teal, cyan, purple, orange, lightning, energy ribbon, lens flare,
text, watermark, logo, floor, ground, fog bank, cartoon, oversaturated, centred poster composition
```

---

### K0 — HERO: "The Aperture" (the landing image — the crown jewel)

*Website: hero, pinned. Text-safe: entire left third. Focal 0.68. Mobile 9:16: crop keeps the lit rim + lensing arcs; sphere may bleed right.*

**Nano Banana Pro** (attach `CI/Landing.png` — or the Freepik HD hero — as image reference; instruction: "restage this exact object in deep space"):

> Ultra-photorealistic IMAX deep-space photograph, 16:9, extreme wide cinematic composition. Restage the referenced object — a colossal pitch-black sphere with a faint hexagonal lattice etched into its dark surface and a blazing platinum-white crescent rim light on its left edge — as a black hole at cosmic scale, floating in deep space. REMOVE the floor, the ground reflection and the studio fog entirely: pure deep peacoat-navy space (#192231), never pure black. The sphere occupies the right two-thirds of the frame, its dark limb dissolving into the darkness at frame right. Around it, thin concentric arcs of light — gravitational lensing — echo outward to the left exactly like the reference, but ultra-faint, dissolving to nothing well before the left edge of frame. NEW: far below the sphere, in the lower fifth of the frame near bottom-centre, a faint helical ribbon of millions of pinpoint stars — a stellar stream — coils away downward into immense depth, hinting at a vast spiral formation below; it is dim, distant, discreet, catching thin cold blue (#2B579A) edge light. A sparse field of faint stars and two or three barely-visible distant galaxies. One single distant cold key light from the upper left. Deep shadows, high contrast, restrained monochrome navy palette, subtle fine film grain, pristine optics, no lens flare. The left third of the frame is near-empty dark space, clean for typography. No text, no logo, no floor, no fog, no neon, no teal, no purple.

**Midjourney:**

> colossal black hole as pitch-black sphere, faint hexagonal lattice on dark limb, blazing platinum-white crescent rim light on left edge, thin concentric gravitational lensing arcs, deep peacoat navy space #192231, faint helical stellar stream of pinpoint stars coiling down into depth at lower left, sparse faint stars, single distant cold key light upper left, thin cold blue #2B579A rim accents, sphere in right two-thirds, left third empty dark negative space for typography, IMAX deep-space photography, photoreal, high contrast, deep shadows, fine film grain --ar 16:9 --style raw --s 100 --no floor, ground, fog, neon, teal, purple, orange, text, lens flare

**Flux (2 Pro/Max):** use the Nano Banana paragraph verbatim (Flux takes natural language; put the negative list in the negative field).

---

### K1 — "Bastion" (Enterprise Technology)

*One revolution down/out. Text-safe: left third. Focal 0.66. Mobile: planet limb + black hole both survive the centre-right crop.*

**Nano Banana Pro** (attach K0 as reference: "same world, same light, camera pulled back"):

> Same universe, palette and light as the reference image — one continuous world. Ultra-photorealistic IMAX deep-space photograph, 16:9. The camera has descended one full revolution around a vast helical stellar stream — a braided ribbon of millions of pinpoint platinum-white stars coiling around an invisible vertical axis — and pulled far back. FOREGROUND lower-right: the crescent-lit limb of a colossal dark basalt planet, filling about 40% of frame height — matte charcoal rock, sharp terminator, faint almost-subliminal hexagonal facet lines on its night side, thin cold blue rim light. UPPER CENTRE-RIGHT midground: the black hole from the reference, now distant — a pitch-black disc wrapped in its blazing white crescent and thin lensing arcs, about 20% of frame height, crowning the top of the stellar stream. The helical stream connects them through the right two-thirds of the frame, curving with visible depth. A few irregular cratered basalt asteroids drift in the midground, crescent-lit. Deep peacoat-navy space, sparse faint stars, one single distant cold key light from upper left, deep shadows, high contrast, subtle film grain. Left third near-empty for typography. No structures, no metal, no geometry, no neon, no teal, no text.

**Midjourney:**

> crescent-lit colossal dark basalt planet lower right 40% of frame, faint hexagonal facet lines on night side, thin cold blue rim light, distant black hole with blazing white crescent and thin lensing arcs upper centre-right, vast helical stellar stream of pinpoint stars connecting them through the right two-thirds, irregular cratered basalt asteroids midground, deep peacoat navy space #192231, single cold key light upper left, left third empty for typography, IMAX deep-space photography, photoreal, deep shadows, high contrast, fine film grain --ar 16:9 --style raw --s 100 --no cubes, boxes, metal, structures, low-poly, neon, teal, purple, text, floor

---

### K2 — "Signal" (Consulting & Media)

*Two revolutions. Text-safe: left third. Focal 0.62.*

**Nano Banana Pro** (attach K1: "same world, camera pulled back one more revolution"):

> Same universe, palette and light as the reference image. Ultra-photorealistic IMAX deep-space photograph, 16:9. The camera has descended another full revolution around the helical stellar stream and pulled further back — the coil's first S-curve is now visible. FOREGROUND right: a pale grey-blue planet, about 35% of frame height, smooth and calm, with elegant sweeping high-altitude cloud bands catching the cold key light — clean and legible, crescent-lit, thin cold blue rim. ABOVE it, strung along the glowing coil in perfect depth order: the dark basalt planet from the reference, now small; and higher still the black hole, now only about 9% of frame height, its white crescent still the brightest point in frame. The stellar stream coils through the composition with two visible turns. Sparse irregular basalt asteroids, thin cold dust veil catching the light near the stream. Deep peacoat-navy space, single distant cold key light upper left, deep shadows, restrained monochrome navy, fine film grain. Left third near-empty for typography. No structures, no neon, no teal, no text.

**Midjourney:**

> pale grey-blue planet with sweeping smooth cloud bands foreground right 35% of frame, crescent-lit, thin cold blue rim light, helical stellar stream of pinpoint stars with two visible coils rising behind, small dark basalt planet strung on the coil above, tiny distant black hole with white crescent at top, thin cold dust veils, irregular basalt asteroids, deep peacoat navy space #192231, single cold key light upper left, left third empty for typography, IMAX deep-space photography, photoreal, deep shadows, fine film grain --ar 16:9 --style raw --s 100 --no cubes, metal, structures, low-poly, neon, teal, purple, text

---

### K3 — "Forge" (AI Factory)

*Three revolutions. Text-safe: left third. Focal 0.64.*

**Nano Banana Pro** (attach K2):

> Same universe, palette and light as the reference image. Ultra-photorealistic IMAX deep-space photograph, 16:9. Another full revolution down the helical stellar stream, further back again. FOREGROUND lower-right: a dark rocky planet, about 35% of frame height, its night side crossed by a fine restrained network of glowing white-blue fissures — light escaping through cracks in stone, subtle, geological, never lava, never neon. Around and below it, a working belt of irregular cratered basalt asteroids arcs through the midground, crescent-lit, sharp and photoreal. The stellar stream now shows three coiled turns rising away; strung along it in depth order: the pale cloud-banded planet, tiny; the dark basalt planet, tinier; and at the very top the black hole, a distant brilliant-rimmed point about 3–4% of frame height. Immense sense of vertical distance travelled. Deep peacoat-navy space, single distant cold key light upper left, deep shadows, restrained monochrome navy palette, fine film grain. Left third near-empty for typography. No machinery, no structures, no neon, no teal, no text.

**Midjourney:**

> dark rocky planet with fine glowing white-blue fissure network on night side foreground lower right, belt of irregular cratered basalt asteroids arcing through midground, helical stellar stream of pinpoint stars with three visible coils rising into depth, two small planets strung along the coil above, distant black hole with brilliant white rim as tiny crown at top, deep peacoat navy space #192231, single cold key light upper left, thin cold blue rim lights, left third empty for typography, IMAX deep-space photography, photoreal, deep shadows, fine film grain --ar 16:9 --style raw --s 100 --no lava, orange, machinery, cubes, metal, low-poly, neon, teal, text

---

### K4 — "Haven" + THE VISTA (Team → Arrival)

*Four revolutions — the reveal. This is also the closing wallpaper behind the logo/contact beat. Text-safe: left third AND lower-centre (arrival panel is centred). Focal 0.55.*

**Nano Banana Pro** (attach K3, plus optionally `still-b-arrival.png` for the base ring):

> Same universe, palette and light as the reference image — the grand finale reveal. Ultra-photorealistic IMAX deep-space photograph, 16:9, vast macro scale. The camera has completed its fourth revolution and now floats far outside the entire formation, seeing it whole for the first time. CENTRE-RIGHT of frame, spanning nearly full height: the complete helical stellar stream — a luminous braided coil of millions of pinpoint stars making four graceful turns around an invisible vertical axis. Strung along it from top to bottom, in perfect diminishing depth order: the black hole at the summit, a tiny brilliant white-rimmed point; the dark basalt planet; the pale cloud-banded planet; the fissured dark planet; and NEAREST, right of centre at about 25% of frame height, a small pale ice-and-rock planet with a soft thin atmospheric halo, gently crescent-lit — quiet and humane. At the base of the coil, at centre-right and comfortably above the lower edge of frame, a thin perfect ring of white starlight floats in the dark — the origin point. Sparse irregular basalt asteroids and faint cold dust. Deep peacoat-navy space, single distant cold key light upper left, deep shadows, restrained monochrome navy, fine film grain. Left third and the lower quarter of the frame kept near-empty and dark for typography. No structures, no neon, no teal, no text, no logo.

**Midjourney:**

> vast cosmic vista, complete luminous helical stellar stream of pinpoint stars with four coiled turns spanning frame height centre-right, four planets strung along the coil in diminishing depth order, tiny brilliant-rimmed black hole crowning the summit, small pale ice planet with soft atmospheric halo nearest at lower right, thin perfect ring of white starlight floating at the coil's base centre-right above the lower frame edge, deep peacoat navy space #192231, single cold key light upper left, sparse basalt asteroids, faint cold dust, left third empty for typography, IMAX deep-space photography, photoreal, deep shadows, fine film grain --ar 16:9 --style raw --s 100 --no structures, metal, cubes, neon, teal, purple, text, logo

---

## 5. VIDEO PROMPTS — the four legs

All legs are **generated as ascents** (start = lower keyframe, end = upper keyframe) and reversed by the pipeline. All four use the **same orbit direction**: *"the camera circles the spine always in the same direction — background stars parallax steadily from screen-left to screen-right"* — keep that sentence identical in every leg or the reversal breaks direction continuity.

### Settings checklist (every leg, every model)

| Setting | Value |
|---|---|
| Start frame | lower keyframe PNG (see table §3) |
| End frame | upper keyframe PNG |
| Duration | **10s** (sweet spot — 15s invites drift; 10s @24fps = 240 raw frames, plenty for 120 scrub frames). Veo 3.1 caps at 8s — see per-model notes |
| Aspect / res | 16:9 · 1080p (4K only for a final keeper pass) |
| Audio | OFF |
| Negative field | paste the §2 negative list into the tool's dedicated negative-prompt field (Kling web UI has one); Seedance via MCP has none — omit it there, never inline it |
| Seedance `cameraMotion` | `orbitLeft` (the spiral+dolly lives in the prompt text). Direction untested: burn one cheap 5s/480p probe first — if the parallax reads opposite to the prompt sentence, switch to `orbitRight` |
| Cost discipline | `simulate_cost` before every MCP spend (LEARNINGS.md rule). Simulate Seedance 10s/1080p AND Nano Banana Pro 4K once before committing to the batch and record the per-take numbers in the generation log |

### Leg prompt bodies

Each body below + the **positive style block from §2** = the full main prompt (the §2 negative list goes into the tool's negative field where one exists). Bodies are ~1,000–1,300 chars, so Kling total stays under 2,500. For Seedance paste both as-is (10k budget). For Runway (1,000-char cap) use the condensed line at the end of each leg.

---

**V1 — Bastion → The Aperture** *(start K1-enterprise.png · end K0-hero.png · site: hero → Enterprise)*

> One continuous 10-second cinematic shot in deep space. The camera flies a slow, wide, ascending spiral — one full 360-degree revolution around a vast helical stellar stream, a braided ribbon of millions of pinpoint platinum-white stars coiling around an invisible vertical axis. The camera circles the spine always in the same direction — background stars parallax steadily from screen-left to screen-right. It begins beside the crescent-lit limb of a colossal dark basalt planet in the lower right, faint etched surface lines barely visible on its night side, and rises past it; the planet slides out of frame below as the camera climbs and closes in on the summit. Ahead and above, a colossal pitch-black sphere — a black hole wrapped in a blazing platinum-white crescent rim and thin concentric gravitational-lensing arcs — grows steadily from a distant disc about a fifth of the frame tall until it fills the right two-thirds of the frame, its faintly etched dark surface barely visible near the lit rim. The helical stream sweeps past the camera in graceful arcs. A few irregular cratered basalt asteroids drift by in weightless parallax. Constant slow speed, zero shake, immense scale, pristine depth of field.

*Runway condensed (<1000 chars):* `Continuous 10s shot, deep space. Camera ascends a slow wide 360° spiral around a helical stream of pinpoint stars, backward-parallax screen-left-to-right, rising from the crescent-lit limb of a colossal dark basalt planet toward a black hole — pitch-black sphere, blazing platinum-white crescent rim, thin concentric lensing arcs — which grows until it fills the right two-thirds of frame. Irregular cratered basalt asteroids drift past, all rock matte, natural, photoreal. Very dark navy space, one cold key light upper left, thin cold blue rims only, palette strictly deep navy, platinum white and cold blue, photoreal IMAX, slow constant motion, one unbroken shot.`

---

**V2 — Signal → Bastion** *(start K2-consulting.png · end K1-enterprise.png · site: Enterprise → Consulting & Media)*

> One continuous 10-second cinematic shot in deep space. The camera flies a slow, wide, ascending spiral — one full 360-degree revolution around the vast helical stellar stream, a braided ribbon of millions of pinpoint platinum-white stars. The camera circles the spine always in the same direction — background stars parallax steadily from screen-left to screen-right. It begins beside a pale grey-blue planet with smooth sweeping cloud bands in the right foreground and rises past it; the cloud-banded planet slides below and out of frame as the camera climbs the coil. Ahead, the crescent-lit dark basalt planet grows steadily from a small point on the stream into a colossal foreground presence at lower right, faint etched surface lines barely visible on its night side. Far above it, the black hole's brilliant white-rimmed disc hangs at the summit of the stream, slowly growing. Thin cold dust veils catch the light near the coil; irregular cratered basalt asteroids pass in weightless parallax. Constant slow speed, zero shake, immense vertical scale, pristine depth of field.

*Runway condensed:* `Continuous 10s shot, deep space. Camera ascends a slow 360° spiral around a helical stream of pinpoint stars, parallax screen-left-to-right, rising from a pale cloud-banded grey-blue planet toward a colossal crescent-lit dark basalt planet that grows to fill the lower right, distant white-rimmed black hole above at the stream's summit. Cold dust veils, irregular cratered basalt asteroids, all rock matte and natural. Very dark navy space, one cold key light, thin cold blue rims, palette strictly deep navy, platinum white and cold blue, photoreal IMAX, slow constant motion, one unbroken shot.`

---

**V3 — Forge → Signal** *(start K3-factory.png · end K2-consulting.png · site: Consulting & Media → AI Factory)*

> One continuous 10-second cinematic shot in deep space. The camera flies a slow, wide, ascending spiral — one full 360-degree revolution around the vast helical stellar stream of pinpoint platinum-white stars. The camera circles the spine always in the same direction — background stars parallax steadily from screen-left to screen-right. It begins beside a dark rocky planet in the lower right whose night side is crossed by a fine restrained network of fissures carrying cool white-blue light through cracks in dark stone, and rises away from it; the fissured planet slides below and out of frame as the camera climbs through a belt of irregular cratered basalt asteroids that drift past the lens in layered weightless parallax, crescent-lit and photoreal. As the camera climbs, the pale grey-blue planet with smooth sweeping cloud bands grows steadily ahead on the coil until it stands calm and colossal in the right foreground, and above it the small dark basalt planet and the distant brilliant-rimmed black hole align along the rising stream. Thin cold dust catches the key light. Constant slow speed, zero shake, immense depth, pristine optics.

*Runway condensed:* `Continuous 10s shot, deep space. Camera ascends a slow 360° spiral around a helical stream of pinpoint stars, parallax screen-left-to-right, rising from a dark planet veined with fine fissures of cool white-blue light, up through a belt of irregular cratered basalt asteroids, toward a calm pale grey-blue planet with smooth cloud bands that grows to fill the right foreground; black hole a distant bright-rimmed point above. All rock matte, natural, cratered. Very dark navy space, one cold key light, thin cold blue rims, palette strictly deep navy, platinum white and cold blue, photoreal IMAX, slow constant motion, one unbroken shot.`

---

**V4 — The Vista → Forge** *(start K4-vista.png · end K3-factory.png · site: AI Factory → Team → Arrival)*

> One continuous 10-second cinematic shot in deep space. The camera begins far outside the entire cosmic formation: the complete helical stellar stream — four luminous coiled turns of braided pinpoint stars around an invisible vertical axis — with four planets strung along it in diminishing order, a tiny brilliant-rimmed black hole crowning the summit, and a thin perfect ring of white starlight floating at its base. From this vast vista the camera flies forward and upward into the formation, a slow ascending spiral — one full 360-degree revolution. The camera circles the spine always in the same direction — background stars parallax steadily from screen-left to screen-right. It passes close by a small pale ice-and-rock planet with a soft atmospheric halo, gently crescent-lit, which slides below and out of frame; the coil sweeps past in graceful arcs as the dark fissure-veined planet ahead grows steadily into the lower-right foreground, its glowing white-blue crack network resolving, with the asteroid belt arriving around it. The black hole's white rim stays the brightest point, high above. Constant slow speed, zero shake, cathedral scale, pristine depth of field.

*Runway condensed:* `Continuous 10s shot, deep space. From a vast vista of a complete four-coil helical stream of pinpoint stars — four planets strung along it, tiny bright-rimmed black hole at the summit, thin ring of white starlight at the base — the camera flies forward and up in a slow 360° spiral, parallax screen-left-to-right, past a small pale ice planet with a soft halo, toward a dark planet veined with fine fissures of cool white-blue light growing in the lower right, cratered asteroid belt around it, all rock matte and natural. Very dark navy space, one cold key light, palette strictly deep navy, platinum white and cold blue, photoreal IMAX, slow constant motion, one unbroken shot.`

---

### Per-model notes

- **Seedance 2.0 Pro (`bytedance-seedance-pro-2.0`) — PRIMARY.** Start+end keyframes + `cameraMotion: orbitLeft` + full prompt (body + positive style block; no negative field exists — don't inline the negative list). 10s, 16:9, 1080p. Its camera presets are the single biggest lever against clunky motion. Verify the preset's direction once with a cheap 5s/480p probe before the batch.
- **Kling 3.0 (`kling-30`) — B-take.** Same start/end frames, body + positive style block in the main prompt (verify ≤2,500 chars), §2 negative list into the web UI's negative-prompt field, 10s, 1080p, audio OFF. Known-good interpolator; use when Seedance's take has better motion but worse texture, or vice-versa — pick per-leg winners.
- **Veo 3.1 (`google-veo3_1`) — hero option for V1 only.** 8s cap: change the body's opening to "One continuous 8-second cinematic shot" (8s @24fps = 192 raw frames, still comfortably above the 120 scrub frames). Supports start+end + up to 3 reference images at 1080p/4K. If V1 is the one leg worth a premium re-roll, this is it.
- **Luma Dream Machine / Ray 2 (web UI).** Supports start & end keyframes: paste the leg body, set both frames, 10s, "no audio". Good third opinion.
- **Runway Gen-4/4.5 — look exploration only.** No end-frame conditioning (chain-breaking) and 720p in the connector; use the condensed lines to explore texture/mood, never for keeper legs.
- **Judging a take** (unchanged from WORKFLOW.md, plus): reject on sight of ANY box/crate/window/polyhedron/teal/neon; the stream must read as stars, not a beam; planets must be round, cratered or cloud-banded — never faceted; play it backwards mentally — that's what visitors see.

---

## 6. Generation workflow (do in this order)

1. **K0** from CI cover reference → approve look (this is the brand call — everything inherits from it; it also amends the locked "no spine below the hero" decision, so get explicit sign-off here).
2. **K1 → K4** sequentially, each with the previous keyframe attached as reference. Approve each before the next.
3. Optional but recommended: Magnific **ultra-photo 2× upscale** on all five keepers (same treatment Still A got).
4. Save to `video-pipeline/chain/` with the K-names in §3. Never delete. Also export two **text-free poster crops** — from K0 (hero/legs 1–3 fallback) and K4 (leg 4 fallback) — as `assets/img/poster-k0.png` / `poster-k4.png`; these serve reduced-motion visitors and the loading backstop, and the `HELIX_V2` config already points at them.
5. Generate **V1–V4 in any order** — both ends are pinned, so there is no serial dependency and any leg can be re-rolled independently forever. (Via the Magnific MCP, still fire ONE call at a time — parallel calls killed the connection once, LEARNINGS.md quirk. Web UI: freely parallel.) Log keeper prompts + dates below.
6. Drop keepers as `video-pipeline/in/v1.mp4 … v4.mp4` → run `python3 video-pipeline/process_python.py v1 v2 v3 v4` (no args defaults to the same four; pass `g1 g2 g3` to rebuild the legacy take). The script substitutes each leg's true keyframe as its playback first frame, diffs each ending against its target keyframe and warns on drift — reject drifted takes.
7. Flip the engine config: in `assets/js/site.js`, set `const ACTIVE = HELIX_V2;` (one line, see §7).
8. Preview: `python3 -m http.server` → scroll the whole journey; check each seam and each hold.

### Generation log (keepers only)

| Asset | Model | Date | Prompt hash / notes |
|---|---|---|---|
| | | | |

---

## 7. Engine v2 (what changed in the code)

`assets/js/site.js` was rewritten (v2.1, hardened by a six-reviewer adversarial pass). Same no-build static architecture, same beats/HTML/CSS. New:

- **One global frame timeline** — segments concatenate into a single frame axis, with **hold plateaus** at every world (`holdTail`).
- **Midline beat progress** — progress runs 0→1 over each section's transit of the viewport midline, the same line the active beat switches on, so scroll→frame velocity is *continuous at every boundary* for any section height (kills the frame-lurch class of bug). In-leg velocity is constant per section; for perfectly uniform velocity across a whole leg, keep the sections that share a leg at similar heights when tuning `site.css` min-heights (e.g. leg 1 spans #departure + #w-enterprise).
- **Sub-frame rendering** — fractional frame position, true-neighbour frames cross-blended each paint → no stepping; seams dissolve over the blend and are pixel-exact anyway thanks to the pipeline's keyframe substitution.
- **Inertial smoothing** — critically-damped chase of the target frame (`1 − e^(−dt·rate)`); wheel kicks land like camera weight. Reduced-motion path unchanged (posters, no scrub).
- **Decode before paint** — frames resolve only after `img.decode()` completes (no synchronous WebP decode inside `drawImage` mid-scrub), plus decode re-warming across the hot window.
- **Priority loader** — manifest-driven counts (`manifest.json`, `no-cache`), stride ladder (16→8→4→2→1) **interleaved across segments** so the whole journey gets coarse coverage before anything refines; 2 of 6 pool slots reserved for the hot window around the playhead so flicks are never starved; generation-scoped in-flight tracking; HEAD-probe fallback when a manifest is missing.
- **Focal ranges** — per-segment `[startK, endK]` focal interpolated through the leg and across seams (K3's 0.64 ≠ K4's 0.55 is now honoured); mobile breakpoint crossing safely re-resolves the frame set (stale-generation writes discarded, poster shown while rebuilding).
- **Resize discipline** — mobile URL-bar height jitter no longer blanks the canvas; backing store capped at source resolution (1920/1280) instead of raw DPR.
- **Resilient boot** — the veil drops before the fallible GSAP/Lenis inits (guarded for missing ScrollTrigger), so a CDN hiccup degrades gracefully instead of stranding the visitor on the spinner.
- Config switch at the top of the file: `LEGACY` (current g1–g3 footage, live today) vs `HELIX_V2` (v1–v4). One line to flip.

`video-pipeline/process_python.py` now: accepts `v1…v4` (new mapping) and legacy `g1…g3` (no args = v1–v4); extracts and validates **before** touching live frames (a corrupt MP4 can't leave a segment frameless); substitutes each leg's designed keyframe as its playback first frame (pixel-exact seams + hero); diffs each take's ending against its target keyframe and warns on drift; writes `manifest.json` with *actual* emitted counts; per-clip failure isolation with a non-zero exit code; keeps the always-reverse rule.

---

## 8. What stays true (unchanged commitments)

- CI palette, type, layout, copy — PLAN.md v1.1 word-for-word.
- The reverse-ascent generation trick.
- 120/60 WebP frames per clip at 1920w/1280w, q68/q62.
- Poster fallbacks, reduced-motion stills, `send-email.php`, xneelo deploy.
- Beat structure in `index.html` — no HTML changes required.
