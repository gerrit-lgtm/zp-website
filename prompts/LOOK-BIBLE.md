# Look Bible — paste this block at the END of every Kling prompt

This block makes all five clips and both stills grade identically. Never change it between segments. If you edit it once, re-check every prompt file still fits Kling's 2500-character limit.

---

**THE BLOCK (copy exactly):**

Ultra-realistic cinematic deep-space photography, IMAX documentary style. Space is very dark navy, almost black, never pure black. One single distant cold key light; thin cold blue rim light on edges only. Restrained monochrome navy palette, deep shadows, high contrast, subtle fine film grain. Buttery smooth, slow, weightless, constant camera motion; one continuous shot, no cuts, no scene changes. Main subject stays inside the central 60% of the frame. No neon colours, no purple, teal or orange nebulae, no lens flares, no text, no logos, no spaceships, no planets with visible cities, no cartoon or fantasy look, no oversaturation.

---

(~700 characters. Each segment prompt in this folder already includes it — the files are copy-paste ready.)

## Why these rules (CI mapping)

- "very dark navy, almost black" → Peacoat #192231, the 60% primary background
- "thin cold blue rim light on edges only" → Dazzling Blue #2B579A used as highlight only, and the CI photography rule "use blue only as reflected or ambient light"
- "no neon / cyberpunk / oversaturation" → straight from the CI photography DON'T list
- "central 60% safe zone" → mobile crops from the same 16:9 frames
- grain + directional light + high contrast → CI photography DO list

## Kling settings for every generation

| Setting | Value |
|---|---|
| Model | Kling 3.0 |
| Duration | 15" |
| Aspect | 16:9 |
| Resolution | 1080p |
| Audio | **OFF** (frames only; audio can alter pacing) |
| Start/End image | per segment file |
