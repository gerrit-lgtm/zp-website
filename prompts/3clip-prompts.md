# Master Prompt Suite & Video Generation Index — ZeroPoint 3D Helix

This document indexes the exact Kling 3.0 video generation chain executed via Magnific MCP and provides the **Ultra-High-Power 3D Camera Prompts** for maximum volumetric fidelity and continuous spatial movement.

---

## 1. Indexed Video Generation Record

| Clip | Segment Name | Creation ID | Source Start Frame | Source End Frame | Video File Path |
|---|---|---|---|---|---|
| **G1** | `03-base-team` | `xg1fEtGjfW` | `LUxEa7PswO` (Still B) | `0pWNzIjTfW` (`g1-last.png`) | [`video-pipeline/in/g1.mp4`](file:///Users/gerritsteenkamp/Desktop/Antigravity%20playground/ZP%20Website/video-pipeline/in/g1.mp4) |
| **G2** | `02-galaxy-mid` | `NZ4LOpu6D9` | `0pWNzIjTfW` (`g1-last.png`) | `e8DAo0xdqL` (`g2-last.png`) | [`video-pipeline/in/g2.mp4`](file:///Users/gerritsteenkamp/Desktop/Antigravity%20playground/ZP%20Website/video-pipeline/in/g2.mp4) |
| **G3** | `01-summit-enterprise` | `629l2n8iJO` | `e8DAo0xdqL` (`g2-last.png`) | `iANg2iU3uK` (Still A: `CI/Landing.png`) | [`video-pipeline/in/g3.mp4`](file:///Users/gerritsteenkamp/Desktop/Antigravity%20playground/ZP%20Website/video-pipeline/in/g3.mp4) |

* **Total WebP Frames Extracted**: 360 Desktop (1920w) + 180 Mobile (1280w), reversed for backward descent playback.

---

## 2. Ultra-High-Power 3D Camera Prompts (Kling 3.0 / Seedance 2.0 / Veo 3.1)

### Technical Generation Parameters
* **Engine**: Kling 3.0 (`kling-30`)
* **Duration**: 15 seconds
* **Resolution**: 1080p (16:9)
* **Audio**: OFF
* **Look Bible Constraints**: Deep Peacoat Navy `#192231`, Surf Navy `#1D3557`, Dazzling Blue `#2B579A`, Platinum White `#F4F4F0`. Zero neon, zero purple/teal/orange kitsch, zero text overlays.

---

### PROMPT G1: Base Ring Lift-Off $\rightarrow$ Lower Orbital Arc (World 04 Team Base)

* **Start Image Anchor**: `video-pipeline/chain/still-b-arrival.png` (Platinum Ring of Light).
* **End Image Anchor**: `video-pipeline/chain/g1-last.png` (Keyframe 2).
* **Enhanced Master Prompt**:
```
A monumental 15-second cinematic IMAX 8K shot. The camera lifts off vertically from a glowing platinum ring of white starlight (#F4F4F0) with cold gold rim reflections resting at the base of a vertical starlight spine in deep peacoat navy space (#192231). The camera executes a wide, continuous 360-degree helical orbital arc around the central vertical axis, ascending smoothly through volumetric starlight dust and floating dark metallic geometric structures. The camera angle is pitched upward at 45 degrees, continuously tracking back toward the upper-center singularity where a distant black hole glows with thin blue rim light above. Photon volumetric rays, high dynamic contrast, zero camera shake, hyper-photorealistic 24fps movement, pristine depth of field.
```

---

### PROMPT G2: Mid-Galaxy 360° Helical Orbit (Worlds 02 & 03: Consulting & AI Factory)

* **Start Image Anchor**: `video-pipeline/chain/g1-last.png` (Keyframe 2).
* **End Image Anchor**: `video-pipeline/chain/g2-last.png` (Keyframe 1).
* **Enhanced Master Prompt**:
```
A 15-second continuous sweeping orbital camera movement in deep surf navy space (#1D3557). The camera spirals in a full 360-degree wide helical trajectory circling around a monumental vertical pillar of white starlight. As the camera ascends, architectural ribbons of cyan bioluminescent light weave around floating hexagonal crystalline rock clusters and metallic asteroids. The camera remains locked on a backward-pitch orientation, gazing up the central axis toward the massive aperture black hole hanging at the top of the universe. Deep volumetric depth, crisp specular highlights on dark obsidian surfaces, cinematic motion blur, zero cuts, photorealistic rendering.
```

---

### PROMPT G3: Summit Ascent $\rightarrow$ High-Left Entry $\rightarrow$ Black Hole Aperture Core

* **Start Image Anchor**: `video-pipeline/chain/g2-last.png` (Keyframe 1).
* **End Image Anchor**: `video-pipeline/chain/still-a-hero.png` / `CI/Landing.png` (Black Hole Singularity).
* **Enhanced Master Prompt**:
```
A 15-second master cinematic finale shot ascending along the central starlight spine in deep peacoat navy space (#192231). The camera spirals upwards in a wide 360-degree arc through a cold electric-blue geometric lattice of sovereign light (#2B579A). The camera trajectory sweeps high to the upper-left limb of the colossal black hole singularity, gracefully curving around its dark left edge, and smoothly accelerating into a direct forward zoom into the central dark aperture vortex. Five colossal dark blades rotate slowly with razor-thin electric blue rim lighting until the aperture core fills the frame. Flawless 3D camera trajectory, high-contrast IMAX photography, photorealistic execution, zero text.
```

---

## 3. Automation Execution Commands

To re-run the frame extraction and site update pipeline at any time:
```bash
python3 video-pipeline/process_python.py g1 g2 g3
```
This automatically updates `assets/frames/` and re-indexes the live canvas scrub engine.
