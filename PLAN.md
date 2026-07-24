# ZeroPoint Immersive Website — Locked Plan v1.1 (Helix)
*v1.1: restructured to Gerrit's helix sketch, 23 July 2026. Change only by agreement; log at bottom.*

## Concept

One unbroken reversed camera move down a cosmic helix.

A vast vertical **pillar of starlight** (the galactic spine) runs through the scene. At its summit sits the **black hole — the ZeroPoint aperture itself at cosmic scale**: five colossal dark blades spiraling into a black core, edges traced in thin cold blue light (the CI cover, monumental). Four worlds are staged down the spiral. At the base: a thin **ring of light** — the origin point where the logo forms.

The visitor opens on the black hole, overwhelming and beautiful. Scrolling pulls the camera *backwards* down the helix — always looking back up at what it's leaving, the black hole still hanging above as you round the spine — past Enterprise Technology, Consulting & Media, the AI Factory, and the Team, until the descent settles on the ring at the base: logo, CTA, contact. The journey ends at the point where value begins.

**The trick (Gerrit's):** the footage is generated as an *ascent* — bottom to summit, which AI video handles beautifully (destination grows ahead) — and the site plays every clip in reverse.

## Decisions log

| Decision | Choice |
|---|---|
| Structure | Single helix around a central starlight spine (napkin sketch, 23 Jul) |
| Black hole | The CI-cover aperture vortex at cosmic scale — brand mark as megastructure |
| Worlds | 4 stops: Enterprise Tech · Consulting & Media · AI Factory · Team |
| Ending | Ring of light at the spine's base → SVG logo + CTA + contact |
| Camera | Travels backwards on descent (generated ascending, played reversed — ALL clips) |
| Segment joins | Chained start/end frames (Kling 3.0 supports both) — pixel-continuous |
| Copy | Claude drafts in CI voice, Gerrit edits |
| Generator | Kling 3.0, 15s, 1080p, 16:9, audio OFF. Via Magnific MCP (consumes credits — unlimited does NOT apply to MCP) or web UI (unlimited, free) |
| Stills | Nano Banana Pro 4K, CI cover as image reference for Still A |
| Mobile | Crop from 16:9 with per-scene focal point |
| Chrome | Minimal: logo, Talk-to-us, beat dots, progress bar |

## Site beats (playback order, ~830vh total)

| # | Beat | Frames from | Scroll | Copy |
|---|---|---|---|---|
| 0 | Hero — the black hole | G5 final frame held | pinned 100vh | "Sovereign AI. Real business value." |
| 1 | Departure — falling backwards, black hole recedes | G5 reversed | 120vh | Manifesto lines |
| 2 | World 01 — Enterprise Technology | G4 reversed | 110vh | headline + 3 chips + CTA |
| 3 | World 02 — Consulting & Media | G3 reversed | 110vh | headline + 3 chips + CTA |
| 4 | World 03 — The AI Factory | G2 reversed | 110vh | headline + 3 chips + CTA |
| 5 | World 04 — The Team | G1 reversed (upper part) | 100vh | founders/team grid |
| 6 | Arrival — the ring, logo forms | G1 reversed (final) | 180vh | "A single point. Infinite potential." + contact |

Each world gets a scrub *hold* (frame plateau) while its panel is readable.

## Generation chain (ascent order — this is the order Gerrit generates)

| Clip | Leg (ascending) | Start image | End image | Frames dir (site) |
|---|---|---|---|---|
| **Still B** | Ring at the base, spine rising from it | — | — | anchors the bottom |
| **G1** | Lift off the ring, spiral up, pass **Team** world | **Still B** | free | `05-team-arrival` |
| **G2** | Continue helix past **AI Factory** (hex world) | g1-last.png | free | `04-world-ai-factory` |
| **G3** | Past **Consulting & Media** (flowing bands, thin rings) | g2-last.png | free | `03-world-consulting-media` |
| **G4** | Past **Enterprise** (geometric light lattice); black hole growing above | g3-last.png | free | `02-world-enterprise` |
| **G5** | Summit — aperture black hole fills frame, settle into hero | g4-last.png | **Still A** | `01-summit-departure` |
| **Still A** | Hero: aperture-vortex black hole, right two-thirds, spine falling away below | — | — | anchors the top |

Every clip: camera ascends a wide slow spiral around the pillar, facing up the axis; the black hole is visible above from G4 onward (so it stays in view during beats 1–2 of the descent, per the sketch). Clip endings land in soft moments (planet limb grazing frame / pillar glow sweeping past) so chained cuts vanish.

`video-pipeline/chain/` PNGs are **kept forever**. Regenerating a middle clip later: reuse its stored start PNG + its stored last PNG as end image — neighbours stay valid.

## Look bible (full text in prompts/LOOK-BIBLE.md)

Deep Peacoat navy space (#192231), never pure black. One distant cold key light; thin Dazzling Blue (#2B579A) rim light. Monochrome navy, deep shadows, high contrast, fine grain, slow weightless motion, no cuts. No neon, no purple/teal/orange, no lens flares, no text, no sci-fi kitsch. Subject in central 60% (Still A excepted). The pillar of starlight is soft blue-white, dense but restrained — engineered, not fantasy.

## Copy draft v1 (Gerrit edits)

- **Hero**: eyebrow THE POINT WHERE VALUE BEGINS · "Sovereign AI. Real business value." · sub: "Secure, sovereign and scalable — engineered to transform how business creates value." · CTAs: Begin the journey / Talk to us
- **Manifesto** (beat 1): "Everything begins from a point." → "A point becomes a decision." → "A decision becomes direction." → "Direction creates momentum." → "Momentum creates value."
- **World 01 Enterprise Technology**: "Sovereign infrastructure, engineered for impact." · chips: Sovereign by design / Secure foundations / Built to scale
- **World 02 Consulting & Media**: "Clarity before code." · chips: AI strategy & advisory / Executive enablement / Media & storytelling
- **World 03 The AI Factory**: "Build with us. Own what you build." · chips: Ship real products / Earn real equity / Grow with the factory
- **World 04 The Team**: "The people at zero point." · founders grid (names/photos/roles TBC by Gerrit)
- **Arrival**: "A single point. Infinite potential." · "Every journey ends where value begins." · Talk to an expert + contact form

## Technical architecture

Unchanged from v1.0: static HTML/CSS/JS, GSAP ScrollTrigger + Lenis, canvas frame-scrub engine with per-scene focal point, WebP frames (~120/clip desktop 1920w, ~60 mobile 1280w), progressive loading, reduced-motion fallback, `send-email.php` contact, xneelo deploy. `process.sh` now reverses **all five clips** and maps g1→05, g2→04, g3→03, g4→02, g5→01.

## Phases

1. **Stills** — Still A (with CI cover as reference) + Still B. Magnific MCP. ~300 credits per pair of candidates.
2. **Clips** — G1→G5 in ascent order (each needs the previous chain frame). 1,350 credits each via MCP, or free via web UI unlimited. Log exact prompts.
3. **Process** — `process.sh g1` … `g5` (or ask Claude).
4. **Build** — full site around real frames.
5. **Polish & deploy** — pacing, performance, xneelo.

## Change log

| Date | Change |
|---|---|
| 23 Jul 2026 | v1.0 locked. Kling 3.0 / 15s / start+end confirmed. |
| 23 Jul 2026 | v1.1 HELIX RESTRUCTURE per Gerrit's sketch: single spiral around central starlight spine; black hole = CI aperture at cosmic scale; camera travels backwards (all clips generated ascending, played reversed); added World 04 — The Team; generation chain now runs bottom→top from Still B to Still A. Prompt files renamed g1–g5 (old 01–05 files are stubs). |
| 24 Jul 2026 | STILL A LOCKED: Gerrit's own uploaded cover image, HD'd via Magnific ultra-photo 2× (no AI reinterpretation). Hero has NO spine below the black hole; G5 prompt updated (pillar fades out before summit). LEARNINGS.md + STATUS.md added — all findings live in the folder. |
| 24 Jul 2026 (eve) | **v2.0 HELIX REDO (prompts/HELIX-V2.md)** after the g1–g3 take was judged clunky/off-bible. Amends five locked decisions — **pending Gerrit sign-off before generation spend**: (1) generator: Kling 3.0 15s → **Seedance 2.0 Pro 10s primary**, Kling 3.0 B-take, Veo 3.1 hero option; (2) chain: 5 clips with free middle endings → **4 legs (V1–V4) pinned at BOTH ends** by designed keyframes K0–K4 (drift-proof, independently re-rollable); (3) hero: Still A restaged in true deep space (floor/fog removed) **with a faint helix hint below** — amends the "no spine below the hero" rule; Still A remains the visual reference; (4) Still B: bottom anchor → reference for K4's base ring; (5) ending: arrival now settles on the **K4 macro vista** (whole helix + ring + logo) rather than close on the ring alone. Worlds become four planets (Bastion/Signal/Forge/Haven); engine + pipeline rewritten (site.js v2.1, process_python.py v2). |
