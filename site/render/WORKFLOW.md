# How to build HD assets for this website

The short version: **your Mac makes the pictures, the website plays them.** The browser
never renders 3D, so there is no quality ceiling — the site looks exactly as good as Blender
can make it.

---

## The one rule

| If it must… | Then… |
|---|---|
| look photoreal | render it in Blender **before** the site ships |
| react to the user (hover, click, drag) | render it live in the browser |

Never ask a browser to do photoreal. It cannot, and no amount of code changes that.

---

## The five steps

**1. Write the story first.** What the camera does, and what words appear when. Decide the
beats before anything is rendered, because changing the camera later means rendering again.

**2. Get the asset right.** This is where quality is won or lost, before a line of code
exists. See *What to demand from a 3D asset* below.

**3. Lock the camera move.** It lives in one place — the `PATH` list at the top of
`render/scene.py` — and the same numbers drive both the render and the site.

**4. Render the sequence.**

```sh
# one frame, to check the look (fast)
blender -b -P render/scene.py -- --at 0.5 --out render/look --width 1920 --samples 64

# the whole move
blender -b -P render/scene.py -- --frames 120 --out render/seq --width 2560 --samples 80
```

**5. Process for the web, then it just works.**

```sh
node render/frames.mjs render/seq     # bloom, two sizes, WebP, manifest
```

The site reads `assets/film/manifest.json` and plays whatever is there. No code change
needed when you re-render.

---

## What to demand from a 3D asset

Paste this at whoever makes the model. It is the single most valuable thing on this page.

> 4K PBR texture set: **base colour** (PNG, or JPEG quality 95+, no chroma subsampling),
> **normal**, **roughness**, **metallic**, **ambient occlusion**. Clean non-overlapping UVs.
> Real-world scale. Export as glTF/GLB with all maps attached.

The current suit ships **base colour only**, at 0.515 bits/pixel with 4:2:0 chroma — about a
third of the data a 4K albedo should carry. Every other surface property is either a flat
number or something derived at build time by `tools/surface.mjs`. Supplying the four missing
maps would improve the render more than any other single change.

---

## Numbers worth remembering

| | |
|---|---|
| Frames for a full-page scroll | 120–250 (120 is smooth; more is smoother) |
| Render time, M5 Max | ~10 s/frame at 2560×1440, 80 samples |
| Shipped weight | ~20–30 MB desktop, ~8 MB phone |
| Samples | 64 for checks, 80–128 final (the denoiser does the rest) |

---

## What this costs you

The camera path is **fixed**. Visitors cannot orbit the model, and any change to the move
means re-rendering. That is the trade for unlimited quality, and it is the same trade the
Bloom reference makes with its video, and the same one the previous ZeroPoint site made with
its 489-frame sequence.

---

## The activation beat

`activation(p)` in `render/scene.py` ramps 0 → 1 over the first sixth of the scroll and
drives the visor, the body tracery and the chest mark. At `p = 0` he is dormant: dead eyes,
cold gunmetal, rim lights at 10%. By `p = 0.16` he is fully powered.

Because this is baked per frame, it is real light in the render — it throws illumination onto
the surrounding armour and blooms in the post-process. A CSS filter could not do that.

To change how he wakes, edit that one function and re-render.


---

## The backdrop

Built into the render, not layered behind it, so it lights the suit, shows up in his
reflections, and falls into the same depth of field. Anything composited behind the frames
would read as pasted on.

It is deliberately **sparse and asymmetric**: seven irregular light columns, not a colonnade.
Sixteen evenly spaced ones read as a barcode behind him; seven irregular ones read as depth.
They are weighted to screen-right because the hero card sits bottom-left and needs dark ground
under it, plus 150 motes that the f/1.8 aperture turns into soft discs.

The hall powers up with him — it is his infrastructure, so it should not already be on.

Two things had to be got right, both visible in one test frame:

- **Brightness.** At full power the columns blew out to white and stayed hard-edged: their own
  brightness overwhelmed the depth of field, so they read as fluorescent tubes in the room
  rather than a hall behind him. They now sit about a tenth of that.
- **Aperture.** f/4 was not enough separation. f/1.8 lets the lens do the work instead of
  dimming things until they disappear.
