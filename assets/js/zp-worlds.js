/* ZeroPoint — Worlds engine v1.0
   Gerrit's "The Core" scene, ported out of its React/DCLogic bundle into a
   plain script and rebranded to the ZeroPoint CI.

   The scene: one dark core (the zero point, a black hole) at the summit of a
   braided stellar stream; four procedurally-shaded worlds strung along four
   turns of the helix — one per ZeroPoint business world; the actual CI mark
   resolving out of the dark at the base of the stream, where the descent
   stops and holds. The camera falls BACKWARDS down the outside of the coil,
   gazing back up the stream at where it came from — HELIX-V2's descent,
   running in real time.

   Deliberate changes from the standalone (everything else ports verbatim —
   diff against prompts/reference-core-engine.js if in doubt):
   1. React wrapper -> plain IIFE; refs -> getElementById.
   2. 7 sections -> 8: the manifesto ("departure") is spliced between the
      hero and the first world. Everything keyed to section count shifts
      from 6 to 7 intervals: f = p*7, camera keys grow one entry, the aim
      table gains a second core entry, and the origin beat lands on f = 6
      (where the descent now stops — see 15).
   3. Inner scroll container -> the page scroll, so anchors, keyboard and
      mobile browser chrome behave; the URL-bar resize guard from site.js
      replaces the ResizeObserver.
   4. The origin resolves into assets/logo/mark.svg, billboarded at the base
      of the stream — the journey ends on the logo.
   5. Damped pointer parallax on the eye — the scene answers a head move.
   6. Background lifted off pure black onto the peacoat family (CI rule);
      portrait centres the composition (cx 0.5, cy 0.40) so copy owns the
      lower third, and phones run a 0.55 star density (rebuilt if the
      viewport crosses the width class).
   7. Reduced motion: scroll smoothing snaps, scene time freezes, grain
      holds still, parallax off.
   8. The mark billboard draws ABOVE the field on purpose — on the held
      final frame the logo is chrome, not scenery.
   9. POLISH Job B — camera(): the round-to-nearest aim (weight dips to ZERO
      mid-seam, throwing every body out of frame and back in) is replaced by
      a smoothstep crossfade between CONSECUTIVE features that completes at
      80% of the seam (before the eye's helix rotation peaks); per-section
      hold weights retuned 1 / 0.5 / 0.62 -> 1 / 0.5 / 0.78. Invariant held:
      in a 50- and a 100-step scroll sweep every body enters the frame once,
      holds, and exits once across f in [0,6] — which is now the whole run.
   10. POLISH Job A — sprite resolution: 384 -> core 1280 / planets 768
      (mobile 768 / 512). makeSprite splits into renderSpriteRows; the core
      renders synchronously before first paint (veil covers it), the four
      planets defer to after first paint in 4-row chunks under a ~5 ms/rAF
      budget (deferSprites, invalidated via this.sgen). On a width-class
      REBUILD (no veil) the previous generation's sprites keep drawing and
      the core re-shades through the same deferred path — nothing vanishes
      and the resize handler never stalls.
   11. POLISH Job A — core shader, matched to CI/Landing.png: a second
      white-hot rim layer at the limb (seam-notched, so facets cut into the
      crescent), rim modulated by the bumped normal, facet seams near the
      terminator catch the rim light with LATERAL falloff, finer hex grid
      (17, reference 13) with narrower seams (.78/.22, reference .72/.28),
      base rim retuned rimK 8.5 -> 10.5 / rimP 3.4 -> 2.4, facet albedo
      variance .022 -> .026, wide rim tinted electric blue (.48/.70/1.12,
      reference .72/.85/1.05), and a baked two-layer directional halo
      outside the limb.
   12. POLISH Job A — drawCore: concentric shells biased to the GLOW side
      via conic gradient (uniform rings as fallback), two-layer screen
      bloom (tight near-white sheet + wide blue atmosphere); resize()
      re-asserts imageSmoothingQuality 'high' after canvas realloc.
   13. POLISH Job B — emergence fade: planets and the origin draw only around
      their own beat (+-1.2 sections, 0.35 ramp; the core is exempt, the
      finale pull-back lerps everything back to full). The portrait lens is
      wide enough to catch bodies sections away (the origin peeked over the
      bottom edge two beats early, passed worlds clipped the top corner),
      and each such peek re-violated the enter-once invariant on phones.
      With it, the 50-step sweep holds the invariant in landscape (both
      any-part-visible and centre-visible metrics) and portrait
      (any-part-visible; centre-only seam clips in the 390px-wide frame
      remain — the body never fully leaves view).
   14. POLISH Job C — the origin is the MARK, nothing else. The reference
      engine's starlight torus (drawRing) is gone: it read as a hard band
      cutting straight through the logo at the origin beat and as a stray
      ellipse orbiting it at the finale — a shape the CI does not own. The
      mark now resolves out of the dark on a soft radial lift alone, and
      this.origin survives purely as the anchor point + scale reference.
   15. POLISH Job C — the descent ENDS on the mark. Scene progress clamps at
      SCENE_END (6/7, the origin beat) while the copy overlay and rail keep
      reading full-page progress: past that point the world is frozen and
      only the arrival copy + contact form scroll up over the still frame.
      Cut as unreachable: the finale swing-out in camera() (f > 6) and the
      finK lerp that re-revealed every faded body with it. Two consequences
      to keep in mind before reviving them — the reference engine's finale
      was the ONLY place the whole formation was visible at once, and the
      enter-once camera invariant now only has to hold over f in [0,6],
      which is exactly the range the sweep already verified.
   16. POLISH Job D — the four worlds brought up to the core's standard.
      Job A matched only the core to CI/Landing.png; the worlds kept a flat
      single-rim shader and read as matte plastic beside it. The three
      Landing-grade ingredients (two-layer crescent, baked directional limb
      halo, relief cutting into the limb light) were all gated on
      kind === 'core' and now run for every kind off the SHADE table, plus
      per-world surface detail: sub-facet weathering on basalt, three band
      scales and a storm on clouds, crust between the veins on fissure,
      crazing on ice. drawPlanet gains drawCore's two-layer bloom, biased
      onto the crescent (Job A's single centred blob lit the dark side as
      much as the lit one and flattened whatever it touched). Worlds render
      at 1024 on desktop (was 768); mobile holds at 512.
      VERIFIED: the core sprite is byte-identical to Job A (sha256 of the
      composited render matches HEAD) — the reference match is untouched.
      COST: deferred sprite work 353 -> 941 ms, i.e. ~3.1 s to full detail
      at the 5 ms/rAF budget. Acceptable only because the queue runs in
      scroll order: basalt is ready in ~0.34 s and each world lands well
      before its beat. If a world is ever reordered or the budget tightened,
      re-measure — dropping octaves does NOT help (tried: 1.4%), the cost is
      resolution, so the knob is spriteSize.
   17. POLISH Job E — generated HD plates for worlds 03 and 04. A procedural
      fbm shader has a ceiling well below a diffusion render, so those two
      worlds now ship pre-rendered plates (Seedream 4.5, 4K, conditioned on
      CI/Landing.png) instead of being shaded at runtime. See loadPlates()
      for the contract and its two caveats. Worlds 01 and 02 are STILL
      procedural — see below.
      COST: deferred queue drops 941 -> ~405 ms (only basalt + clouds still
      render), so plating two worlds more than pays for Job D's 1024px bump.
      Adds 310 KB of WebP.
      PLATE AUTHORING, hard-won — a generated render is NOT drop-in:
      a) The disc must be re-fitted to disc = 0.68 * canvas, centred, or the
         world draws at the wrong size. Never trust the model's framing.
      b) The source "black" is NOT zero (JPEG noise ~3-8). A naive luminance
         alpha therefore leaves faint coverage across the whole square, which
         composites as a visible RECTANGLE around the planet. Lift the alpha
         floor above the noise AND apply a radial window that reaches zero
         before the corners. Verify corner alpha == 0 before shipping; it
         also cut the ice plate 390 -> 156 KB.
      WHY ONLY TWO: basalt and clouds could not be generated usably in 12
      attempts. Seedream will not frame a complete disc with margin on
      demand (subject-fills-frame bias; pushing harder made it invent
      floors, borders and second moons) and reverts "banded gas giant" to
      Jupiter's browns against explicit instruction. images_expand is NOT a
      fix — it regenerates rather than extends, and destroyed the crescent.
      If retrying: generate at whatever framing the model likes and re-fit
      in code, and correct palette in post — do not fight either in prompt.
   18. POLISH Job F — the CORE is plated, and plate resolution is now chosen by
      measurement rather than by eye.
      a) THE MEASUREMENT. tools/measure-draw.mjs wraps ctx.drawImage and reports
         the largest each body is drawn at full opacity. On a 1440x900 @2x
         display every body was being BROWSER-upscaled at its own beat: core
         1.59x, clouds 2.41x, fissure 2.15x, basalt 1.58x, ice 1.24x. "HD plate"
         was never the same claim as "enough pixels where it counts". The core
         is now a 2048px plate against a 2038px peak draw — matched. All four
         worlds were then re-plated to their own measured peaks (basalt 2048,
         clouds 2560, fissure 2304, ice 1664): at 1440x900 @2x nothing is
         upscaled at all any more, and on a 16in MBP the worst case fell from
         3.00x to 1.24x. Plate weight 467 KB -> 1.16 MB, which is why the four
         worlds now load at fetchPriority 'low' behind the veil-blocking core.
         Re-run measure-draw before changing any sprite size or camera focal.
      b) HOW IT WAS MADE. Job E's own pipeline, which beats generation because
         an upscaler CANNOT REFRAME: render the sprite (tools/sprite-out.mjs),
         Magnific creative 2x / subtle / creativity 5 / resemblance 6 / hdr 4,
         then tools/make-world-plate.py --fitted --size 2048. Measured +19.6%
         gradient energy in the facet field in-scene, and the drawn silhouette
         is the same size to 0.6% — the 0.68 contract survived.
         The script's fit check is RELATIVE to the source sprite now, because
         find_disc thresholds at luminance 26 and on a body with a near-black
         limb it latches onto the crescent alone: it calls the known-good engine
         sprite 0.59-of-canvas and 15% off-centre. Do not trust it absolutely.
      c) BOOT. makeSprite is gone with its only caller — nothing renders a whole
         sprite synchronously any more, so there is no blocking work before
         first paint. The veil now waits on the core HAVING pixels instead
         (loop()), the core plate is <link rel=preload>ed in worlds.html, and
         drawCore gained the same !sprite guard drawPlanet always had. Verified
         with the plate 404ing: the shader takes over and the veil still drops.
      d) PORTRAIT cy 0.40 -> 0.30. See the note at the projection. The copy was
         promised the lower third and did not get it; at World 02, 43% of the
         eyebrow sat on lit cloud at 2.8:1. Now 2% at 5.9:1, invariant unchanged.
      e) LIGHT DIRECTION IS A SHIPPABLE INVARIANT, and ice was breaking it. Every
         body must be lit from the upper left (the shader's key is
         L = (-.52, .46, .72)); measured as the brightness centroid inside the
         disc, core/basalt/clouds sit at 162/163/143 degrees. The ice plate came
         from generated art that was lit front-right and read at -45 — a full
         phase where the rest of the descent is a crescent, i.e. the light
         appears to jump at World 04. Two fixes were tried and rejected:
         multiplying by a correct lambert term cannot undo baked lighting (it
         just muddies the body and kills the rim), and re-plating from the ice
         shader gets the angle right but is a plain grey ball beside the
         generated art. What worked was rotating the plate 180 degrees — free,
         keeps every bit of the crazing detail, and lands at 138 degrees. It
         works because a sphere has no inherent up. Only fissure is exempt: it
         is lit from within by design (World 03, the AI Factory).
      HARNESSES, all in tools/, all needing `npm i --no-save playwright-core`
      and the range-capable server: measure-draw (plate sizing), boot-check
      (veil/console/failed requests), copy-contrast (portrait legibility),
      scroll-sweep (the enter-once camera invariant), sprite-dump (shader drift),
      perf-check (draw() cost), capture-beats (the 7 beats, landscape or
      portrait, with or without copy).
   19. POLISH Job G — spending the budget plating freed, on DETAIL (Gerrit's
      call, asked explicitly). Nothing is procedurally shaded per-frame any
      more, and draw() measured 1.2 ms against an 8.3 ms frame, so the room was
      real. Measure with tools/perf-check.mjs, which times draw() itself —
      the rAF interval is vsync-locked and reads 8.3 ms however cheap or
      expensive the scene is, right up until it is already too slow.
      a) DUST 900 -> 2600, and it is now a STREAM rather than a haze. It used to
         be scattered anywhere from 0.3 to 1.8 of the coil radius with +-2 of
         jitter, so nothing in it traced the path the camera falls along. Now
         62% is a tight three-way braid hugging the helix, the rest is the old
         diffuse cloud (the braid alone looks like a wire), and a 10% tail
         spirals in and settles on the origin — the helix stops at BOT while the
         mark sits 1.4 below it, so the arrival beat had nothing arriving. It is
         dust and not a shape on purpose: note 14 cut a ring from exactly there.
         Cost went DOWN, 1.2 -> 1.0 ms, because motes below ~1.7px now take a
         flat rect instead of a createRadialGradient — the per-particle gradient
         allocation, invisible at that size, was the entire reason for the old
         900 cap. Stride is 5 now (x, y, z, alpha, size), not 4.
      b) ASTEROIDS 138 -> 230, with pits on the big ones, and a REAL BUG FIXED:
         the fill gradient was built at fixed local coordinates AFTER
         ctx.rotate, so every rock's terminator rode its own rotation — a belt
         lit from 138 different directions sitting next to plates that are all
         lit from the upper left. The gradient axis is now counter-rotated by
         -rot, which expresses the screen-space key light in the rock's frame.
      Whole pass costs 1.2 -> 1.3 ms/frame.
   20. POLISH Job H — TONALITY: core and basalt re-plated from generated art.
      Job F fixed resolution but not tone: inside its disc the shipped core
      measured median 6.7 / p90 11.7 / 94% near-black against CI/Landing.png's
      16.3 / 104.7 / 53% — a silhouette with a rim, which is why sharpening
      never made it read better. Both crushed bodies (core, basalt) were
      upscales of the procedural shader; the shader's tonal range was the
      ceiling, and an upscaler faithfully sharpens a black ball. Note 17's
      "never generate" rule was too broad: it is true for DROP-IN use and
      false once make-world-plate.py refits the disc — fissure and ice were
      both generated, and read best on the page.
      a) CORE is now reference/worlds/generated/hero-core-cinematic.jpg (the
         agreed look target). Its disc was circle-fitted from the crescent arc
         plus dark-limb edge profiles, because on THIS art find_disc AND the
         radial-profile disc_frac both lie — the giant baked halo props the
         luminance profile past the limb (measured: disc_frac calls the raw
         hero 1.0-of-canvas). The crop is contract-sized by construction and
         verified by limb-edge profiles on the finished plate (within ~1.5%).
         Mirrored — the hero's crescent is on the RIGHT, and relighting baked
         light is a rejected approach (note 18e) — then rotated so the
         brightness centroid lands at 152.6 deg (sibling range 137-155).
      b) The hero's dust trail and the voids left by rotate() (frame-edge
         cut, rotation clip, crop pad) are healed by CIRCULAR INTERPOLATION
         IN POLAR SPACE: per radius, invalid angular runs are rebuilt from
         the valid ring values either side. Angular-wedge suppression toward
         ambient was tried first and FAILS in-scene: its ray-shaped
         boundaries read as hard L-edges once drawCore's bloom amplifies the
         halo. Detect the voids by pushing a white mask through the identical
         rotate+crop — deriving them from geometry went wrong twice.
      c) A shadow-anchored highlight curve (identity below lum 18, gain 1.5
         across 45..150, unity again by 245, applied as a luminance-keyed RGB
         multiply) lifts the lit side without greying the shadow or clipping
         the crescent — NOT a brightness/gamma move, which is exactly what
         the tonality brief forbids. Plate: median 20.3 / p90 99.3 / 46%
         near-black, byte size 215 KB.
      d) BASALT: Seedream 4.5 CONDITIONED ON THE SHIPPED PLATE composited on
         black at 55% of frame (a framing reference, not a look reference)
         produced complete discs with margin on the first try — pure text
         prompting had failed 19 times across two sessions (note 17). Refit
         through the detection path, rotated -3.9 deg. Plate: median 39 /
         p90 99.3 at 151.9 deg, 330 KB. Source art committed as
         reference/worlds/generated/basalt-hexdisc-4k.jpg.
      e) WEIGHT: webp encodes the ALPHA plane losslessly by default, and the
         luminance->alpha cut inherits per-pixel photographic grain — 512 KB
         of the new core's first 771 KB was alpha. tools/finish-plate.py
         re-cuts alpha from 3px-blurred luminance (alpha is a coverage mask;
         visually identical) and encodes it lossy (alpha_quality 55):
         core 215 KB, basalt 330 KB, corner alpha still asserted 0.
      Harnesses re-run green after the swap: nothing UPSCALED, veil 557/550
      ms, enter-once holds at 60 steps, worst label 4% on lit ground, draw()
      1.1 ms, all 7 beats captured against CI/Landing.png. */
