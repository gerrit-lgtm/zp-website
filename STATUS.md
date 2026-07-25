# STATUS — where we are, what's next
*Updated 25 Jul 2026. Read PLAN.md for the locked spec, LEARNINGS.md for context, **prompts/HELIX-V2.md for the current generation spec** (WORKFLOW.md + 3clip-prompts.md are superseded).*

## ⚠️ Real-time branch open: `immersive-3d` (25 Jul)

`lab.html` is a **working Three.js prototype** that replaces the frame-scrub stage
with one persistent, interactive Sovereign Core. It does not touch `index.html`
— both run side by side for A/B. Phase 1 of the immersion rebuild is **done and
verified in-browser**; Phases 2–4 are not started.

- `lab.html` · `assets/js/zp-core.js` (scene) · `assets/js/zp-ui.js` (DOM) · `assets/css/lab.css`
- `worlds.html` · `assets/js/zp-worlds.js` · `assets/css/worlds.css` (25 Jul) — **Gerrit's
  "The Core" scene ported in**: Canvas-2D descent from the black-hole core down a braided
  helix past four worlds (= the four business worlds), the origin ring resolves into
  `mark.svg`, finale reveals the whole formation + contact. 8×100vh beats; no build step,
  no CDN deps. Three pages now run side by side: index (film) / lab (Three.js core) /
  worlds (canvas galaxy).
- Three.js via ESM importmap — **no build step**, same static upload as today.
- 460KB total transfer vs **78MB** of WebP frames. 120fps under software rendering.
- Occlusion is real: two canvases sandwich the DOM (bg z0 · copy z10 · fg z20)
  driven by ONE shared camera, so the departure ring passes in front of the H1.
- Frames in `assets/frames/` are untouched and still power `index.html`.

**Decision needed before Phase 2:** HELIX-V2's exponential pullback (R₄/R₀ ≈ 40,
subject ending at ~1.5% of frame) and "one persistent protagonist" are mutually
exclusive. The prototype resolves it in favour of the protagonist — orbit,
descent and the composition bias survive; the 40× pullback does not. Confirm or
overrule before any more footage is generated.

## HELIX v2 (24 Jul, evening) — the redo

The g1–g3 take was judged clunky and off-bible (metal crates, low-poly dice rocks, neon teal — full diagnosis in HELIX-V2.md §0). Redesign shipped:

- **prompts/HELIX-V2.md** — camera math, 5 designed keyframes K0–K4 (both ends of every leg pinned → no drift, legs generate in parallel), full image-prompt suite (Nano Banana Pro / Midjourney / Flux) + video-prompt suite (Seedance 2.0 Pro primary, Kling 3.0 B-take, Veo 3.1 hero option, Runway = exploration only).
- **assets/js/site.js v2** — sub-frame cross-blended rendering, inertial smoothing, global timeline with hold plateaus, priority loader, focal fix. Runs the existing g-footage today (`ACTIVE = LEGACY`); flip to `HELIX_V2` when v1–v4 frames land.
- **video-pipeline/process_python.py** — handles v1–v4 + legacy g-clips, writes manifest.json + true chain anchors.

Next: generate K0 from the CI cover (HELIX-V2.md §4), then K1–K4 by reference-chaining, then V1–V4.

## Done

- [x] CI digested (43 pages) → rules in LEARNINGS.md
- [x] Lion Cage engine studied → reuse + upgrades defined
- [x] Plan locked v1.1 — HELIX: reversed descent around a starlight spine, black hole (Gerrit's cover at cosmic scale) at top, 4 worlds (Enterprise / Consulting & Media / AI Factory / Team), ring + logo + CTA at base
- [x] Prompt pack g1–g5 + stills + look bible + workflow written and verified ≤2500 chars
- [x] Pipeline `video-pipeline/process.sh` ready (all clips auto-reversed, chain frames extracted)
- [x] Magnific MCP connected and battle-tested
- [x] **STILL A LOCKED** — Gerrit's uploaded cover image, Magnific ultra-photo 2× HD upscale (24 Jul). Lives in Freepik library (enhance result). This is the hero frame AND G5's end image.
- [x] **PHASE 4 SITE BUILT (24 Jul)** — full static site shipped: `index.html`, `assets/css/site.css`, `assets/js/site.js` (canvas scrub engine), `send-email.php`, logo mark + posters. All 7 beats, chrome (logo/Talk-to-us/dots/progress), CI palette+type, contact form, reduced-motion + mobile crops. **Runs NOW on poster fallbacks** (aperture stills cropped text-free); auto-swaps to real WebP frames the moment `process.sh gN` writes `assets/frames/<segment>/` — zero code change. Preview: `python3 -m http.server` in this folder → open `index.html` (canvas/JS needs http/local host, not file://).

## Open decisions

- [ ] **v2 sign-off (PLAN.md change log, 24 Jul eve)** — five amended decisions, incl. the hero regenerated in deep space with a faint helix hint below (amends the "no spine below hero" rule). Nothing generates before this.
- [ ] **Costs** — `simulate_cost` Seedance 2.0 Pro 10s/1080p + Nano Banana Pro 4K once, record per-take numbers in HELIX-V2.md's generation log, then decide MCP vs web UI per asset.
- [ ] Team beat content — founder names/photos/roles for World 04.
- [ ] Copy sign-off — draft v1 in PLAN.md, Gerrit edits.

## Next actions (in order) — HELIX v2 path (prompts/HELIX-V2.md)

Site shell is DONE and runs the old g-take today. Remaining work = v2 footage + content:

1. Gerrit signs off the v2 amendments (PLAN.md change log).
2. Generate **K0** from the CI cover reference (HELIX-V2.md §4) → approve the look.
3. Generate **K1→K4** sequentially, each with the previous keyframe as reference → save to `video-pipeline/chain/` as `K0-hero.png … K4-vista.png` (never delete) + export `assets/img/poster-k0.png` / `poster-k4.png` crops.
4. Generate **V1–V4** (any order; one MCP call at a time) per HELIX-V2.md §5 — Seedance 2.0 Pro primary, start+end keyframes pinned.
5. Drop keepers as `video-pipeline/in/v1.mp4…v4.mp4` → `python3 video-pipeline/process_python.py` (validates, reverses, substitutes keyframes, warns on seam drift, writes manifests).
6. Flip `const ACTIVE = HELIX_V2;` in `assets/js/site.js` → preview via `python3 -m http.server`.
7. Content sign-off: Team names/photos/roles (World 04) + copy edits + confirm `send-email.php` inbox (`hello@zeropoint.africa`).

(Legacy g-take can still be rebuilt with `python3 video-pipeline/process_python.py g1 g2 g3`; `process.sh` is retired.)

## Folder map

```
ZP Website/
├── PLAN.md          locked spec + decisions + change log (v2 entry 24 Jul eve)
├── LEARNINGS.md     all findings: Lion Cage, CI rules, Magnific ops
├── STATUS.md        this file
├── CI/              brand assets + ZEROPOINT CI.pdf
├── prompts/         HELIX-V2.md (CURRENT master spec) · LOOK-BIBLE · retired: WORKFLOW, 3clip-prompts, g1–g5, 01–05
├── assets/          css · js/site.js (engine v2.1, ACTIVE config switch) · frames/ · img/ · logo/
└── video-pipeline/  process_python.py (CURRENT) · in/ (drop MP4s) · chain/ (K0–K4 + anchors — never delete)
```
