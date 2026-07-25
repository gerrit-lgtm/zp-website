# The Sovereign Core — 3D build brief
*For modelling the production object that replaces the procedural gray-box in `assets/js/zp-core.js`. 25 Jul 2026.*

---

## 0. Why the current object reads wrong

The Phase 1 prototype proved the *system* (occlusion, agency, continuity). It did
not solve the *object*. Five specific failures, all fixable in the model:

1. **It's a logo extruded, not a machine.** Flat blades, no pivots, no mechanism.
   Vector art with depth is not an object.
2. **No scale cues.** No panel gaps, chamfers, fasteners or grating, so the eye
   cannot decide whether it is 10cm or 10m. It floats as a toy.
3. **One material for everything.** Shell, blades and nodes are the same blue-grey.
   Nothing reads as metal, glass, or composite.
4. **Generic octahedrons don't say "compute."** They say "particle system."
5. **The world contradicts the copy.** Starfields say *futuristic*. The copy says
   *sovereign, air-gapped, contained, owned*. Cosmic imagery is actively working
   against the business.

---

## 1. The paste-able prompt

> A single machined containment vessel, roughly one metre across, photographed as
> a product hero. Circular silhouette built from overlapping armour plates with
> recessed seams and chamfered edges — a bank-vault door wrapped onto a sphere,
> not a smooth ball. Its front face is a five-bladed mechanical iris: the blades
> are thick machined plates, each on a visible pivot boss, overlapping in true
> iris order, and when fully closed their silhouette forms a clean aperture mark.
> Behind the iris a deep cylindrical throat recedes into the body, lined with fine
> heat-sink ribs, and at the bottom of the throat sits one small, intensely bright
> point of cold blue light. Materials: dark basalt-grey anodised metal on the
> plates, brushed cold steel on the blade edges and bevels, matte black composite
> in every recess. Lighting: one cold directional key from upper-left, deep shadow
> elsewhere, almost no fill. Fine detail purely for scale: hairline panel gaps,
> micro-fasteners, a small etched serial on one plate. Restrained, engineered,
> heavy, expensive.
>
> Negative: no neon, no glow wash, no bloom, no cyberpunk, no purple or teal or
> orange, no nebulae, no visible screens or UI, no exposed wiring or cables, no
> chrome, no sci-fi kitsch, no robots, no floor, no ground plane, no text.

Use this for concept frames first. Approve the *look* before modelling.

---

## 2. The concept, in words

The tension the object has to hold is **containment vs. capability**: a sealed
vault that computes. Everything below serves that one sentence.

**Outer shell.** Not a smooth sphere — a sphere is the laziest primitive and reads
as a demo. Build the circular silhouette out of discrete overlapping armour
plates with recessed seams, like a vault door wrapped onto a ball. Panels imply
assembly; assembly implies engineering. The *silhouette* stays circular because
the logo's outer ring is the zero.

**The iris is the face.** Five blades, thick machined plates — not paper. They
overlap in true iris order (each blade's trailing edge under the next one's
leading edge, consistently around the ring). Each blade has a **visible pivot
boss** where it meets the shell. Closed, the silhouette must be *exactly* the CI
mark from `assets/logo/mark.svg`. This is non-negotiable: the whole arrival beat
depends on the visitor recognising it.

**The throat.** Behind the iris, a cylindrical shaft recedes ~0.5 units into the
body, lined with fine radial heat-sink ribs. This is what gives the object
interior depth when the iris opens, and it is where "this thing dissipates real
heat" gets communicated.

**The optic.** At the bottom of the throat, one small, intensely bright cold-blue
point. Small. This is zero point. Resist making it big — the current prototype's
flat pale disc is the failure mode.

**The lattice — replace the octahedrons.** Model **one compute card**: a thin
rectangular board with a heat-spreader, an edge connector, and a few surface
components. It gets instanced 96× by the engine into a sphere / spine / four
modules / a ring. A card array reads as *compute*; floating diamonds read as
*magic*. Keep it under 500 tris; it is drawn 96 times.

**Scale cues, everywhere.** Hairline panel gaps (~0.002 units), chamfered edges
on every hard corner, micro-fasteners at plate corners, a fine grating somewhere,
and one small etched wordmark or serial. Without these it will still read as a
toy no matter how good the topology is.

---

## 3. Technical spec — this is what makes it drop in

Get these wrong and the model needs a code rewrite. Get them right and the swap
is one loader call.

### Scale, orientation, origin

| | |
|---|---|
| Units | Shell **radius exactly 1.0** (diameter 2.0). Everything scales from this. |
| Up axis | **+Y** |
| Front | Iris faces **+Z** |
| World origin | Centre of the shell |
| Iris plane | XY, seated at **z = +0.68** |
| Iris radius | **0.71** (blade tips land on the shell surface: √(1−0.71²) ≈ 0.70) |
| Throat depth | ~0.5 back from the iris plane |
| Applied transforms | All. No unapplied scale/rotation on any mesh. |

### Blade pivots — the single most important detail

Each blade's **object origin must sit on its pivot boss**, on the aperture axis
circle — *not* at the mesh centroid, and *not* at the world origin.

