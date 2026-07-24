# Generation Workflow — HELIX (v1.1) — do these in order

The journey is generated as an ASCENT (bottom → summit) and played in reverse on the site. Every clip chains off the previous one's real last frame, so **order matters**. Tick as you go.

## Rules that never change

1. Kling 3.0 · 15" · 16:9 · 1080p · **audio OFF**.
2. Prompts are copy-paste whole from the g1–g5 files; the Look Bible is already baked into each.
3. When a take is the keeper: paste the EXACT prompt + date into that file's "Generation log" table. Reproducibility record for miniature updates.
4. Save clips as `g1.mp4` … `g5.mp4` into `video-pipeline/in/`. Stills into `video-pipeline/chain/`.
5. Retry freely — only keepers get logged.

## Steps

- [ ] **1. Still B — ring at the base** (`00-stills.md`). The chain's first domino: it is G1's start image.
- [ ] **2. Still A — the aperture black hole** (`00-stills.md`). Needs the CI cover attached as image reference (`video-pipeline/chain/ci-cover-01.png`). This is the website's opening billboard AND G5's end image.
- [ ] **3. G1 — Base & Team** (`g1-base-and-team.md`). Start image = Still B. → `in/g1.mp4`, then "process g1" (or `./video-pipeline/process.sh g1`) → gives `chain/g1-last.png`.
- [ ] **4. G2 — AI Factory** (`g2-ai-factory.md`). Start image = `chain/g1-last.png`. → process g2.
- [ ] **5. G3 — Consulting & Media** (`g3-consulting-media.md`). Start image = `chain/g2-last.png`. → process g3.
- [ ] **6. G4 — Enterprise** (`g4-enterprise.md`). Start image = `chain/g3-last.png`. → process g4.
- [ ] **7. G5 — Summit / Black hole** (`g5-summit-black-hole.md`). Start image = `chain/g4-last.png`, **End image = Still A**. → process g5.
- [ ] **8. Say "footage is in"** → site build starts.

## Judging a take

- One continuous move, constant slow speed, no cuts, no shake.
- The ending matches the file's "Your last frame must look like" — it's the next clip's doorway.
- Palette: navy/blue-white only. Purple, teal, orange, neon → retry.
- The pillar (spine) stays present — it's the site's constant axis.
- Reversal sanity-check: play the clip and imagine it backwards — that's what visitors see.

## Where to generate

- **Magnific MCP (Claude does it):** hands-free, chained automatically — but consumes credits (unlimited does NOT apply): ~1,350 credits per 15s take.
- **Freepik web UI (you do it):** free under your unlimited plan; follow the same steps, Claude processes each download.

## Miniature updates, months from now

Regenerate one middle clip using its stored `chain/` start PNG as Start image AND its stored last PNG as End image — same doorway in, same doorway out; neighbours stay pixel-perfect. Never delete `video-pipeline/chain/`.
