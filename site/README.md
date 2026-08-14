# ZeroPoint — scroll-over-3D site

Implementation of `ZeroPoint Site Wireframe.dc.html`: one 3D figure fixed in the void,
the site scrolling over it while the camera visits eight stops — face, descent, right
hand (twice), chest, left hand, feet, pull-back.

## Run

```sh
npx http-server -p 4321 -c-1 .     # then open http://127.0.0.1:4321/
```

Any static server works. There is no build step for the site itself — plain HTML, CSS
and ES modules, with `three` vendored under `vendor/three` and wired through an import
map, so it runs offline.

## Layout

```
index.html          eight <section class="beat"> — the copy for each camera stop
css/tokens.css      design-system tokens, verbatim from the ZeroPoint DS project
css/site.css        layout, glass panels, responsive + reduced-motion behaviour
js/rig.js           the camera: wireframe fig-space rects → real model anatomy
js/stage.js         three.js scene, lighting, material recovery, per-stop 3D props
js/main.js          boot + the single scroll → camera/overlay loop
assets/             zp-figure.glb, zp-logo.glb, glow + ORM maps, brand SVGs, og.jpg
build-src/          armored_suit.glb (56 MB source, not served)
tools/              asset pipeline + headless verification
```

## Asset pipeline

The source model is 56 MB / 1.93 M triangles, with a base-colour map and nothing else.
Three build steps make it shippable and make it read as armour rather than grey plastic:

```sh
node tools/optimize.mjs 0.3    # → assets/zp-figure.glb   6.9 MB, 579 k tris
node tools/glowmask.mjs        # → assets/zp-figure-glow.webp
node tools/surface.mjs         # → assets/zp-figure-orm.webp
node tools/brand.mjs           # → brand SVG crops
```

- **optimize** welds, simplifies to 30%, compresses highlights in the base colour (the
  white trim is painted at pure `#FFF`, which floodlights the chest on a black stage),
  re-encodes the texture to WebP, quantises and meshopt-compresses. 8× smaller.
- **glowmask** derives the emissive map the asset never shipped, by isolating the blue
  tracery and white trim already painted into the base colour.
- **surface** derives the roughness/occlusion/metalness the asset never had, from the
  plate shading already painted into the base colour. A normal map was tried here and
  removed: the source is a JPEG, and its compression blocks do not correspond to real
  geometry, so the relief rendered as scratches across the plates.
- **brand** re-windows the one lockup artwork into icon and wordmark crops.

`assets/zp-logo.glb` is the ZeroPoint mark as real geometry (`ZP_LogoRig` → `ZP_Spinner`
→ blades + optic), seated on the chest disc and lit at the WP3 stop.

## Render quality

Six things carry the look, in rough order of how much each one matters:

1. **MSAA on the composer's own target.** `antialias: true` on the renderer is ignored
   the moment `EffectComposer` owns the output, because a composed pipeline never draws
   to the default framebuffer. Miss it and every edge in the frame is aliased.
2. **An environment with shape** — a 1024×512 procedural studio (soft box, two rim
   strips, floor bounce). Metal is defined by what it reflects, so reflecting a flat
   gradient is what makes untextured metal look like plastic.
3. **Shadows, including self-shadowing.** The shoulder plates dropping onto the chest is
   most of what makes armour read as armour; the contact shadow is what stops the figure
   floating. The shadow camera rides with the subject so a 2k map is never spread wider
   than the part of the figure in frame.
4. **GTAO** for crevice depth.
5. **Per-texel roughness** from the ORM map. One flat roughness value is the classic CG
   tell. Metalness stays a flat 0.55 — driving it from the map pushed the plates toward
   chrome, and metal has no diffuse response, so the figure's broad form vanished.
6. **A grade** — S-curve, cool shadow lift, vignette, light grain.

Quality tiers are set in `resize()`: phones render direct with the renderer's own MSAA
rather than paying for GTAO and four full-screen passes. Measured 120 fps (rAF-capped)
through a full scroll sweep at both 1600×900 and 390×844.

Lighting is tuned by eye against rendered frames. `?debug` exposes the stage so
`tools/sweep.mjs` can apply variants live and screenshot each — one boot per sweep.

`tools/landmarks.mjs` re-measures the anatomy the camera aims at (head, chest, palms,
feet) straight off the mesh — run it if the model is ever replaced, and copy the results
into `ANCHORS` in `js/rig.js`.

## How the camera works

The wireframe specifies the ride as eight rects in a flat 1000 × 2200 "figure-space".
`js/rig.js` is the only place that coordinate system meets the model. Two measured
facts convert it: the figure is 1.85 units tall, and its hands sit at z = ±0.353.

The model is not proportioned like the wireframe sketch, so rects are not mapped
straight into world space. Each stop instead preserves the *composition* the storyboard
drew: the offset from the spec's anchor to its rect centre is applied to the real
landmark. Two documented per-stop escapes exist for where sketch and model disagree —
`zoom` (the real boots are far bulkier than the sketch's ellipses) and `nudge` (the
chest disc landed under the eyebrow).

Scroll length is the sum of the beats' own `data-vh` (1,160vh as specified) plus one
viewport of run-out. Each beat arrives at its stop 55% through its range, then holds;
the copy lands as the camera settles and clears the frame before the next move.

## Verification

```sh
node tools/shots.mjs tools/final 1600 900   # one frame per stop, reports console errors
node tools/verify.mjs                       # portrait, reduced-motion, a11y, nav
node tools/nojs.mjs                         # the flat fallback page
```

The site is progressive: `main` is ordinary document flow until the stage comes up, and
only then does `.rig-on` lift it into the fixed overlay. No WebGL or no JS gets a
readable dark page, not a blank one.