The engine opens the iris with, per blade:

```js
blade.rotation.z = baseRot + openness * 0.62;        // rotate about the aperture axis
blade.position.copy(blade.userData.dir).multiplyScalar(openness * 0.5);  // retract radially
```

If the origin is at the centroid, the blades will orbit instead of pivoting and
the iris will visibly break. Set each origin, then verify by rotating one blade
±35° about local Z in Blender: the leading edge should sweep the aperture, the
pivot end should stay put.

### Separable shell — the AI Factory beat needs this

The factory state pulls the core apart into four named layers. So the shell must
be modelled as **four latitudinal bands**, not one watertight mesh:

| Mesh | Business layer |
|---|---|
| `ZP_Shell_L1` | Compute (bottom) |
| `ZP_Shell_L2` | Deployment |
| `ZP_Shell_L3` | Software |
| `ZP_Shell_L4` | Data (top) |

Each band needs its own origin at **its own centre of mass on the Y axis**, so it
can slide apart along Y without swinging. These names match the four cards in
[`lab.html`](../lab.html) — copy and object must corroborate.

### Required mesh names

The engine looks these up by name. Exact strings:

```
ZP_Shell_L1  ZP_Shell_L2  ZP_Shell_L3  ZP_Shell_L4
ZP_Blade_1   ZP_Blade_2   ZP_Blade_3   ZP_Blade_4   ZP_Blade_5
ZP_Throat
ZP_Optic
ZP_Card            (single compute card — engine instances it 96×)
ZP_Detail_Fine     (optional: fasteners/grating merged into one mesh)
```

Blades numbered **clockwise viewed from +Z**, starting at 12 o'clock.

### Budget

| | |
|---|---|
| Total | 120k–200k tris before compression |
| `ZP_Card` | **< 500 tris** (instanced 96×) |
| Draw calls | Keep distinct materials to ≤ 6 |
| Textures | 2K max, KTX2/Basis on export |
| Normal maps | Bake the fine detail — model it, then bake, don't ship the high-poly |

### Export

- **GLB**, +Y up, Draco or Meshopt compression
- Materials as **glTF PBR metallic-roughness** (Principled BSDF only — no
  procedural node trees, they don't export)
- **No baked lighting in base colour.** The engine lights it; the CI's single
  cold key from upper-left is applied at runtime plus a camera-relative rim.
- Bake AO to a separate channel, not multiplied into albedo

---

## 4. Materials — CI-bound

Blue is highlight/interactive **only**. Everything else is metal and shadow.

| Part | Base colour | Metalness | Roughness | Note |
|---|---|---|---|---|
| Shell plates | `#141C28` basalt | 0.65 | 0.40 | anodised, slightly directional |
| Plate recesses | `#0A0E14` | 0.20 | 0.85 | matte composite, kills reflection |
| Blade faces | `#18202E` | 0.70 | 0.35 | |
| Blade bevels | `#5A6F8A` stormy | 0.90 | 0.18 | brushed steel — this is the edge highlight |
| Throat ribs | `#0E141D` | 0.55 | 0.55 | |
| Optic | `#3E6FBF` lift | 0.30 | 0.20 | emissive, driven by the engine |
| Card board | `#101822` | 0.30 | 0.70 | |
| Card heat-spreader | `#75787B` cool gray | 0.85 | 0.30 | |

**Banned** (straight from the CI): neon, cyberpunk, purple/teal/orange, nebulae,
oversaturation, sci-fi kitsch, chrome, visible screens.

---

## 5. The world — a separate decision, and my recommendation

The object brief above stands whatever you choose here, so this doesn't block
modelling. But it is the thing you're actually feeling.

**Recommendation: drop deep space. Put the core in a void.**

Cosmic imagery communicates *futuristic*. Your copy communicates *sovereign,
air-gapped, contained, owned*. A starfield actively undercuts "your data never
leaves this boundary" — space is the least contained environment there is.

What replaces it: near-black volumetric darkness, one cold key from upper-left,
a horizon you can *infer* but never see, and a faint ground grid that only
resolves under the object — an infinite dark facility, not a galaxy. This is
exactly the CI photography rule already written down (high contrast, single
directional light, blue as ambient/rim only, restrained grading), which the
cosmic direction has been quietly violating.

**Cost of this choice:** it retires the HELIX four-planets-on-a-helix vista and
the black-hole hero. That's a real loss of spectacle and a real amount of prior
work. The gain is that every frame starts arguing for the business instead of
just looking expensive.

**If you keep space**, then the planets must become *infrastructure* — each one a
sovereign installation, not a rock — or the disconnect stays.

---

## 6. Sequence

1. Generate 3–5 concept frames from §1. Approve the look before modelling.
2. Block out at low poly, correct dimensions and **pivots** (§3). Export a GLB.
3. Send it back — I swap it into the existing hierarchy. If §3 is right this is a
   loader call, not a rewrite, and every state/camera/interaction still works.
4. Iterate on art with the real choreography running underneath, not in isolation.
5. Only then: high-poly detail, bakes, KTX2, compression.

Do **not** detail before step 3. The gray-box exists so the object can be judged
in motion, at the real camera distances, with the copy on top of it.
