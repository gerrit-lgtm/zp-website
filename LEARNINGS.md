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