(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* The descent ENDS on the origin beat (section 6 of 8, f = 6). Past this
     the world holds absolutely still and only the page keeps scrolling, so
     the arrival copy and the contact form ride up over a frozen frame of the
     mark. Page progress runs 0..1 across 8 sections; the scene reads a
     progress clamped here. */
  const SCENE_END = 6 / 7;

  /* POLISH Job D — per-kind shading table.

     Job A matched the CORE to CI/Landing.png and stopped there; the four
     worlds kept a flat single-rim treatment and read as matte plastic next
     to it. Every kind now gets the same three ingredients that make the
     reference plate work — a two-layer crescent (wide blue wash + a tight
     near-white line at the limb), a directional halo baked outside the
     limb, and surface relief that cuts into the limb light — with per-kind
     numbers so each world keeps the identity its copy promises.

       keyMul   key-light gain (lower = more of the body left to the dark)
       rimK/P   wide crescent gain / falloff
       hot/hotP tight near-white limb line: gain / falloff
       bumpRim  how much the crescent reads surface relief (0 = geometric)
       seamK    facet seams catching the limb light (basalt/core only)
       haloR    halo reach, in body radii
       haloT/W  tight and wide halo radii
       haloA/B  tight and wide halo weights
       haloP    how sharply the halo hugs the light direction
       wrap     halo floor away from the light — an atmosphere, not a rim
       rt       wide-crescent tint
       hc/hh    halo colour, cool base -> hot core

     The `core` column reproduces Job A exactly — the sprite is verified
     byte-identical, so the reference match is not disturbed by any of this. */
  const SHADE = {
    /* the zero point: nearly all body left black, all drama at the limb */
    core:    { keyMul: .35, rimK: 10.5, rimP: 2.4, hot: 34, hotP: 8.5, bumpRim: .45, seamK: 3.2,
               haloR: 1.42, haloT: .10,  haloW: .34, haloA: .85, haloB: .22, haloP: 1.7, wrap: .06,
               rt: [.48, .70, 1.12], hc: [98, 152, 255], hh: [234, 246, 255] },
    /* World 01 — cooled stone, sealed. Nearest the core, deliberately not
       its equal: the crescent is real but the body keeps its own albedo. */
    basalt:  { keyMul: .62, rimK: 6.2,  rimP: 3.0, hot: 16, hotP: 8.0, bumpRim: .40, seamK: 2.2,
               haloR: 1.30, haloT: .085, haloW: .26, haloA: .62, haloB: .16, haloP: 1.8, wrap: .05,
               rt: [.55, .74, 1.10], hc: [92, 140, 242], hh: [226, 240, 255] },
    /* World 02 — the brightest body on the descent. A lit world needs less
       crescent and more atmosphere, so the halo runs wide and wraps far. */
    clouds:  { keyMul: .95, rimK: 3.4,  rimP: 3.6, hot: 9,  hotP: 7.0, bumpRim: 0,   seamK: 0,
               haloR: 1.38, haloT: .11,  haloW: .32, haloA: .50, haloB: .26, haloP: 1.5, wrap: .22,
               rt: [.70, .84, 1.06], hc: [120, 158, 240], hh: [238, 246, 255] },
    /* World 03 — lit from inside. Dark shell so the veins stay the brightest
       thing on it; the crescent tints bluer to agree with them. */
    fissure: { keyMul: .55, rimK: 5.0,  rimP: 3.2, hot: 13, hotP: 8.2, bumpRim: 0,   seamK: 0,
               haloR: 1.34, haloT: .095, haloW: .30, haloA: .58, haloB: .20, haloP: 1.7, wrap: .10,
               rt: [.52, .74, 1.16], hc: [96, 146, 250], hh: [228, 242, 255] },
    /* World 04 — "small, crescent-lit, wearing a thin atmosphere". The copy
       asks for this one outright: strongest crescent per unit body, and the
       highest wrap so the atmosphere still rings the dark side. */
    ice:     { keyMul: .42, rimK: 7.0,  rimP: 2.9, hot: 20, hotP: 8.4, bumpRim: 0,   seamK: 0,
               haloR: 1.40, haloT: .105, haloW: .30, haloA: .70, haloB: .24, haloP: 1.6, wrap: .34,
               rt: [.60, .78, 1.12], hc: [110, 158, 255], hh: [232, 244, 255] },
  };

  /* ================================================================ CONTACT */
  function initForm() {
    const form = document.getElementById("contact");
    const note = document.getElementById("c-note");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      note.className = "form-note"; note.textContent = "";
      const d = new FormData(form);
      const name = (d.get("name") || "").toString().trim();
      const email = (d.get("email") || "").toString().trim();
      const message = (d.get("message") || "").toString().trim();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
        note.className = "form-note err";
        note.textContent = "Please add your name, a valid email and a message.";
        return;
      }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Sending…";
      let ok = true;
      try {
        const r = await fetch("send-email.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message }),
        });
        ok = r.ok;
        try { const j = await r.json(); ok = j && j.ok !== false; } catch (_) {}
      } catch (_) { ok = false; } // network failure -> surface the fallback address
      if (ok) {
        note.className = "form-note ok";
        note.textContent = "Thank you — we'll be in touch shortly.";
        form.reset();
      } else {
        note.className = "form-note err";
        note.textContent = "Something went wrong. Email hello@zeropoint.africa instead.";
      }
      btn.disabled = false; btn.textContent = "Talk to an expert";
    });
  }
  try { initForm(); } catch (e) {}

  const veil = document.getElementById("veil");
  const dropVeil = () => {
    if (!veil || veil.classList.contains("hide")) return;
    veil.classList.add("hide"); setTimeout(() => veil.remove(), 900);
  };
  setTimeout(dropVeil, 5000); // never strand the visitor behind the spinner

  const cv = document.getElementById("scene");
  const ctx2d = cv && cv.getContext ? cv.getContext("2d") : null;
  if (!ctx2d) { document.body.classList.add("no-scene"); dropVeil(); return; }

  class Worlds {
    constructor() {
      this.ctx = ctx2d;
      this.p = 0; this.ps = 0;
      this.TOP = 8.6; this.BOT = -8.6; this.RAD = 4.0; this.TURNS = -4;
      /* phones get a thinner field — same look, half the per-frame work */
      this.starDensity = innerWidth < 768 ? 0.55 : 1;
      this.grainAmt = 1;
      this.ptx = 0; this.pty = 0; this.px = 0; this.py = 0; // pointer, damped
      this.shown = false;

      this.sections = Array.from(document.querySelectorAll("[data-sec]"));
      this.railFill = document.querySelector("#rail .fill");
      this.railNum = document.querySelector("#rail .num");

      /* the CI mark — the origin resolves into it at the base of the stream */
      this.markImg = new Image();
      this.markImg.src = "assets/logo/mark.svg";

      this.resize(true);
      this.buildScene();

      addEventListener("resize", () => this.resize(false), { passive: true });
      addEventListener("pointermove", (e) => {
        this.ptx = (e.clientX / innerWidth) * 2 - 1;
        this.pty = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
      document.addEventListener("pointerleave", () => { this.ptx = 0; this.pty = 0; }, { passive: true });

      this.t0 = performance.now();
      this.loopB = this.loop.bind(this);
      this.raf = requestAnimationFrame(this.loopB);
    }

    /* ---------- noise ---------- */
    h3(x, y, z) { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); }
    vnoise(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = x - xi, yf = y - yi, zf = z - zi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
      const H = this.h3.bind(this);
      const c = (a, b, t) => a + (b - a) * t;
      const x00 = c(H(xi, yi, zi), H(xi + 1, yi, zi), u), x10 = c(H(xi, yi + 1, zi), H(xi + 1, yi + 1, zi), u);
      const x01 = c(H(xi, yi, zi + 1), H(xi + 1, yi, zi + 1), u), x11 = c(H(xi, yi + 1, zi + 1), H(xi + 1, yi + 1, zi + 1), u);
      return c(c(x00, x10, v), c(x01, x11, v), w);
    }
    fbm(x, y, z, o) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * this.vnoise(x * f, y * f, z * f); f *= 2.03; a *= .5; } return s; }

    /* ---------- geometry ---------- */
    helix(u, r) {
      const a = u * this.TURNS * Math.PI * 2 + 0.6, R = r === undefined ? this.RAD : r;
      return [Math.cos(a) * R, this.TOP - u * (this.TOP - this.BOT), Math.sin(a) * R];
    }
    helixAng(u) { return u * this.TURNS * Math.PI * 2 + 0.6; }

    buildScene() {
      this.sgen = (this.sgen || 0) + 1; // invalidates any pending sprite jobs
      /* POLISH: a width-class rebuild happens mid-scene with no veil — keep
         the previous generation's sprites drawing until replacements land */
      const prevPlanets = this.planets, prevCore = this.core;
      const dens = this.starDensity;
      const N = Math.round(9000 * dens);
      const st = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) {
        const u = Math.random();
        const p = this.helix(u);
        // braided: three strands offset around the tube
        const strand = i % 3, ph = strand * 2.094 + u * 46;
        const core = Math.pow(Math.random(), 2.4);
        const tube = 0.62 * core + 0.05;
        const ang = ph + (Math.random() - .5) * 2.6;
        const nrm = this.helixAng(u);
        const ox = Math.cos(nrm) * Math.cos(ang) * tube;
        const oz = Math.sin(nrm) * Math.cos(ang) * tube;
        const oy = Math.sin(ang) * tube;
        st[i * 4] = p[0] + ox + (Math.random() - .5) * .18;
        st[i * 4 + 1] = p[1] + oy + (Math.random() - .5) * .18;
        st[i * 4 + 2] = p[2] + oz + (Math.random() - .5) * .18;
        st[i * 4 + 3] = 0.32 + (1 - core) * 0.68 * Math.random() + 0.12;
      }
      this.stars = st; this.nStars = N;

      // sparse field stars
      const F = Math.round(1100 * dens), fs = new Float32Array(F * 4);
      for (let i = 0; i < F; i++) {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), R = 40 + Math.random() * 40;
        fs[i * 4] = Math.sin(ph) * Math.cos(th) * R; fs[i * 4 + 1] = Math.cos(ph) * R * 1.4; fs[i * 4 + 2] = Math.sin(ph) * Math.sin(th) * R;
        fs[i * 4 + 3] = 0.12 + Math.random() * 0.4;
      }
      this.field = fs; this.nField = F;

      /* dust — the connective tissue of the descent (Job G)
         Stride 5: x, y, z, alpha, size.

         This used to be 900 motes scattered anywhere from 0.3 to 1.8 of the
         coil radius with +-2 of jitter, which is a HAZE, not a stream: nothing
         in it traced the path the camera is falling along. It is now two
         populations plus a taper at each end. The STRAND hugs the helix
         tightly and is what actually reads as a braided flow; the HAZE is the
         old diffuse cloud, kept because the strand alone looks like a wire;
         the HEAD and TAIL carry the stream the last stretch to the core above
         and the origin mark below. Only the strand got dense — spending the
         particles where they describe the geometry. */
      const D0 = Math.round(2600 * dens);
      /* the HEAD is additive so the strand/haze/tail densities are untouched.
         0.16 and near-strand alpha, not the tail's 0.10 and heavy fade: the
         tail plays against empty black, the head against the core's halo —
         at tail values it disappeared into the glow. */
      const HEAD = Math.round(D0 * 0.16);
      const D = D0 + HEAD, du = new Float32Array(D * 5);
      const STRAND = Math.round(D0 * 0.62);
      const TAIL = Math.round(D0 * 0.10);          // convergence into the origin
      for (let k = 0; k < D; k++) {
        /* the HEAD — the stream's headwater. The coil tops out at TOP while
           the core floats 2.6 above it, so the stream used to terminate in
           mid-air: from the departure beat the camera (now at u 0.045-0.115,
           pitched up at the core) saw only that empty gap, the stream left
           the frame entirely around f 0.7 and re-entered with World 01 at
           f 1.5 — an exit-and-re-enter of the film's own current. Mirror of
           the origin TAIL below and deliberately the same vocabulary: a
           tapering dust strand, no new shape. It continues the helix's twist
           upward (helixAng runs backwards for u < 0) and thins as it climbs
           to graze the core's lower limb (motes stay outside the r 2.15
           disc: closest approach ~2.5 from the core's centre). */
        if (k < HEAD) {
          const t = k / HEAD;                     // 0 at the coil top, 1 at the limb
          /* 2.6 rad of twist, not the tail's 3.4 — a fuller swirl scatters
             the motes all the way around the axis and half of them vanish
             into the halo; a narrower band stays one legible ribbon */
          const ang = 0.6 + t * 2.6;
          const rad = this.RAD * (1 - t * 0.52);  // 4.0 -> ~1.9 against r 2.15
          const spread = 0.50 - t * 0.24;
          du[k * 5] = Math.cos(ang) * rad + (Math.random() - .5) * spread;
          du[k * 5 + 1] = this.TOP + t * 1.05 + (Math.random() - .5) * spread;
          du[k * 5 + 2] = Math.sin(ang) * rad + (Math.random() - .5) * spread;
          du[k * 5 + 3] = (0.06 + Math.random() * 0.14) * (1 - t * 0.20);
          du[k * 5 + 4] = Math.random() < 0.20 ? 0.6 + Math.random() * 0.7 : 0.12 + Math.random() * 0.26;
          continue;
        }
        const i = k - HEAD;
        /* Job G: the last stretch of the stream spirals in and SETTLES on the
           origin. The helix stops at BOT while the mark sits 1.4 below it, so
           the stream used to just stop short and the arrival beat had nothing
           arriving. This is deliberately dust and not a new shape: note 14 cut
           a ring here because a foreign silhouette next to the mark reads as
           part of the logo. A tapering strand is the vocabulary already in use. */
        if (i >= D0 - TAIL) {
          const t = (i - (D0 - TAIL)) / TAIL;        // 0 at the coil, 1 at the mark
          const ang = this.helixAng(1) + t * 3.4;
          const rad = this.RAD * Math.pow(1 - t, 1.5) * 0.85;
          const spread = 0.30 + (1 - t) * 0.5;
          du[k * 5] = Math.cos(ang) * rad + (Math.random() - .5) * spread;
          du[k * 5 + 1] = this.BOT - t * 1.4 + (Math.random() - .5) * spread;
          du[k * 5 + 2] = Math.sin(ang) * rad + (Math.random() - .5) * spread;
          du[k * 5 + 3] = (0.05 + Math.random() * 0.12) * (1 - t * 0.45);
          du[k * 5 + 4] = Math.random() < 0.18 ? 0.6 + Math.random() * 0.7 : 0.12 + Math.random() * 0.26;
          continue;
        }
        const strand = i < STRAND;
        const u = Math.random();
        // three sub-strands braid around each other along the coil
        const braid = strand ? (i % 3) * 2.094 : 0;
        const rad = strand ? this.RAD * (0.93 + Math.random() * 0.14)
                           : this.RAD * (0.3 + Math.random() * 1.5);
        const p = this.helix(u, rad);
        const jit = strand ? 0.55 : 4;
        const off = strand ? 0.42 : 0;
        du[k * 5] = p[0] + Math.cos(this.helixAng(u) + braid) * off + (Math.random() - .5) * jit;
        du[k * 5 + 1] = p[1] + (Math.random() - .5) * jit;
        du[k * 5 + 2] = p[2] + Math.sin(this.helixAng(u) + braid) * off + (Math.random() - .5) * jit;
        du[k * 5 + 3] = strand ? 0.05 + Math.random() * 0.13 : 0.03 + Math.random() * 0.07;
        /* Most motes are grains and a few are bright flecks. drawDust spends a
           radial gradient only on the big ones, so this split is what lets the
           count nearly triple for roughly the same cost. */
        du[k * 5 + 4] = Math.random() < 0.14 ? 0.7 + Math.random() * 0.9 : 0.12 + Math.random() * 0.3;
      }
      this.dust = du; this.nDust = D;

      /* the four worlds, one per turn of the stream:
         basalt  -> World 01 Enterprise Technology (dense, sealed, permanent)
         clouds  -> World 02 Consulting & Media    (banded signal, never still)
         fissure -> World 03 The AI Factory        (lit from inside — own light)
         ice     -> World 04 The Team              (thin atmosphere of people) */
      this.planets = [
        { u: .13, r: .42, kind: 'basalt', plate: 'assets/img/worlds/basalt.webp' },
        { u: .36, r: .64, kind: 'clouds', plate: 'assets/img/worlds/clouds.webp' },
        { u: .59, r: .57, kind: 'fissure', plate: 'assets/img/worlds/fissure.webp' },
        { u: .82, r: .33, kind: 'ice', plate: 'assets/img/worlds/ice.webp' }
      ].map(o => { const p = this.helix(o.u, this.RAD * 1.02); return Object.assign(o, { x: p[0], y: p[1], z: p[2] }); });
      /* POLISH (Job A): planet sprites defer to after first paint — boot
         cost is the core alone, which the veil covers. On a rebuild the
         previous generation's canvases keep drawing until the deferred
         replacements land (positions and kinds are deterministic). */
      this.planets.forEach((p, i) => { p.sprite = (prevPlanets && prevPlanets[i] && prevPlanets[i].sprite) || null; });

      /* asteroids, thickest around the fissured planet (the factory's ventures)
         Job G: 138 -> 230, and each rock carries a few pits so the big ones
         read as stone rather than as a flat polygon. The belt is the only
         mid-scale geometry between the worlds, so it is worth the detail. */
      const A = Math.round(230 * (dens < 1 ? 0.7 : 1)), ast = [];
      for (let i = 0; i < A; i++) {
        const belt = i < Math.round(A * 0.81);
        const near = belt ? this.planets[2] : this.planets[0];
        const rr = belt ? (0.75 + Math.random() * 1.15) : (1.0 + Math.random() * 1.9);
        const th = Math.random() * Math.PI * 2, el = (Math.random() - .5) * (belt ? .24 : .8);
        const pts = []; const n = 7 + ((Math.random() * 4) | 0);
        for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; const rad = .6 + Math.random() * .55; pts.push([Math.cos(a) * rad, Math.sin(a) * rad]); }
        const pits = [];
        for (let k = 0, np = 1 + ((Math.random() * 3) | 0); k < np; k++) {
          const pa = Math.random() * 6.283, pd = Math.random() * .42;
          pits.push([Math.cos(pa) * pd, Math.sin(pa) * pd, .07 + Math.random() * .13]);
        }
        ast.push({ x: near.x + Math.cos(th) * rr, y: near.y + el, z: near.z + Math.sin(th) * rr, s: .009 + Math.random() * .026, pts, pits, rot: Math.random() * 6.283 });
      }
      this.asteroids = ast;

      this.core = { x: 0, y: this.TOP + 2.6, z: 0, r: 2.15, kind: 'core',
                    plate: 'assets/img/worlds/core.webp' };
      /* Job F: the core is plated too, so the synchronous 1280px shader render
         that used to happen here — the one thing the veil actually had to wait
         for — is gone. A width-class rebuild simply carries the existing sprite
         over, because a plate is resolution-independent and the mobile/desktop
         sprite split no longer applies to it. deferSprites skips any body whose
         plate is live, so this call queues the fbm shader ONLY for a body whose
         plate failed to load. */
      if (prevCore && prevCore.sprite) this.core.sprite = prevCore.sprite;
      this.loadPlates();
      this.deferSprites([this.core].concat(this.planets));
      this.origin = { y: this.BOT - 1.4, r: 2.15 };
      this.grain = this.makeGrain();
      this.buildKeys();
    }

    /* POLISH Job E — generated HD plates. (Job F: the core is one too.)

       A body can ship a pre-rendered plate instead of the procedural shader.
       The plate is authored to the SAME contract renderSpriteRows produces —
       square, disc centred, disc diameter 0.68 of the canvas, alpha cut —
       so drawPlanet consumes it unchanged. It is loaded straight into
       pl.sprite, which drawImage accepts as an <img> just as happily as the
       offscreen canvas the shader builds.

       Two consequences worth knowing:
       - A plated world skips the fbm queue entirely, so it costs zero
         deferred render time and appears the moment the file decodes.
       - The plate bakes its own lighting, which is fine ONLY because the
         sprite is billboarded and drawn axis-aligned (drawPlanet applies no
         rotation) — the crescent is screen-space locked either way. If a
         world is ever rotated or lit dynamically, the plate stops working
         and the kind must fall back to the shader.
       The shader stays in place for every kind: a plate that fails to load
       leaves the procedural sprite in its slot rather than a hole. */
    loadPlates() {
      [this.core].concat(this.planets).forEach(pl => {
        if (!pl.plate) return;
        const img = new Image();
        img.decoding = 'async';
        /* Job F: the four worlds are ~900 KB between them and none of them is
           needed until its own beat, whereas the veil is held on the core. Drop
           their priority so they queue behind it instead of racing it for
           bandwidth on a cold load. */
        img.fetchPriority = pl.kind === 'core' ? 'high' : 'low';
        img.onload = () => { pl.sprite = img; };
        img.onerror = () => { pl.plate = null; this.deferSprites([pl]); }; // fall back to the shader
        img.src = pl.plate;
      });
    }

    /* ---------- planet sprites ---------- */
    hexFacet(x, y) {
      const q = (Math.sqrt(3) / 3 * x - y / 3), r = (2 / 3 * y);
      let cx = q, cz = r, cy = -q - r;
      let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
      const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
      if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
      const px = Math.sqrt(3) * (rx + rz / 2), py = 1.5 * rz;
      const d = Math.hypot(x - px, y - py);
      return { d, id: rx * 73.1 + rz * 191.7 };
    }
    /* POLISH (Job A): sprites render at high resolution. The core renders
       first and synchronously — it is the first thing seen and the veil
       holds until the first frame — while the four planets defer to after
       first paint, rendered in ~6 ms row chunks so nothing hitches. */
    spriteSize(kind) {
      const mobile = innerWidth < 768;
      /* Job D: worlds 768 -> 1024 on desktop. The new sub-facet grain, cloud
         bands and ice crazing are all detail that 768 was already clipping;
         mobile holds at 512 because the deferred render there is the budget
         constraint, not the pixels. */
      return kind === 'core' ? (mobile ? 768 : 1280) : (mobile ? 512 : 1024);
    }
    /* Job F: makeSprite (the synchronous whole-sprite render) is GONE. Its only
       caller was the core's pre-first-paint build, and the core is plated now.
       Every remaining path — including a plate that 404s — goes through
       deferSprites, which does the same work in row chunks without blocking. */
    deferSprites(list) {
      const gen = this.sgen;
      /* Job E: a plated world never enters the fbm queue — its pixels come
         from the file. This is also why the queue got cheaper, not dearer,
         despite Job D raising the procedural worlds to 1024. */
      const jobs = list.filter(pl => !pl.plate).map(pl => {
        const S = this.spriteSize(pl.kind);
        const scv = document.createElement('canvas'); scv.width = scv.height = S;
        const ct = scv.getContext('2d');
        return { pl, S, scv, ct, img: ct.createImageData(S, S), y: 0 };
      });
      const step = () => {
        if (gen !== this.sgen) return; // scene rebuilt underneath — abandon
        const j = jobs[0]; if (!j) return;
        const t0 = performance.now();
        /* 4-row slices: the budget check runs between slices, so the slice
           itself must stay well under a frame even on the heavy fbm kinds
           (a 16-row fissure slice alone measured ~7 ms on a fast desktop) */
        while (j.y < j.S && performance.now() - t0 < 5) {
          const y1 = Math.min(j.S, j.y + 4);
          this.renderSpriteRows(j.img.data, j.pl.kind, j.S, j.y, y1);
          j.y = y1;
        }
        if (j.y >= j.S) { j.ct.putImageData(j.img, 0, 0); j.pl.sprite = j.scv; jobs.shift(); }
        if (jobs.length) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    renderSpriteRows(d, kind, S, y0, y1) {
      const R = S * 0.34, C = S / 2;
      const Lx = -.52, Ly = .46, Lz = .72;
      const rl = 1 / Math.hypot(Lx, Ly, Lz);
      const lx = Lx * rl, ly = Ly * rl, lz = Lz * rl;
      // rim (back-left) light
      const bx = kind === 'core' ? -.50 : -.82, by = kind === 'core' ? .16 : .22, bz = kind === 'core' ? -.86 : -.52, bl = 1 / Math.hypot(bx, by, bz);
      const rx = bx * bl, ry = by * bl, rz2 = bz * bl;
      const S_ = SHADE[kind] || SHADE.basalt;
      const keyMul = S_.keyMul, rimK = S_.rimK, rimP = S_.rimP;
      for (let py = y0; py < y1; py++) {
        for (let px = 0; px < S; px++) {
          const i = (py * S + px) * 4;
          const nx = (px + .5 - C) / R, nyS = (py + .5 - C) / R;
          const d2 = nx * nx + nyS * nyS;
          const ny = -nyS;
          if (d2 > 1) {
            /* POLISH Job D: the two-layer halo baked outside the limb — the
               crescent's bloom in the reference plate (CI/Landing.png) — now
               runs for EVERY kind off the shading table, not just the core.
               `wrap` is the floor away from the light: at 0 the glow is a
               pure directional crescent, higher values ring the dark side
               too, which is how the worlds carry an atmosphere. */
            const dd = Math.sqrt(d2);
            if (dd < S_.haloR) {
              const dirDot = Math.max(0, (nx / dd) * rx + (ny / dd) * ry);
              const lit = S_.wrap + (1 - S_.wrap) * Math.pow(dirDot, S_.haloP);
              const tight = Math.pow(Math.max(0, 1 - (dd - 1) / S_.haloT), 2.4);
              const wide = Math.pow(Math.max(0, 1 - (dd - 1) / S_.haloW), 2.6);
              const a = (tight * S_.haloA + wide * S_.haloB) * lit;
              if (a > 0.003) {
                const wt = Math.min(1, tight * 1.2);
                d[i] = S_.hc[0] + (S_.hh[0] - S_.hc[0]) * wt;
                d[i + 1] = S_.hc[1] + (S_.hh[1] - S_.hc[1]) * wt;
                d[i + 2] = S_.hc[2] + (S_.hh[2] - S_.hc[2]) * wt;
                d[i + 3] = Math.min(255, a * 255);
              }
            }
            continue;
          }
          const nz = Math.sqrt(Math.max(0, 1 - d2));
          let sx = nx, sy = ny, sz = nz;
          const lat = Math.asin(Math.max(-1, Math.min(1, sy)));
          const lon = Math.atan2(sx, sz);
          let alb = [.10, .12, .16], emR = 0, emG = 0, emB = 0, bump = 0, spec = 0, seamV = 0;
          if (kind === 'basalt' || kind === 'core') {
            /* POLISH: the core's hex grid runs finer than the reference's
               13 (now matching basalt's 17) and its seams narrower — the
               reference plate reads ~2x the facet count with crisp edges */
            const sc = 17;
            const hx = lon / Math.PI * sc, hy = lat / Math.PI * sc;
            const f = this.hexFacet(hx, hy);
            const seam = kind === 'core'
              ? Math.min(1, Math.max(0, (f.d - .78) / .22))
              : Math.min(1, Math.max(0, (f.d - .72) / .28));
            seamV = seam;
            bump = (this.h3(f.id, 3.1, 7.7) - .5) * .30;
            const base = kind === 'core' ? .030 : .075;
            let g = base + this.h3(f.id, 1.7, 9.3) * (kind === 'core' ? .026 : .035);
            const shade = 1 - seam * .55;
            if (kind === 'basalt') {
              /* Job D: sub-facet weathering. The reference stone reads at two
                 scales — whole facets AND grain inside them — and at sprite
                 resolution one facet is ~90px of dead flat fill without it. */
              const grain = this.fbm(sx * 24, sy * 24, sz * 24, 3);
              g *= .84 + grain * .34;
              bump += (grain - .5) * .13;
            }
            alb = [g * .82 * shade, g * .92 * shade, g * 1.30 * shade];
            spec = (1 - seam) * (kind === 'core' ? .05 : .10);
          } else if (kind === 'clouds') {
            /* Job D: bands at three scales plus one storm. Job A's single
               sine and one 3-octave wash smear into mush up close. */
            const band = Math.sin(lat * 9.5 + this.fbm(sx * 2.2, sy * 5.5, sz * 2.2, 4) * 3.4);
            const fine = Math.sin(lat * 26 + this.fbm(sx * 5, sy * 11, sz * 5, 3) * 4.2);
            const spot = Math.pow(Math.max(0, 1 - Math.hypot(lon - 1.15, (lat + .28) * 2.1) / .52), 2.2);
            const g = .40 + band * .10 + fine * .035 + spot * .10
              + this.fbm(sx * 4, sy * 4, sz * 4, 3) * .12
              + this.fbm(sx * 13, sy * 13, sz * 13, 3) * .045;
            alb = [g * .95, g * 1.0, g * 1.1];
            bump = (band * .5) * .06;
          } else if (kind === 'fissure') {
            const n = this.fbm(sx * 3.1, sy * 3.1, sz * 3.1, 5);
            const ridge = 1 - Math.abs(n * 2 - 1);
            const vein = Math.pow(Math.max(0, ridge - .34) / .66, 15);
            const n2 = this.fbm(sx * 8.1 + 11, sy * 8.1, sz * 8.1, 4);
            const vein2 = Math.pow(Math.max(0, (1 - Math.abs(n2 * 2 - 1)) - .42) / .58, 20);
            const v = Math.min(1, vein * .9 + vein2 * .45);
            /* Job D: crust detail, so the shell between the veins is rock
               rather than flat shadow when the crescent grazes it */
            const crust = this.fbm(sx * 19, sy * 19, sz * 19, 3);
            const g = .050 + this.fbm(sx * 6, sy * 6, sz * 6, 4) * .045 + crust * .020;
            alb = [g * .8, g * .9, g * 1.2];
            bump = (crust - .5) * .16;
            emR = v * .34; emG = v * .50; emB = v * .82;
          } else if (kind === 'ice') {
            const n = this.fbm(sx * 4.4, sy * 4.4, sz * 4.4, 5);
            /* Job D: crazing — ridged fractures across the shell. This is
               what separates ice from a smooth grey ball at close range. */
            const cr = this.fbm(sx * 7.3 + 5, sy * 7.3, sz * 7.3, 4);
            const craze = Math.pow(Math.max(0, (1 - Math.abs(cr * 2 - 1)) - .58) / .42, 6);
            const g = .34 + n * .30 + this.fbm(sx * 17, sy * 17, sz * 17, 3) * .05 - craze * .13;
            alb = [g * .96, g * 1.0, g * 1.06];
            bump = (n - .5) * .10 - craze * .16;
            spec = .06 + craze * .05;
          }
          let mx = sx + bump * .9, my = sy + bump * .5, mz = sz;
          const ml = 1 / Math.hypot(mx, my, mz); mx *= ml; my *= ml; mz *= ml;
          let lam = Math.max(0, mx * lx + my * ly + mz * lz);
          lam = Math.pow(lam, 1.15) * keyMul;
          /* POLISH Job D: the rim reads the BUMPED normal, so surface relief
             cuts visibly into the crescent (the reference plate shows facets
             silhouetted against the limb light); seams near the terminator
             catch the rim light, and a tight second rim layer blows the limb
             toward white. All three were core-only in Job A and now run off
             the table — bumpRim/seamK are 0 for the kinds with no relief, so
             those keep the pure geometric rim they had. */
          const rimDotG = Math.max(0, sx * rx + sy * ry + sz * rz2);
          const rimDot = S_.bumpRim
            ? Math.max(0, rimDotG * (1 - S_.bumpRim) + (mx * rx + my * ry + mz * rz2) * S_.bumpRim)
            : rimDotG;
          const rim = Math.pow(1 - nz, rimP) * rimDot * rimK;
          const rimHot = S_.hot
            ? Math.pow(1 - nz, S_.hotP) * Math.pow(rimDot, 1.4) * S_.hot * (1 - seamV * 0.38) : 0;
          /* seam light falls off LATERALLY from the lit limb (the rim dot
             itself dies with nz — its z term dominates — and would confine
             the seams to the blaze itself) */
          const seamDir = Math.max(0, sx * rx + sy * ry);
          const seamLit = S_.seamK ? seamV * Math.pow(seamDir, 1.6) * Math.pow(1 - nz, 0.7) * S_.seamK : 0;
          const amb = 0.030;
          /* the wide rim layer leans electric blue — white lives only in the
             tight rimHot line (reference: Landing.png) */
          const rtR = S_.rt[0], rtG = S_.rt[1], rtB = S_.rt[2];
          let r = alb[0] * (lam * 1.85 + amb) + emR + rim * rtR + rimHot * 0.95 + seamLit * 0.60 + spec * Math.pow(lam, 22) * .9;
          let g = alb[1] * (lam * 1.92 + amb * 1.15) + emG + rim * rtG + rimHot * 1.0 + seamLit * 0.76 + spec * Math.pow(lam, 22);
          let b = alb[2] * (lam * 2.05 + amb * 1.6) + emB + rim * rtB + rimHot * 1.02 + seamLit * 1.05 + spec * Math.pow(lam, 22) * 1.1;
          const dd = Math.sqrt(d2);
          const aa = Math.min(1, (1 - dd) * R);
          d[i] = Math.min(255, Math.pow(Math.max(0, r), .85) * 255);
          d[i + 1] = Math.min(255, Math.pow(Math.max(0, g), .85) * 255);
          d[i + 2] = Math.min(255, Math.pow(Math.max(0, b), .85) * 255);
          d[i + 3] = Math.max(0, aa) * 255;
        }
      }
    }

    makeGrain() {
      const S = 220, gcv = document.createElement('canvas'); gcv.width = gcv.height = S;
      const ct = gcv.getContext('2d'), img = ct.createImageData(S, S), d = img.data;
      for (let i = 0; i < S * S; i++) {
        const v = 128 + (Math.random() - .5) * 190;
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
      }
      ct.putImageData(img, 0, 0); return gcv;
    }

    resize(force) {
      /* Mobile URL-bar show/hide fires height-only resizes on every scroll
         direction change — reallocating the canvas there blanks it mid-scroll
         (same guard as site.js). Only resize on width change or a big jump. */
      const cw = innerWidth, chh = innerHeight;
      if (!force && this.cssW === cw && Math.abs(chh - (this.cssH || 0)) <= 160) {
        /* ...but a height change that PERSISTS (desktop window drag, split
           view) must eventually commit or the scene stays stretched */
        clearTimeout(this._hT);
        this._hT = setTimeout(() => { if (innerHeight !== this.cssH) this.resize(true); }, 400);
        return;
      }
      this.cssW = cw; this.cssH = chh;
      const dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(cw * dpr));
      cv.height = Math.max(1, Math.round(chh * dpr));
      this.W = cv.width; this.H = cv.height; this.dpr = dpr;
      /* POLISH: canvas realloc resets context state — re-assert quality */
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      const dens = cw < 768 ? 0.55 : 1;
      if (dens !== this.starDensity) {
        this.starDensity = dens;
        if (this.stars) this.buildScene(); // rotation across the width class
      }
    }

    /* ---------- camera ---------- */
    buildKeys() {
      /* One u per section, riding just outside the coil, falling downward.
         PORT: a departure key is spliced in for the manifesto beat — 7 keys
         for 8 sections.

         The two spliced keys sit at u = 0.045 / 0.115, NOT further up the
         helix. The old pair (-0.062 / 0.048) spent 158° + 147° of orbit on
         the first two sections while the aim stayed pinned to the on-axis
         core — on screen that read as the camera circling a small ring
         around the black hole, and the core's screen path reversed
         direction four times (drift left, +163px right, -476px left, then
         a +1079px whip right across the frame). CAMERA-GRAMMAR.md §1:
         "never orbiting"; passed bodies exit ONCE, up and away. The
         current keys cut the pre-World-01 orbit to 101° + 50°: the core
         now drifts +139px, settles -46px while rising, and exits top-right
         in one move. Sections f >= 2 are untouched (same planet keys), the
         World-01 beat frame is pixel-identical, and both bodies' peak draw
         sizes SHRINK (core 344 -> 313px radius at the manifesto beat), so
         the measured plate budgets still hold. */
      this.us = [0.045, 0.115]
        .concat(this.planets.map(pl => pl.u + 0.020))
        .concat([1.115]);
      this.CR = this.RAD + 1.7;
    }
    camPath(u) {
      const a = this.helixAng(u);
      return [Math.cos(a) * this.CR, this.TOP - u * (this.TOP - this.BOT), Math.sin(a) * this.CR];
    }
    camera(p, time) {
      /* PORT: 8 sections -> f spans [0,7]; keys interpolate over [0,6].
         Callers clamp p to SCENE_END, so in practice f tops out at 6 and
         the camera comes to rest on the origin beat. */
      const us = this.us, f = Math.max(0, Math.min(7, p * 7));
      const i = Math.min(us.length - 2, Math.floor(f)), t = Math.min(1, Math.max(0, f - i));
      const e = t * t * (3 - 2 * t);
      const u = f >= 6 ? us[6] : us[i] + (us[i + 1] - us[i]) * e;
      const eye = this.camPath(u);
      if (f < 1) { const o = (1 - e) * 1.9, a = this.helixAng(u); eye[0] += Math.cos(a) * o; eye[2] += Math.sin(a) * o; }
      eye[1] += Math.sin(time * 0.21) * 0.09;
      // look back along the trajectory, tilted in toward the column
      const bk = this.camPath(u - 0.030);
      const wb = 0.68, wa = 0.32, lift = 5.4;
      let tgt = [bk[0] * wb, bk[1] * wb + (eye[1] + lift) * wa, bk[2] * wb];
      /* ease the aim onto whatever body this section is about — the manifesto
         beat keeps half an eye on the core it is falling away from */
      const feats = [
        [0, this.core.y + 0.1, 0],
        [0, this.core.y + 0.1, 0],
      ].concat(this.planets.map(pl => [pl.x, pl.y, pl.z]))
       .concat([[0, this.origin.y + 0.1, 0]]);
      /* crossfade between CONSECUTIVE features so the featured-body weight
         never collapses mid-seam — the gaze hands from one body to the next
         in a single move instead of dipping to the path default and back
         (that dip threw every body out of frame and back in). Weights:
         hero holds the core dead-on (1), the manifesto keeps half an eye on
         it (0.5), the worlds hold at 0.78. */
      const i0 = Math.min(5, Math.floor(f)), i1 = i0 + 1;
      const tt = Math.min(1, Math.max(0, f - i0));
      /* the hand-off completes at 80% of the seam — the eye's own helix
         rotation peaks mid-seam, and the aim must already own the next body
         by then or the rotation whips it out of frame before acquisition */
      const t8 = Math.min(1, tt / 0.8);
      const e2 = t8 * t8 * (3 - 2 * t8);
      const WS = (idx) => (idx === 0 ? 1 : idx === 1 ? 0.5 : 0.78);
      const wA = WS(i0) * (1 - e2), wB = WS(i1) * e2;
      tgt = tgt.map((x, j) => x * (1 - wA - wB) + feats[i0][j] * wA + feats[i1][j] * wB);
      /* the reference engine's finale (swing out to 34 units and see the whole
         formation) is cut: f never exceeds SCENE_END * 7 = 6, so the descent
         ends held on the mark instead of pulling away from it. The two ambient
         sine bobs stay — a paused world still breathes. */
      tgt[1] += Math.sin(time * 0.17) * 0.05;
      return { eye, tgt };
    }

    loop() {
      this.raf = requestAnimationFrame(this.loopB);
      try {
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - innerHeight);
        this.p = clamp(scrollY / max, 0, 1);
        this.ps += (this.p - this.ps) * (REDUCED ? 1 : 0.085);
        /* the scene stops at the origin beat and holds; the copy overlay and
           the rail below keep reading the full-page progress, so the arrival
           section scrolls in over a still frame */
        const p = Math.min(this.ps, SCENE_END), t = REDUCED ? 0 : (performance.now() - this.t0) / 1000;

        // overlay copy — raw p so the text answers the wheel instantly
        const n = this.sections.length;
        for (let i = 0; i < n; i++) {
          const c = i / (n - 1);
          const dd = Math.abs(this.p - c) / (0.86 / (n - 1));
          let o = Math.max(0, 1 - dd * dd);
          /* PORT: outgoing copy scrolls up under the fixed chrome — kill it
             before it gets there (d7 > 0 = sections scrolled past rest) */
          const d7 = this.p * (n - 1) - i;
          if (d7 > 0) o *= clamp((0.40 - d7) / 0.20, 0, 1);
          const s = this.sections[i];
          s.style.opacity = o.toFixed(3);
          s.style.transform = 'translateY(' + ((this.p - c) * 90).toFixed(1) + 'px)';
        }
        if (this.railFill) this.railFill.style.height = (this.p * 100).toFixed(1) + '%';
        if (this.railNum) this.railNum.textContent = String(Math.round(this.p * 100)).padStart(2, '0');
        if (this.railEl === undefined) this.railEl = document.getElementById('rail');
        if (this.railEl) this.railEl.style.opacity = this.p > 0.92 ? '0' : '1';

        this.draw(p, t);
        /* Job F: wait for the core to actually have pixels before revealing.
           It used to be shaded synchronously, so a first frame always had it;
           now it decodes from a file and an unguarded reveal would show an
           empty starfield with the hero body missing. dropVeil's own 5 s
           failsafe still guarantees nobody is stranded behind the spinner. */
        if (!this.shown && this.core.sprite) { this.shown = true; dropVeil(); }
      } catch (e) {
        /* one bad frame must never freeze the descent — recover next frame */
        if (!this.warned) { this.warned = true; console.warn('[zp-worlds]', e); }
      }
    }

    draw(p, t) {
      const ctx = this.ctx, W = this.W, H = this.H;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; // a mid-frame throw must not leak a dimmed frame
      ctx.globalCompositeOperation = 'source-over';
      /* peacoat-family deep space — CI: space is never pure black */
      const bg = ctx.createLinearGradient(0, 0, W * .5, H);
      bg.addColorStop(0, '#0b1322'); bg.addColorStop(1, '#070a12');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const { eye, tgt } = this.camera(p, t);

      /* pointer parallax — a damped head move, never a snap (PORT) */
      if (!REDUCED) {
        this.px += (this.ptx - this.px) * 0.05;
        this.py += (this.pty - this.py) * 0.05;
        let dx0 = tgt[0] - eye[0], dz0 = tgt[2] - eye[2];
        const rl0 = 1 / (Math.hypot(dx0, dz0) || 1);
        const amp = 0.5;
        eye[0] += (-dz0 * rl0) * this.px * amp;
        eye[2] += (dx0 * rl0) * this.px * amp;
        eye[1] += -this.py * amp * 0.6;
      }

      let fx = tgt[0] - eye[0], fy = tgt[1] - eye[1], fz = tgt[2] - eye[2];
      let fl = 1 / Math.hypot(fx, fy, fz); fx *= fl; fy *= fl; fz *= fl;
      // right = normalize(cross(forward, worldUp))
      let rx = -fz, ry = 0, rz = fx;
      const rlen = Math.hypot(rx, rz) || 1; rx /= rlen; rz /= rlen;
      const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
      /* PORT: portrait screens centre the composition and widen the lens a
         touch; landscape keeps the original right-of-centre text bias */
      const portrait = this.cssH > this.cssW;
      const foc = ((portrait ? Math.min(H, W * 1.25) : H) / 2) / Math.tan(0.40);
      const open = Math.max(0, 1 - p * 7);
      const cx = W * (portrait ? 0.5 : 0.605 + 0.085 * open * open);
      /* Job F: portrait 0.40 -> 0.30. At 0.40 the copy did NOT own the lower
         third it was promised — the copy block is bottom-anchored, so on the
         taller beats its eyebrow rides up to ~38% of the frame, and at World 02
         (the brightest body on the descent) 43% of that label sat on lit cloud
         at 2.8:1. Raising the camera centre lifts every body clear of the copy
         instead of dimming the scene to compensate: measured with
         tools/copy-contrast.mjs, the worst label goes 43% -> 2% on lit ground
         and 2.8:1 -> 5.9:1, and tools/scroll-sweep.mjs shows the portrait
         enter-once invariant unchanged (any-visible 1 for every body; the
         centre-metric 2 on clouds/ice is the pre-existing state in note 13).
         Landscape is untouched. */
      const cy = H * (portrait ? 0.30 : 0.50); // portrait copy owns the lower third
      const ex = eye[0], ey = eye[1], ez = eye[2];
      this.eyeP = eye;

      const proj = (x, y, z) => {
        const dx = x - ex, dy = y - ey, dz = z - ez;
        const vz = dx * fx + dy * fy + dz * fz;
        if (vz < 0.06) return null;
        const vx = dx * rx + dy * ry + dz * rz;
        const vy = dx * ux + dy * uy + dz * uz;
        return [cx + foc * vx / vz, cy - foc * vy / vz, vz];
      };

      /* POLISH: emergence fade — each body draws only around its own beat
         (+-1.2 sections, 0.35 ramp). The portrait lens is wide enough to
         catch bodies far up and down the stream (the origin peeked over the
         bottom edge two sections early, a passed world's sliver clipped the
         top corner), and every such early peek is an exit-and-re-enter
         violation. The core is exempt below: it OWNS sections 0-1 and its
         long goodbye down the stream is the design. The finale lerp back to
         full is gone with the finale itself. */
      const fR = Math.max(0, Math.min(7, p * 7));
      const bodyA = (sec) => {
        const dist = sec === 0 ? Math.max(0, fR - 1) : Math.abs(fR - sec);
        return clamp((1.2 - dist) / 0.35, 0, 1);
      };

      // big objects sorted far -> near
      const objs = [];
      this.planets.forEach((pl, pi) => { const s = proj(pl.x, pl.y, pl.z); if (s) objs.push({ t: 'p', o: pl, s, a: bodyA(pi + 2) }); });
      { const s = proj(this.core.x, this.core.y, this.core.z); if (s) objs.push({ t: 'core', s, a: 1 }); }
      /* POLISH: the origin is the MARK alone. The starlight torus that used
         to sit here read as a hard band cutting through the logo at the
         origin beat and as a stray ellipse around it at the finale — foreign
         to the CI. The anchor point survives; the ring no longer draws. */
      objs.sort((a, b) => b.s[2] - a.s[2]);
      const depths = objs.map(o => o.s[2]);
      const buckets = []; for (let i = 0; i <= objs.length; i++) buckets.push([]);
      const bucketOf = vz => { let k = 0; while (k < depths.length && depths[k] > vz) k++; return k; };

      // field stars (always farthest)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.nField; i++) {
        const s = proj(this.field[i * 4], this.field[i * 4 + 1], this.field[i * 4 + 2]); if (!s) continue;
        if (s[0] < -20 || s[0] > W + 20 || s[1] < -20 || s[1] > H + 20) continue;
        ctx.fillStyle = 'rgba(190,212,255,' + (this.field[i * 4 + 3] * .5).toFixed(3) + ')';
        ctx.fillRect(s[0], s[1], this.dpr, this.dpr);
      }

      // coil stars into buckets
      for (let i = 0; i < this.nStars; i++) {
        const s = proj(this.stars[i * 4], this.stars[i * 4 + 1], this.stars[i * 4 + 2]); if (!s) continue;
        if (s[0] < -30 || s[0] > W + 30 || s[1] < -30 || s[1] > H + 30) continue;
        buckets[bucketOf(s[2])].push(i);
      }
      // dust bucketed too
      const dbk = []; for (let i = 0; i <= objs.length; i++) dbk.push([]);
      for (let i = 0; i < this.nDust; i++) {
        const s = proj(this.dust[i * 5], this.dust[i * 5 + 1], this.dust[i * 5 + 2]); if (!s) continue;
        if (s[0] < -60 || s[0] > W + 60 || s[1] < -60 || s[1] > H + 60) continue;
        dbk[bucketOf(s[2])].push([s, this.dust[i * 5 + 3], this.dust[i * 5 + 4]]);
      }
      const abk = []; for (let i = 0; i <= objs.length; i++) abk.push([]);
      for (const a of this.asteroids) {
        const s = proj(a.x, a.y, a.z); if (!s) continue;
        if (s[0] < -80 || s[0] > W + 80 || s[1] < -80 || s[1] > H + 80) continue;
        abk[bucketOf(s[2])].push([s, a]);
      }

      const drawStars = list => {
        ctx.globalCompositeOperation = 'lighter';
        for (const i of list) {
          const s = proj(this.stars[i * 4], this.stars[i * 4 + 1], this.stars[i * 4 + 2]); if (!s) continue;
          const br = this.stars[i * 4 + 3];
          const near = Math.min(1, 9 / s[2]);
          let a = br * near * 0.85;
          if (a < .012) continue;
          const sz = Math.max(this.dpr * .75, Math.min(3.4 * this.dpr, near * 1.5 * this.dpr));
          if (a > .55 && sz > this.dpr * 1.4) {
            const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], sz * 3.4);
            g.addColorStop(0, 'rgba(206,226,255,' + (a * .5).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(120,160,230,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], sz * 3.4, 0, 6.2832); ctx.fill();
          }
          ctx.fillStyle = 'rgba(224,236,255,' + Math.min(1, a).toFixed(3) + ')';
          ctx.fillRect(s[0] - sz / 2, s[1] - sz / 2, sz, sz);
        }
      };
      /* Job G: two draw paths, chosen per mote. A createRadialGradient plus an
         arc fill per particle is what capped the old count at 900 — most motes
         are a couple of pixels across, where the gradient is invisible and the
         allocation is the entire cost. Grains take a flat rect; only the flecks
         big enough to show a falloff pay for one. */
      const drawDust = list => {
        ctx.globalCompositeOperation = 'lighter';
        for (const [s, a, sz] of list) {
          const near = Math.min(1, 10 / s[2]);
          const al = a * near;
          if (al < .008) continue;
          const r = near * 9 * this.dpr * (sz === undefined ? 1 : sz);
          if (r < 1.7 * this.dpr) {
            const d = Math.max(this.dpr, r);
            ctx.fillStyle = 'rgba(150,180,232,' + Math.min(1, al * 1.35).toFixed(3) + ')';
            ctx.fillRect(s[0] - d / 2, s[1] - d / 2, d, d);
            continue;
          }
          const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], r);
          g.addColorStop(0, 'rgba(120,150,205,' + al.toFixed(3) + ')');
          g.addColorStop(1, 'rgba(80,110,170,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, 6.2832); ctx.fill();
        }
      };
      const drawAst = list => {
        ctx.globalCompositeOperation = 'source-over';
        for (const [s, a] of list) {
          const r = foc * a.s / s[2]; if (r < .35) continue;
          ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(a.rot);
          ctx.beginPath();
          for (let k = 0; k < a.pts.length; k++) { const px = a.pts[k][0] * r, py = a.pts[k][1] * r; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.closePath();
          /* Job G: light every rock from the SAME screen direction as the
             bodies. The gradient used to be built at fixed local coordinates
             AFTER ctx.rotate, so each asteroid's terminator rode its own
             rotation — a belt lit from ~138 different directions, next to
             plates that are all lit from the upper left. Counter-rotating the
             gradient's axis by -rot expresses the screen-space key light in the
             rock's local frame, so the belt now agrees with the worlds. */
          const cr = Math.cos(a.rot), sr = Math.sin(a.rot);
          const lx = -0.72 * cr + -0.69 * sr, ly = 0.72 * sr + -0.69 * cr;
          const g = ctx.createLinearGradient(lx * r, ly * r, -lx * r * .85, -ly * r * .85);
          g.addColorStop(0, 'rgba(96,118,152,.98)');
          g.addColorStop(.32, 'rgba(52,66,92,1)');
          g.addColorStop(.66, 'rgba(22,28,42,1)');
          g.addColorStop(1, 'rgba(8,11,18,1)');
          ctx.fillStyle = g; ctx.fill();
          if (r > 1.6) {
            /* a hard rim on the lit edge only — a full outline reads as a
               sticker, this reads as a sunlit edge */
            ctx.save(); ctx.clip();
            ctx.strokeStyle = 'rgba(178,205,255,.5)';
            ctx.lineWidth = Math.max(.6, this.dpr * .9);
            ctx.beginPath();
            ctx.moveTo(lx * r * 1.6 - ly * r * 1.6, ly * r * 1.6 + lx * r * 1.6);
            ctx.lineTo(lx * r * 1.6 + ly * r * 1.6, ly * r * 1.6 - lx * r * 1.6);
            ctx.stroke();
            ctx.restore();
          }
          if (r > 2.4) {
            // a couple of shadowed pits, deterministic per rock
            ctx.fillStyle = 'rgba(10,14,22,.55)';
            for (let k = 0; k < a.pits.length; k++) {
              const q = a.pits[k];
              ctx.beginPath(); ctx.arc(q[0] * r, q[1] * r, q[2] * r, 0, 6.2832); ctx.fill();
            }
          }
          ctx.restore();
        }
      };

      for (let b = 0; b <= objs.length; b++) {
        drawDust(dbk[b]); drawStars(buckets[b]); drawAst(abk[b]);
        if (b < objs.length) {
          const o = objs[b];
          if (o.a < 0.01) continue; // not this body's beat yet (or already past)
          ctx.globalAlpha = o.a;
          if (o.t === 'p') this.drawPlanet(ctx, o.o, o.s, foc);
          else if (o.t === 'core') this.drawCore(ctx, o.s, foc);
          ctx.globalAlpha = 1;
        }
      }

      /* the origin resolves into the mark: billboarded at the base of the
         stream, sized off the origin's radius — the logo the whole descent
         has been falling toward, standing alone with no shape around it.

         POLISH Job G — the mark now draws at the same atmospheric grade as
         the core and planets:
         1. Wide deep-space corona (matching the core's outer atmosphere).
         2. Tight near-white crescent bloom biased upper-left, consistent
            with the light direction every other body obeys.
         3. Six concentric arcs with a conic-gradient light bias (the same
            orbital shell language as the core — the mark is an origin, not
            a logo on a page).
         4. The SVG is composited TWICE: first with 'lighter' at reduced
            opacity for a luminous glow, then with 'source-over' for full
            crisp detail — so the mark radiates rather than sits flat.
         All layers use the existing mA entrance fade; no new state. */
      if (this.markImg.complete && this.markImg.naturalWidth) {
        const fRaw = Math.max(0, Math.min(7, p * 7));
        const mA = clamp((fRaw - 5.5) / 0.5, 0, 1);
        if (mA > 0.01) {
          const s = proj(0, this.origin.y, 0);
          if (s) {
            /* capped so the origin beat composes instead of flooding the
               frame — this is the frame the descent now HOLDS on, so the cap
               is the final composition, not a moment passed through */
            const rpx = Math.min(foc * this.origin.r / s[2], H * 0.26, W * 0.40);
            /* portrait: clamp the centre so the whole mark stays on screen —
               a cropped logo is worse than a recomposed one */
            const mcx = portrait ? clamp(s[0], rpx + W * 0.05, W - rpx - W * 0.05) : s[0];
            const mcy = s[1];
            const mw = rpx * 2, mh = mw * (830 / 1030);

            ctx.globalCompositeOperation = 'lighter';

            /* layer 1: wide deep-space corona — the same outer atmosphere
               radius as the core's second bloom layer (2.7r) */
            const bx = mcx - rpx * 0.20, by = mcy - rpx * 0.06;
            let g = ctx.createRadialGradient(bx, by, rpx * 0.70, bx, by, rpx * 2.7);
            g.addColorStop(0,    'rgba(120,170,255,' + (mA * 0.36).toFixed(3) + ')');
            g.addColorStop(0.22, 'rgba(88,140,245,'  + (mA * 0.14).toFixed(3) + ')');
            g.addColorStop(1,    'rgba(58,100,200,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(bx, by, rpx * 2.7, 0, 6.2832); ctx.fill();

            /* layer 2: tight near-white crescent bloom — upper-left bias
               matching the scene's shared light direction */
            const tx = mcx - rpx * 0.28, ty = mcy - rpx * 0.08;
            g = ctx.createRadialGradient(tx, ty, rpx * 0.78, tx, ty, rpx * 1.42);
            g.addColorStop(0,   'rgba(190,218,255,' + (mA * 0.30).toFixed(3) + ')');
            g.addColorStop(0.4, 'rgba(130,180,255,' + (mA * 0.10).toFixed(3) + ')');
            g.addColorStop(1,   'rgba(88,140,240,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(tx, ty, rpx * 1.42, 0, 6.2832); ctx.fill();

            /* layer 3: concentric orbital arcs with conic-gradient light
               bias — the same shell language as the core */
            ctx.lineWidth = Math.max(0.5, rpx * 0.010);
            let arcG = null;
            if (ctx.createConicGradient) {
              const la = Math.atan2(-0.10, -0.34); // same light angle as core
              arcG = ctx.createConicGradient(la, mcx, mcy);
              const HW = 2.27;
              for (let i = 0; i <= 20; i++) {
                const ti = i / 20;
                const ang = Math.min(ti, 1 - ti) * 6.2832;
                const aa = Math.pow(Math.cos(Math.min(1, ang / HW) * Math.PI / 2), 1.6);
                arcG.addColorStop(ti, 'rgba(160,196,255,' + (aa * mA).toFixed(3) + ')');
              }
            }
            for (let k = 1; k <= 6; k++) {
              const rr = rpx * (1.05 + k * 0.16);
              const base = (arcG ? 0.13 : 0.065) / (1 + k * (arcG ? 0.45 : 0.60));
              if (arcG) { ctx.globalAlpha = base * mA; ctx.strokeStyle = arcG; }
              else ctx.strokeStyle = 'rgba(150,186,248,' + (base * mA).toFixed(4) + ')';
              ctx.beginPath(); ctx.arc(mcx, mcy, rr, 0, 6.2832); ctx.stroke();
            }
            ctx.globalAlpha = 1;

            /* layer 4a: the SVG itself drawn with 'lighter' first — this
               makes the mark glow as if it is emitting light rather than
               sitting on top of the field */
            ctx.globalAlpha = mA * 0.55;
            ctx.drawImage(this.markImg, mcx - mw / 2, mcy - mh / 2, mw, mh);

            /* layer 4b: full crisp draw on top for definition */
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = mA;
            ctx.drawImage(this.markImg, mcx - mw / 2, mcy - mh / 2, mw, mh);
            ctx.globalAlpha = 1;
          }
        }
      }

      // atmosphere wash — entering a world's orbit
      const tints = { basalt: '120,138,168', clouds: '178,196,226', fissure: '108,150,222', ice: '150,182,235' };
      for (const pl of this.planets) {
        const dd = Math.hypot(pl.x - ex, pl.y - ey, pl.z - ez) - pl.r;
        const w = Math.max(0, 1 - dd / (2.6 + pl.r * 3));
        if (w <= 0.001) continue;
        const s = proj(pl.x, pl.y, pl.z);
        const gx = s ? s[0] : cx, gy = s ? s[1] : cy;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 1.05);
        g.addColorStop(0, 'rgba(' + tints[pl.kind] + ',' + (w * w * 0.20).toFixed(3) + ')');
        g.addColorStop(.55, 'rgba(' + tints[pl.kind] + ',' + (w * w * 0.07).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + tints[pl.kind] + ',0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      // grain + vignette
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.055 * this.grainAmt;
      const gs = this.grain.width;
      const gox = REDUCED ? -37 : -Math.random() * gs, goy = REDUCED ? -59 : -Math.random() * gs;
      const pat = ctx.createPattern(this.grain, 'repeat');
      ctx.save(); ctx.translate(gox, goy); ctx.fillStyle = pat; ctx.fillRect(0, 0, W + gs, H + gs); ctx.restore();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    trueDist(o) { const e = this.eyeP; return Math.max(0.2, Math.hypot(o.x - e[0], o.y - e[1], o.z - e[2])); }
    drawPlanet(ctx, pl, s, foc) {
      if (!pl.sprite) return; // still rendering in the deferred queue
      const r = foc * pl.r / this.trueDist(pl);
      if (r < .4) return;
      ctx.globalCompositeOperation = 'lighter';
      /* POLISH Job D: two-layer bloom, as drawCore has — a tight near-white
         sheet biased onto the crescent, then the wide blue atmosphere. Job A
         gave the worlds a single centred blob, which lit the DARK side as
         much as the lit one and flattened every body it touched. */
      const tint = pl.kind === 'fissure' ? '110,155,235' : pl.kind === 'clouds' ? '150,180,235' : '120,155,215';
      // crescent sits back-left, so the bloom's hot centre goes with it
      const hx = s[0] - r * .52, hy = s[1] - r * .16;
      const tr = r * 1.62;
      let g = ctx.createRadialGradient(hx, hy, r * .55, hx, hy, tr);
      g.addColorStop(0, 'rgba(206,226,255,' + (pl.kind === 'clouds' ? .17 : .13) + ')');
      g.addColorStop(.45, 'rgba(150,186,248,.05)');
      g.addColorStop(1, 'rgba(120,160,230,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, tr, 0, 6.2832); ctx.fill();
      const gr = r * (pl.kind === 'fissure' ? 3.6 : pl.kind === 'clouds' ? 3.0 : 2.4);
      g = ctx.createRadialGradient(s[0] - r * .35, s[1] - r * .3, 0, s[0], s[1], gr);
      g.addColorStop(0, 'rgba(' + tint + ',' + (pl.kind === 'clouds' ? .16 : .12) + ')');
      g.addColorStop(1, 'rgba(' + tint + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], gr, 0, 6.2832); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      const d = r / 0.68;
      ctx.drawImage(pl.sprite, s[0] - d, s[1] - d, d * 2, d * 2);
    }

    drawCore(ctx, s, foc) {
      /* Job F: the core's pixels come from a file now, so — exactly as for the
         worlds — there is a window before it has any. Without this guard the
         drawImage below throws every frame into loop()'s catch. */
      if (!this.core.sprite) return;
      const r = foc * this.core.r / this.trueDist(this.core);
      if (r < .5) return;
      ctx.globalCompositeOperation = 'lighter';
      /* POLISH: concentric shells live on the GLOW side, as in the reference
         plate — alpha falls off with angle from the light. Conic gradients
         where supported; the old uniform rings as the fallback. */
      ctx.lineWidth = Math.max(.5, r * .012);
      let arcG = null;
      if (ctx.createConicGradient) {
        const la = Math.atan2(-.10, -.34); // screen-space light direction
        arcG = ctx.createConicGradient(la, s[0], s[1]);
        const HW = 2.27; // rad — arcs die out ~130° off the light
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          const ang = Math.min(t, 1 - t) * 6.2832;
          const aa = Math.pow(Math.cos(Math.min(1, ang / HW) * Math.PI / 2), 1.6);
          arcG.addColorStop(t, 'rgba(150,186,248,' + aa.toFixed(3) + ')');
        }
      }
      for (let k = 1; k <= 8; k++) {
        const rr = r * (1.0 + k * 0.135);
        const base = (arcG ? 0.16 : 0.085) / (1 + k * (arcG ? 0.42 : 0.55));
        if (arcG) { ctx.globalAlpha = base; ctx.strokeStyle = arcG; }
        else ctx.strokeStyle = 'rgba(150,186,248,' + base.toFixed(4) + ')';
        ctx.beginPath(); ctx.arc(s[0], s[1], rr, 0, 6.2832); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      /* POLISH: two-layer bloom — a tight, near-white sheet hugging the
         crescent, then the wide electric-blue atmosphere */
      const tx = s[0] - r * .30, ty = s[1] - r * .09;
      let g = ctx.createRadialGradient(tx, ty, r * .84, tx, ty, r * 1.38);
      g.addColorStop(0, 'rgba(170,208,255,.28)');
      g.addColorStop(.4, 'rgba(112,168,255,.11)');
      g.addColorStop(1, 'rgba(84,138,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, r * 1.38, 0, 6.2832); ctx.fill();
      const bx = s[0] - r * .34, by = s[1] - r * .10;
      g = ctx.createRadialGradient(bx, by, r * .80, bx, by, r * 2.7);
      g.addColorStop(0, 'rgba(126,176,255,.46)');
      g.addColorStop(.20, 'rgba(88,140,245,.17)');
      g.addColorStop(1, 'rgba(58,100,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r * 2.7, 0, 6.2832); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      const d = r / 0.68;
      ctx.drawImage(this.core.sprite, s[0] - d, s[1] - d, d * 2, d * 2);
    }

  }

  new Worlds();
})();
