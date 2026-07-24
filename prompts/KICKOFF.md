# KICKOFF — paste this into a new Claude Code session (this same project)

*Run in Claude Code, in the `ZP Website` folder, with the Magnific connector authorized (it already is in this project). Model: **Opus 4.8** (`/model opus`), Fast mode on (`/fast`). This is agentic MCP orchestration + visual judgement + a little code — a frontier model is the job; Fable 5 works equally well if you prefer.*

---

You are executing the **HELIX v2** asset generation for the ZeroPoint immersive site. Everything is already specified — your job is to follow the spec exactly and generate the assets, not redesign anything.

**Read these first, in full:**
- `prompts/HELIX-V2.md` — the master spec: the diagnosis (§0), camera path (§1), the five keyframes K0–K4 and their exact image prompts (§4), the four video legs V1–V4 (§5), the keyframe contract (§3), and the step-by-step workflow (§6). This is your source of truth.
- `LEARNINGS.md` — operational constraints. Read the "Magnific / Freepik MCP" section carefully.
- `PLAN.md` — bottom change-log entry lists the five v2 decisions. Treat them as approved (Gerrit has signed off).

**HARD RULES — breaking these wastes money or kills the connection:**
1. Run `simulate_cost` before EVERY generation. Report the cost and wait for my explicit "go" before the first image, and again before the first video.
2. Fire **ONE** MCP generation call at a time. Never two in parallel — it has crashed the connector before.
3. You **cannot download files to disk** (the Freepik CDN is blocked from your sandbox). So: when an asset is a keeper, show it to me inline with `creations_show` and give me its `webUrl`. I will download the four video MP4s into `video-pipeline/in/` as `v1.mp4 … v4.mp4` and the five keyframe PNGs into `video-pipeline/chain/` myself. You keep chaining keyframes by **creation identifier**, so you don't need them on disk to proceed.
4. **Models:** stills = `imagen-nano-banana-2` (Nano Banana Pro), aspect 16:9, resolution 4K. Video = `bytedance-seedance-pro-2.0` (Seedance 2.0 Pro), start+end keyframes, `cameraMotion: orbitLeft`, 10s, 16:9, 1080p, audio OFF.

**SEQUENCE — stop at every ⛔ and wait for me:**

- **A.** Find my uploaded CI cover in the Freepik library (`library_show`/`creations_search` — it's the locked "Still A" hero). If you can't find it, ask me to upload `CI/Landing.png` via the inline upload widget.
- **B.** Generate **K0** (hero) exactly per HELIX-V2 §4, using the CI cover as the image reference (instruction: restage that object in true deep space, remove the floor/fog, add the faint helix below). Show it inline. ⛔ **Wait for my approval — every other frame inherits from this one.**
- **C.** Generate **K1 → K2 → K3 → K4** in order, each with the PREVIOUS approved keyframe attached as a reference image (this is what makes it one world, not five pictures). Use each keyframe's §4 prompt verbatim. Show each inline; ⛔ approve each before starting the next.
- **D.** Once K0–K4 are approved: `simulate_cost` then optionally ultra-photo 2× upscale each. Tell me to download them as `chain/K0-hero.png … K4-vista.png`, and export text-free crops to `assets/img/poster-k0.png` and `poster-k4.png`.
- **E.** Generate **V1–V4** per HELIX-V2 §5 (one at a time), each pinned start+end to the keyframes in the §3 table, with the §5 positive style block in the prompt. Show each inline. ⛔ I judge and download keepers to `video-pipeline/in/`.
- **F.** When `v1.mp4 … v4.mp4` are in place: run `python3 video-pipeline/process_python.py` (it validates, reverses, substitutes keyframes, warns on seam drift, writes manifests). Then set `const ACTIVE = HELIX_V2;` in `assets/js/site.js`. Tell me to preview with `python3 -m http.server`.

**Judge every take against §5 "judging a take":** reject on sight of ANY box / crate / window / polyhedron / neon / teal; the stellar stream must read as pinpoint stars, not a searchlight beam; planets must be round and cratered or cloud-banded, never faceted. Play each clip backwards in your mind — that's what visitors see.

Start by reading the three files and confirming the plan back to me in a few lines, then begin at step A.
