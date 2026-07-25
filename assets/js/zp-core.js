/* ZeroPoint — Sovereign Core, real-time engine v0.1 (Phase 1: prove immersion)
   ---------------------------------------------------------------------------
   Replaces the raster frame-scrub stage with one persistent WebGL object that
   the visitor occupies rather than watches.

   Three ideas the frame scrubber structurally cannot do, and this does:

   1. OCCLUSION. Two canvases sandwich the DOM (bg z0 · copy z10 · fg z20) but
      share ONE camera object, so the foreground ring is genuinely nearer the
      viewer than the core — same projection, real parallax, no faking. A ring
      crosses in front of the H1 while the core stays behind it.

   2. AGENCY. Pointer parallax, pointer-lean on the core, hover raycast, and
      scroll VELOCITY (not just position) feed the scene. The world reacts.

   3. CONTINUITY. One object — the ZeroPoint aperture, extruded from the real
      CI mark.svg — is present from hero to arrival and TRANSFORMS through
      seven named states. The final logo is the same geometry the visitor has
      been flying around the whole time, so it lands as inevitable.

   HELIX-V2 §1 camera math is preserved in spirit (orbit + descent, backward
   gaze, constant screen-left composition bias) but art-directed per state
   instead of run as a pure formula — see CAMERA NOTE below.

   No build step. ESM via importmap, same static-upload deploy as today. */

import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================================================================= CAMERA NOTE
   HELIX-V2 gives  R(t) = R₀·e^(3.7t)  — a 40× pullback ending with the subject
   at ~1.5% of frame. That is correct for a *vista* film and fatal for a
   *protagonist*: an object you cannot see cannot be the backbone of the story.
   So the exponential is replaced by an art-directed R per state. What survives
   (and is what actually sold the spec) is: monotonic orbit, descent, the
   backward-facing gaze, and the composition bias.

   The bias is applied as a constant YAW, not a world-space look-target offset.
   The spec asks for "0.15 frame-widths screen-left"; a world offset would be
   huge at R=0.6 and invisible at R=4.2. A yaw of atan(ndc · tan(hFov/2)) holds
   the subject at the same screen fraction at every radius. */

const STATES = [
  /* θ is monotonic and lands on π/2 + 4π so ARRIVAL is dead-on the aperture
     face — the mark resolves square to camera because the journey put it there,
     not because we cut to it. */
  /* R is in shell-radii. The core is 2.0 across, so R≈6 at fov 34 frames it at
     ~55% of viewport height — the "real object with mass" read. R<1 is
     literally inside the containment shell. */
  { key: "hero",      R: 6.00, th: 1.00,  y: 0.26,  ty: 0.02, fov: 34, bias: 0.20,
    open: 0.00, shell: 1.00, lattice: 0.00, layout: "sphere",  contain: 0.00, explode: 0.00,
    glow: 0.55, scan: 0.0, fgX: -4.50, fgA: 0.35, mark: 0.18, spin: 0.06 },

  { key: "departure", R: 2.00, th: 1.62,  y: 0.10,  ty: 0.00, fov: 40, bias: 0.18,
    open: 1.00, shell: 0.75, lattice: 0.25, layout: "sphere",  contain: 0.15, explode: 0.00,
    glow: 1.00, scan: 0.0, fgX: -1.70, fgA: 1.00, mark: 0.10, spin: 0.16 },

  { key: "sovereign", R: 3.30, th: 3.60,  y: -0.04, ty: 0.00, fov: 34, bias: 0.20,
    open: 0.00, shell: 1.00, lattice: 1.00, layout: "sphere",  contain: 1.00, explode: 0.00,
    glow: 0.85, scan: 1.0, fgX: 4.50,  fgA: 0.00, mark: 0.00, spin: 0.05 },

  { key: "signal",    R: 4.00, th: 6.10,  y: 0.06,  ty: 0.00, fov: 34, bias: 0.20,
    open: 0.85, shell: 0.55, lattice: 1.00, layout: "spine",   contain: 0.70, explode: 0.10,
    glow: 0.95, scan: 0.0, fgX: 4.50,  fgA: 0.00, mark: 0.00, spin: 0.10 },

  { key: "factory",   R: 4.60, th: 8.60,  y: 1.05,  ty: 0.00, fov: 38, bias: 0.20,
    open: 0.70, shell: 0.12, lattice: 1.00, layout: "modules", contain: 0.20, explode: 1.00,
    glow: 1.00, scan: 0.0, fgX: 4.50,  fgA: 0.00, mark: 0.00, spin: 0.14 },

  { key: "team",      R: 3.40, th: 11.20, y: 0.08,  ty: 0.00, fov: 40, bias: 0.02,
    open: 0.45, shell: 0.20, lattice: 0.85, layout: "ring",    contain: 0.35, explode: 0.45,
    glow: 0.70, scan: 0.0, fgX: 4.50,  fgA: 0.00, mark: 0.00, spin: 0.08 },

  { key: "arrival",   R: 6.50, th: 14.137, y: 0.00, ty: 0.28, fov: 30, bias: 0.00,
    open: 0.00, shell: 0.22, lattice: 0.10, layout: "mark",    contain: 1.00, explode: 0.00,
    glow: 1.00, scan: 0.0, fgX: 4.50,  fgA: 0.00, mark: 1.00, spin: 0.02 },
];

/* CI palette — blue is highlight/interactive ONLY, space is never pure black. */
const C = {
  peacoat: 0x192231, surf: 0x1d3557, blue: 0x2b579a, lift: 0x3e6fbf,
  stormy: 0x5a6f8a, rim: 0x7d9fd8, white: 0xf4f4f0, basalt: 0x0e141d,
};

const NODES = 96;
const PARTICLES = 2600;
const SHELL_R = 1.0;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/* ==================================================================== BOOT */
const bgCanvas = document.getElementById("bg-gl");
const fgCanvas = document.getElementById("fg-gl");
const veil = document.getElementById("veil");
const poster = document.getElementById("poster");

function bail(why) {
  /* No WebGL, or reduced motion: the poster IS the fallback, and the 78MB
     frame sequence stays available as the richer degraded path if you want it.
     Never strand the visitor behind the veil. */
  console.info("[zp-core] static fallback:", why);
  document.body.classList.add("no-gl");
  if (poster) poster.style.opacity = "1";
  document.querySelectorAll(".reveal").forEach(el => {
    el.style.opacity = "1"; el.style.transform = "none";
  });
  if (veil) { veil.classList.add("hide"); setTimeout(() => veil.remove(), 900); }
}

if (REDUCED) { bail("prefers-reduced-motion"); throw new Error("halt");}

let bg, fg;
try {
  /* Background is OPAQUE. Additive glow composited against a transparent
     canvas accumulates into the alpha channel and blows out to white; against
     an opaque dark clear colour it behaves the way the CI wants — restrained
     rim light, no neon. Only the foreground canvas needs transparency. */
  bg = new THREE.WebGLRenderer({ canvas: bgCanvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  fg = new THREE.WebGLRenderer({ canvas: fgCanvas, antialias: true, alpha: true, premultipliedAlpha: false });
} catch (e) { bail("WebGL unavailable"); throw e; }

const DPR = () => Math.min(1.5, window.devicePixelRatio || 1); // spec cap
[bg, fg].forEach(r => {
  r.setPixelRatio(DPR());
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.95;
});
bg.setClearColor(0x0d1219, 1);

const bgScene = new THREE.Scene();
const fgScene = new THREE.Scene();

/* ONE camera, both scenes. This is the whole occlusion trick: identical
   projection means a fgScene object at distance 1.2 is genuinely in front of a
   bgScene object at distance 3.6, with correct parallax as the camera moves.
   Two cameras would drift apart the moment pointer parallax kicked in. */
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 220);

/* ================================================================= LIGHTING
   CI photography rules: high contrast, ONE directional key from upper-left,
   blue as ambient/rim only, restrained. No neon, no bloom blowout — the glow
   here is fresnel + additive halo geometry, which stays controllable. */
function light(scene) {
  const key = new THREE.DirectionalLight(0xdfe8f7, 2.4);
  key.position.set(-4, 5, 3);
  scene.add(key);
  const fill = new THREE.HemisphereLight(C.surf, C.peacoat, 0.55);
  scene.add(fill);
  return key;
}
light(bgScene);
light(fgScene);

const coreLight = new THREE.PointLight(C.lift, 2.2, 6, 2);
bgScene.add(coreLight);

/* The key light is fixed in world space, so across 2.2 revolutions of orbit
   there are angles where the core is fully backlit and the blades vanish. This
   second light rides the camera (upper-left of it, per the CI's single-source
   rule) so the object always reads, whatever the azimuth. */
const rimLight = new THREE.DirectionalLight(0xaec6ee, 1.25);
bgScene.add(rimLight);

/* ------------------------------------------------------------- environment
   CI rule: space is never pure black. One inverted sphere with a vertical
   peacoat→surf gradient, one draw call, no texture. Gives the deep-space
   ambience the frame sequence needed 78MB of WebP to fake. */
bgScene.add(new THREE.Mesh(
  new THREE.SphereGeometry(140, 24, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x223250) },
      uMid: { value: new THREE.Color(C.peacoat) },
      uBot: { value: new THREE.Color(0x0a0e14) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop, uMid, uBot; varying vec3 vP;
      void main(){
        float h = clamp(vP.y / 140.0 * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = h > 0.5 ? mix(uMid, uTop, (h - 0.5) * 2.0) : mix(uBot, uMid, h * 2.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
));

/* ============================================================ THE CORE GROUP */
const core = new THREE.Group();
bgScene.add(core);

/* ---- outer containment shell --------------------------------------------
   Fresnel rim + a travelling boundary-scan band. Additive and depth-write-off
   so it reads as a containment FIELD, not a plastic ball. */
const shellMat = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(C.rim) },
    uScanY: { value: -3.0 },
    uScanOn: { value: 0.0 },
    uOpacity: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec3 vN; varying vec3 vView; varying float vY;
    void main() {
      vN = normalize(normalMatrix * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vY = wp.y;
      vec4 mv = viewMatrix * wp;
      vView = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uColor; uniform float uScanY; uniform float uScanOn; uniform float uOpacity;
    varying vec3 vN; varying vec3 vView; varying float vY;
    void main() {
      /* Rim ONLY — no constant base term. A flat additive fill over a
         double-sided sphere doubles up on every pixel and washes the whole
         frame; the containment field should read as an edge, not a fog. */
      float f = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 3.2);
      float band = exp(-pow((vY - uScanY) * 7.0, 2.0)) * uScanOn;
      float a = f * 0.30 + band * 0.16;
      gl_FragColor = vec4(uColor * (f * 0.85 + band * 1.1), a * uOpacity);
    }`,
  transparent: true, blending: THREE.AdditiveBlending,
  depthWrite: false, side: THREE.DoubleSide,
});
const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(SHELL_R, 5), shellMat);
core.add(shell);

/* A second, faceted shell reads as engineered containment rather than a soap
   bubble — low-poly wireframe over the smooth field. */
const shellWire = new THREE.LineSegments(
  new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(SHELL_R * 1.004, 1)),
  new THREE.LineBasicMaterial({ color: C.surf, transparent: true, opacity: 0.5 })
);
core.add(shellWire);

/* ---- aperture: the actual CI mark, extruded ------------------------------
   Five blades + the optic, straight from assets/logo/mark.svg. Opening the
   iris = rotating each blade about the aperture axis and retracting it
   radially. Closed (open=0) IS the logo. */
/* Radius 0.71 seated at z = √(1−0.71²) ≈ 0.70 puts the blade tips exactly on
   the shell surface — the iris reads as a FACE on the core, not a plate
   bisecting it. */
const aperture = new THREE.Group();
aperture.position.z = 0.68;
core.add(aperture);
const blades = [];

/* Backlight disc. At ARRIVAL the mark has to actually READ — dark basalt
   blades on deep space are invisible no matter how you light them. Backlighting
   the iris silhouettes it, which is exactly how the mark is drawn in the CI
   (white on dark) and makes the logo resolution land. */
const halo = new THREE.Mesh(
  new THREE.CircleGeometry(1.35, 64),
  new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uColor: { value: new THREE.Color(C.rim) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uA; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float d = length(vUv - 0.5) * 2.0;
        float g = pow(1.0 - clamp(d, 0.0, 1.0), 2.2);
        gl_FragColor = vec4(uColor * g * 1.4, g * uA);
      }`,
    transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  })
);
halo.position.z = -0.22;
halo.renderOrder = -1;
aperture.add(halo);

const bladeMat = new THREE.MeshStandardMaterial({
  color: 0x141c28, metalness: 0.66, roughness: 0.38,
  emissive: new THREE.Color(C.blue), emissiveIntensity: 0.06,
  side: THREE.DoubleSide, transparent: true, opacity: 1,
});
const opticMat = new THREE.MeshStandardMaterial({
  color: C.lift, metalness: 0.3, roughness: 0.25,
  emissive: new THREE.Color(C.lift), emissiveIntensity: 2.4,
  side: THREE.DoubleSide, transparent: true, opacity: 1,
});

function buildApertureFallback() {
  /* If the SVG can't be fetched (file:// origin, 404) the story must not stop:
     five torus-arc blades in the same hierarchy, same animation API. */
  for (let i = 0; i < 5; i++) {
    const g = new THREE.TorusGeometry(0.52, 0.045, 8, 40, Math.PI * 0.58);
    const m = new THREE.Mesh(g, bladeMat);
    m.rotation.z = (i / 5) * Math.PI * 2;
    m.userData.baseRot = m.rotation.z;
    m.userData.dir = new THREE.Vector3(Math.cos(m.rotation.z), Math.sin(m.rotation.z), 0);
    aperture.add(m); blades.push(m);
  }
  const optic = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), opticMat);
  aperture.add(optic);
  return optic;
}

async function buildAperture() {
  let data;
  try {
    data = await new SVGLoader().loadAsync("assets/logo/mark.svg");
  } catch (e) {
    return buildApertureFallback();
  }

  const metas = [];
  for (const p of data.paths) {
    for (const shape of SVGLoader.createShapes(p)) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 26, bevelEnabled: true, bevelThickness: 6, bevelSize: 5, bevelSegments: 2,
      });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      metas.push({ geo, area: (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y), bb });
    }
  }
  if (!metas.length) return buildApertureFallback();

  /* Origin on the OPTIC (smallest path — the circle at the mark's centre), so
     the iris rotates about the point it is named for. */
  metas.sort((a, b) => a.area - b.area);
  const optCenter = new THREE.Vector3();
  metas[0].bb.getCenter(optCenter);

  const whole = new THREE.Box3();
  metas.forEach(m => whole.union(m.bb));
  const span = Math.max(whole.max.x - whole.min.x, whole.max.y - whole.min.y);
  const s = (SHELL_R * 1.42) / span; // aperture reads slightly wider than the shell

  let optic = null;
  metas.forEach((m, i) => {
    /* translate to optic origin, scale to unit, flip SVG's Y-down. */
    m.geo.translate(-optCenter.x, -optCenter.y, 0);
    m.geo.scale(s, -s, s);
    m.geo.computeVertexNormals();
    const isOptic = i === 0;
    const mesh = new THREE.Mesh(m.geo, isOptic ? opticMat : bladeMat);
    if (isOptic) { optic = mesh; }
    else {
      /* Each blade retracts along its own outward direction when the iris opens. */
      const c = new THREE.Vector3();
      m.geo.computeBoundingBox(); m.geo.boundingBox.getCenter(c);
      c.z = 0;
      mesh.userData.dir = c.lengthSq() > 1e-6 ? c.normalize() : new THREE.Vector3(1, 0, 0);
      mesh.userData.baseRot = 0;
      blades.push(mesh);
    }
    aperture.add(mesh);
  });
  return optic;
}
const opticMesh = await buildAperture();

/* ---- internal compute lattice -------------------------------------------
   96 instanced nodes. Their LAYOUT is the story: a contained sphere for
   sovereignty, an aligned spine for signal, four stacked modules for the
   factory, a human ring for the team, collapsed into the mark at arrival. */
const nodeGeo = new THREE.OctahedronGeometry(0.022, 0);
const nodeMat = new THREE.MeshStandardMaterial({
  color: C.rim, metalness: 0.4, roughness: 0.3,
  emissive: new THREE.Color(C.lift), emissiveIntensity: 0.9,
  transparent: true, opacity: 1,
});
const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, NODES);
nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
core.add(nodes);

function fibSphere(i, n, r) {
  const y = 1 - (i / (n - 1)) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const th = i * Math.PI * (3 - Math.sqrt(5));
  return new THREE.Vector3(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r);
}

const LAYOUTS = {
  /* contained, evenly distributed — nothing escapes. Sized to sit well
     inside the shell so it reads as an internal system seen THROUGH the
     containment field, which is the whole point of the sovereign beat. */
  sphere: i => fibSphere(i, NODES, 0.52),
  /* scattered noise resolves into one clean vertical path */
  spine: i => {
    const t = i / (NODES - 1);
    const a = t * Math.PI * 3.2;
    const r = 0.09 + 0.02 * Math.sin(t * 22);
    return new THREE.Vector3(Math.cos(a) * r, (t - 0.5) * 1.35, Math.sin(a) * r);
  },
  /* four named layers: compute · deployment · software · data */
  modules: i => {
    const layer = i % 4, k = Math.floor(i / 4), per = Math.ceil(NODES / 4);
    const a = (k / per) * Math.PI * 2 + layer * 0.4;
    const r = 0.42 + layer * 0.16;
    return new THREE.Vector3(Math.cos(a) * r, (layer - 1.5) * 0.42, Math.sin(a) * r);
  },
  /* the network resolves into people, standing in a ring around the visitor */
  ring: i => {
    const a = (i / NODES) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * 1.15, Math.sin(a * 3) * 0.16, Math.sin(a) * 1.15);
  },
  /* collapse into the mark */
  mark: i => {
    const a = (i / NODES) * Math.PI * 2 * 5;
    const r = 0.06 + (i / NODES) * 0.1;
    return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.02);
  },
};

const LAYOUT_CACHE = {};
for (const k in LAYOUTS) {
  LAYOUT_CACHE[k] = Array.from({ length: NODES }, (_, i) => LAYOUTS[k](i));
}
const nodePos = LAYOUT_CACHE.sphere.map(v => v.clone());
const nodeTarget = new THREE.Vector3();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();

/* ---- connections ---------------------------------------------------------
   Lines between neighbouring nodes. Redrawn each frame from nodePos, so the
   lattice visibly re-wires itself as the layout changes — that re-wiring is
   what makes a transformation read as one object changing rather than a cut. */
const LINKS = 120;
const linkGeo = new THREE.BufferGeometry();
const linkPos = new Float32Array(LINKS * 6);
linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
const linkPairs = Array.from({ length: LINKS }, (_, i) => [i % NODES, (i + 1 + (i % 5) * 3) % NODES]);
const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({
  color: C.blue, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false,
}));
core.add(links);

/* ---- data particles ------------------------------------------------------
   All motion in the vertex shader — 2600 orbiting points cost no CPU per
   frame. aSide splits them: inner = protected data (squeezed IN by
   containment), outer = external traffic (pushed AWAY by it). That single
   uniform is what makes "sovereign" a visual fact instead of a claim. */
const pGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(PARTICLES * 3); // placeholder; shader owns position
  const seed = new Float32Array(PARTICLES), rad = new Float32Array(PARTICLES);
  const phase = new Float32Array(PARTICLES), tilt = new Float32Array(PARTICLES);
  const side = new Float32Array(PARTICLES);
  for (let i = 0; i < PARTICLES; i++) {
    const outer = i % 5 === 0 || i % 5 === 1; // ~40% external traffic
    seed[i] = Math.random();
    side[i] = outer ? 1 : 0;
    rad[i] = outer ? 1.15 + Math.random() * 1.5 : 0.16 + Math.random() * 0.78;
    phase[i] = Math.random() * Math.PI * 2;
    tilt[i] = (Math.random() - 0.5) * Math.PI;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  pGeo.setAttribute("aRad", new THREE.BufferAttribute(rad, 1));
  pGeo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  pGeo.setAttribute("aTilt", new THREE.BufferAttribute(tilt, 1));
  pGeo.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
}
const pMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }, uContain: { value: 0 }, uExplode: { value: 0 },
    uSize: { value: 2.4 }, uDpr: { value: DPR() }, uVel: { value: 0 },
    uIn: { value: new THREE.Color(C.rim) }, uOut: { value: new THREE.Color(C.stormy) },
  },
  vertexShader: /* glsl */`
    attribute float aSeed; attribute float aRad; attribute float aPhase;
    attribute float aTilt; attribute float aSide;
    uniform float uTime, uContain, uExplode, uSize, uDpr, uVel;
    varying float vSide; varying float vFade;
    void main() {
      float dir = aSide > 0.5 ? -1.0 : 1.0;
      float ang = aPhase + uTime * (0.05 + aSeed * 0.13) * dir * (1.0 + uVel * 1.8);
      float r = aRad;
      // containment: protected data pulled IN, external traffic deflected OUT
      r = aSide > 0.5 ? mix(r, r * 1.42, uContain) : mix(r, r * 0.60, uContain);
      r *= 1.0 + uExplode * 1.5 * aSeed;
      vec3 base = vec3(cos(ang) * r, 0.0, sin(ang) * r);
      float ct = cos(aTilt), st = sin(aTilt);
      vec3 p = vec3(base.x, -base.z * st, base.z * ct);
      p.y += (aSeed - 0.5) * 0.12;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      /* Clamped. An unclamped 1/z blows a near particle up to ~1000px and
         2600 of those render as a solid white screen. */
      gl_PointSize = clamp(uSize * uDpr * (aSeed * 0.7 + 0.5) * (9.0 / max(0.25, -mv.z)), 0.8, 12.0);
      vSide = aSide;
      vFade = aSide > 0.5 ? 1.0 - uContain * 0.55 : 1.0;
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uIn; uniform vec3 uOut;
    varying float vSide; varying float vFade;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.02, d);
      vec3 col = mix(uIn, uOut, vSide);
      gl_FragColor = vec4(col, a * vFade * (vSide > 0.5 ? 0.26 : 0.55));
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});
core.add(new THREE.Points(pGeo, pMat));

/* ---- starfield -----------------------------------------------------------
   Parented to nothing, far out. Gives the orbit something to measure itself
   against — without a static reference, camera motion reads as object motion. */
{
  const N = 1400, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const v = fibSphere(i, N, 70 + Math.random() * 40);
    pos[i * 3] = v.x + (Math.random() - .5) * 20;
    pos[i * 3 + 1] = v.y + (Math.random() - .5) * 20;
    pos[i * 3 + 2] = v.z + (Math.random() - .5) * 20;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  bgScene.add(new THREE.Points(g, new THREE.PointsMaterial({
    color: 0x9fb2cd, size: 0.32, sizeAttenuation: true,
    transparent: true, opacity: 0.55, depthWrite: false,
  })));
}

/* ======================================================= FOREGROUND SCENE
   Deliberately sparse — spec is explicit that a crowded foreground destroys
   legibility. One ring plus a few drifting fragments. Everything here renders
   ABOVE the copy, which is the entire point. */
/* Sized for its distance: at 1.15 units with fov 34 the visible half-height is
   only ~0.35, so a 0.30-radius ring reads as a ring rather than a pipe across
   the whole viewport. */
const FG_D = 1.15, FG_SHARDS = 12;
const fgRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.24, 0.0035, 10, 128),
  new THREE.MeshStandardMaterial({
    color: C.rim, metalness: 0.8, roughness: 0.25,
    emissive: new THREE.Color(C.blue), emissiveIntensity: 0.7,
    transparent: true, opacity: 0,
  })
);
fgScene.add(fgRing);

const fgShards = new THREE.InstancedMesh(
  new THREE.TetrahedronGeometry(0.005, 0),
  new THREE.MeshStandardMaterial({
    color: C.stormy, metalness: 0.6, roughness: 0.4,
    transparent: true, opacity: 0,
  }),
  FG_SHARDS
);
fgScene.add(fgShards);
const shardSeed = Array.from({ length: FG_SHARDS }, () => ({
  a: Math.random() * 6.28, r: 0.12 + Math.random() * 0.38,
  y: (Math.random() - 0.5) * 0.5, sp: 0.1 + Math.random() * 0.25,
}));

/* ============================================================ SCROLL → STATE
   Same midline-progress technique the frame engine already proved: p=0 exactly
   when a beat takes the midline, p=1 exactly when it hands off, so scroll→state
   velocity is continuous at every boundary regardless of section height. */
const beats = STATES
  .map(s => ({ ...s, el: document.querySelector(`[data-beat="${s.key}"]`) }))
  .filter(b => b.el);

if (!beats.length) { bail("no [data-beat] sections found"); throw new Error("halt"); }

/* Progress is measured from the section's TOP EDGE against scrollY, not
   against the viewport midline. The midline version (which the frame engine
   uses) puts the first section at p=0.5 before the visitor has scrolled a
   pixel — harmless there because hero's frame range was [0,0], fatal here
   because hero would boot already half-way to the departure composition.
   Sections are contiguous, so p=1 of beat i and p=0 of beat i+1 land on the
   same scroll position and the same state: velocity stays continuous. */
function beatProgress(el) {
  const top = el.getBoundingClientRect().top + scrollY;
  return clamp((scrollY - top) / Math.max(1, el.offsetHeight), 0, 1);
}

function activeIndex() {
  for (let i = beats.length - 1; i >= 0; i--) {
    const top = beats[i].el.getBoundingClientRect().top + scrollY;
    if (scrollY >= top - 1) return i;
  }
  return 0;
}

/* approach → event → hold → departure.
   HEAD lets the composition you just arrived at be READ before it starts
   moving again; HOLD is the plateau while the panel copy is on screen. The
   scene is only in motion for the middle 62% of each section. */
const HEAD = 0.12, HOLD = 0.26;
const KEYS = ["R", "th", "y", "ty", "fov", "bias", "open", "shell", "lattice",
              "contain", "explode", "glow", "scan", "mark", "fgX", "fgA", "spin"];

function resolveState() {
  const i = activeIndex();
  const raw = beatProgress(beats[i].el);
  const p = easeInOut(clamp((raw - HEAD) / (1 - HEAD - HOLD), 0, 1));
  const a = beats[i], b = beats[Math.min(i + 1, beats.length - 1)];
  const out = { idx: i, p };
  for (const k of KEYS) out[k] = lerp(a[k], b[k], p);
  out.layoutA = a.layout; out.layoutB = b.layout; out.mix = p;
  return out;
}

/* ====================================================== POINTER (the agency)
   Damped, never snappy — a scene that tracks the cursor 1:1 feels like a
   toy; one that leans feels like it has mass. */
const ptr = { x: 0, y: 0, tx: 0, ty: 0, hover: 0, hoverT: 0 };
addEventListener("pointermove", e => {
  ptr.tx = (e.clientX / innerWidth) * 2 - 1;
  ptr.ty = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });
addEventListener("pointerleave", () => { ptr.tx = 0; ptr.ty = 0; }, { passive: true });

const ray = new THREE.Raycaster();
const hitProxy = new THREE.Mesh(
  new THREE.SphereGeometry(SHELL_R * 1.15, 12, 10),
  new THREE.MeshBasicMaterial({ visible: false })
);
core.add(hitProxy);

/* scroll velocity — feeds particle spin and a few px of camera lag */
let vel = 0, lastY = scrollY;

/* ========================================================== RESIZE / LAYOUT */
let W = 0, H = 0, portrait = false;
function resize() {
  W = innerWidth; H = innerHeight;
  portrait = W < 768;
  camera.aspect = W / H;
  [bg, fg].forEach(r => { r.setPixelRatio(DPR()); r.setSize(W, H, false); });
  pMat.uniforms.uDpr.value = DPR();
}
addEventListener("resize", resize, { passive: true });
resize();

/* ================================================================== RENDER */
const camPos = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
let t0 = performance.now();
let smoothed = null;
let spinY = 0;
const _cDark = new THREE.Color(0x141c28);   // basalt, journey
const _cLit  = new THREE.Color(0xdbe6fb);   // near-white, the CI mark on dark

function frame(now) {
  const dt = Math.min(0.05, (now - t0) / 1000);
  t0 = now;
  const time = now / 1000;

  /* scroll velocity, low-passed */
  const dy = scrollY - lastY; lastY = scrollY;
  vel += (clamp(Math.abs(dy) / 55, 0, 1) - vel) * (1 - Math.exp(-dt * 6));

  const S = resolveState();

  /* Critically-damped chase on every animated channel. Lenis already smooths
     scroll; this second, gentler layer is what gives the object inertia
     (it arrives slightly after you do) without floaty lag. */
  if (!smoothed) smoothed = { ...S };
  const k = 1 - Math.exp(-dt * 5.5);
  for (const key of KEYS) smoothed[key] = lerp(smoothed[key], S[key], k);
  const V = smoothed;

  /* -------- camera: orbit + descent + constant screen-space bias ---------- */
  /* Radius is art-directed for ~16:9. A phone crops the frame horizontally,
     not vertically, so the same radius reads as a much bigger object — pull
     back in proportion to how narrow the viewport actually is. */
  const aspectPush = clamp(1.6 / Math.max(0.5, camera.aspect), 1.0, 1.7);
  const Rr = V.R * aspectPush;
  camPos.set(Math.cos(V.th) * Rr, V.y, Math.sin(V.th) * Rr);
  lookAt.set(0, V.ty, 0);

  camera.fov = V.fov;
  camera.position.copy(camPos);
  camera.lookAt(lookAt);

  /* Composition bias as YAW. ndc → angle via the horizontal half-FOV, so the
     subject holds the same screen fraction at R=0.6 and at R=4.2 alike.
     Portrait drops the bias (no room) and lifts the subject instead. */
  const ndc = portrait ? 0.0 : V.bias * 2;
  if (ndc > 0.001) {
    const halfV = THREE.MathUtils.degToRad(camera.fov) / 2;
    const tanH = Math.tan(halfV) * camera.aspect;
    camera.rotateY(Math.atan(ndc * tanH));
  }
  if (portrait) camera.rotateX(-0.12);

  /* pointer parallax, in camera-local space so it always reads as a head move */
  ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 3.2));
  ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 3.2));
  camera.getWorldDirection(fwd);
  right.crossVectors(fwd, camera.up).normalize();
  up.crossVectors(right, fwd).normalize();
  const amp = 0.10 * Rr;
  camera.position.addScaledVector(right, ptr.x * amp);
  camera.position.addScaledVector(up, -ptr.y * amp * 0.7);
  camera.position.addScaledVector(fwd, vel * 0.09 * Rr); // velocity nudge
  camera.lookAt(lookAt);
  if (ndc > 0.001) {
    const halfV = THREE.MathUtils.degToRad(camera.fov) / 2;
    camera.rotateY(Math.atan(ndc * Math.tan(halfV) * camera.aspect));
  }
  if (portrait) camera.rotateX(-0.12);
  camera.updateProjectionMatrix();

  /* -------- hover: does the pointer own the object right now? ------------- */
  ray.setFromCamera({ x: ptr.tx, y: -ptr.ty }, camera);
  ptr.hoverT = ray.intersectObject(hitProxy, false).length ? 1 : 0;
  ptr.hover += (ptr.hoverT - ptr.hover) * (1 - Math.exp(-dt * 5));

  /* -------- the core: float, lean, spin ----------------------------------- */
  spinY += dt * V.spin * (1 + vel * 2);
  /* As the mark resolves, rotate to the NEAREST whole turn instead of wherever
     the free spin happened to land — the aperture arrives square to camera and
     the logo reads as inevitable rather than as a lucky frame. */
  const settled = Math.round(spinY / (Math.PI * 2)) * Math.PI * 2;
  core.rotation.y = lerp(spinY, settled, V.mark);
  core.position.y = Math.sin(time * 0.35) * 0.022;
  /* lean TOWARD the cursor — the single cheapest cue that the object is real.
     Damped out at arrival so the resolved mark sits still. */
  const lean = (1 - V.mark * 0.85);
  const leanX = -ptr.y * 0.10 * (0.5 + ptr.hover * 0.9) * lean;
  const leanZ = ptr.x * 0.08 * (0.5 + ptr.hover * 0.9) * lean;
  core.rotation.x += (leanX - core.rotation.x) * (1 - Math.exp(-dt * 3));
  core.rotation.z += (leanZ - core.rotation.z) * (1 - Math.exp(-dt * 3));

  rimLight.position.copy(camera.position)
    .addScaledVector(right, -2.2).addScaledVector(up, 2.0).addScaledVector(fwd, 0.6);

  /* -------- shell + boundary scan ----------------------------------------- */
  shellMat.uniforms.uOpacity.value = V.shell;
  shellMat.uniforms.uScanOn.value = V.scan;
  /* the scan sweeps bottom→top on a loop; it only exists while sovereign */
  shellMat.uniforms.uScanY.value = ((time * 0.22) % 1) * 2.4 - 1.2;
  shellWire.material.opacity = V.shell * 0.5;
  shell.visible = V.shell > 0.01;
  shellWire.visible = V.shell > 0.01;

  /* -------- aperture: open / close ---------------------------------------- */
  const o = V.open;
  for (const b of blades) {
    b.rotation.z = (b.userData.baseRot || 0) + o * 0.62;
    b.position.copy(b.userData.dir).multiplyScalar(o * 0.5);
  }
  /* The CI draws the mark white on dark. Through the journey the blades are
     dark basalt hardware; as the mark resolves they lift to near-white and the
     halo backs them, so ARRIVAL lands on the logo as it is actually specified. */
  bladeMat.color.copy(_cDark).lerp(_cLit, V.mark);
  bladeMat.emissiveIntensity = 0.05 + V.mark * 0.30;
  halo.material.uniforms.uA.value = V.mark * 1.15;
  halo.visible = V.mark > 0.01;
  if (opticMesh) {
    opticMat.emissiveIntensity = 0.9 + V.glow * 1.7 + ptr.hover * 0.9;
    opticMesh.scale.setScalar(lerp(0.5, 1.0, V.mark) * (1 + ptr.hover * 0.06));
  }
  coreLight.intensity = 0.8 + V.glow * 1.4;
  coreLight.position.set(0, 0, 0.2);
  core.localToWorld(coreLight.position);

  /* -------- lattice: layout morph + re-wiring ------------------------------ */
  const A = LAYOUT_CACHE[S.layoutA], B = LAYOUT_CACHE[S.layoutB];
  const nk = 1 - Math.exp(-dt * 3.4);
  const nodeScale = V.lattice * (1 + V.explode * 0.35);
  nodes.visible = nodeScale > 0.02;
  nodeMat.opacity = clamp(V.lattice, 0, 1);
  if (nodes.visible) {
    for (let i = 0; i < NODES; i++) {
      nodeTarget.lerpVectors(A[i], B[i], S.mix);
      /* explode pushes modules outward past the camera at the factory beat */
      nodeTarget.multiplyScalar(1 + V.explode * 0.55);
      nodePos[i].lerp(nodeTarget, nk);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), time * 0.6 + i);
      _s.setScalar(nodeScale * (0.7 + 0.6 * ((i % 7) / 7)));
      _m4.compose(nodePos[i], _q, _s);
      nodes.setMatrixAt(i, _m4);
    }
    nodes.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < LINKS; i++) {
      const [a, b] = linkPairs[i];
      linkPos[i * 6] = nodePos[a].x; linkPos[i * 6 + 1] = nodePos[a].y; linkPos[i * 6 + 2] = nodePos[a].z;
      linkPos[i * 6 + 3] = nodePos[b].x; linkPos[i * 6 + 4] = nodePos[b].y; linkPos[i * 6 + 5] = nodePos[b].z;
    }
    linkGeo.attributes.position.needsUpdate = true;
    /* links only make sense once the lattice is organised — they fade in as
       the spine/module layouts resolve, which is the "order from noise" beat */
    links.material.opacity = 0.30 * V.lattice * (1 - V.explode * 0.55);
    links.visible = links.material.opacity > 0.01;
  } else { links.visible = false; }

  /* -------- particles ------------------------------------------------------ */
  pMat.uniforms.uTime.value = time;
  pMat.uniforms.uContain.value = V.contain;
  pMat.uniforms.uExplode.value = V.explode;
  pMat.uniforms.uVel.value = vel;

  /* -------- foreground ----------------------------------------------------- */
  const fgA = clamp(V.fgA, 0, 1);
  fgRing.material.opacity = fgA * 0.9;
  fgShards.material.opacity = fgA * 0.5;
  const showFg = fgA > 0.01;
  fgRing.visible = showFg; fgShards.visible = showFg;

  if (showFg) {
    /* Placed in CAMERA-LOCAL space at 1.15 units — nearer than the core at
       R≥1.5, so it genuinely passes IN FRONT of the H1 while the core stays
       behind the copy. This one event does more for perceived depth than any
       amount of easing on a flat frame sequence. */
    fgRing.position.copy(camera.position)
      .addScaledVector(fwd, FG_D)
      .addScaledVector(right, V.fgX * 0.18)
      .addScaledVector(up, -0.02 + ptr.y * 0.02);
    fgRing.quaternion.copy(camera.quaternion);
    fgRing.rotateX(1.15 + ptr.y * 0.08);
    fgRing.rotateY(ptr.x * 0.12);

    for (let i = 0; i < FG_SHARDS; i++) {
      const s = shardSeed[i];
      const a = s.a + time * s.sp;
      const p = new THREE.Vector3().copy(camera.position)
        .addScaledVector(fwd, FG_D * 0.8 + (i % 3) * 0.1)
        .addScaledVector(right, Math.cos(a) * s.r + V.fgX * 0.14)
        .addScaledVector(up, s.y + Math.sin(a * 1.7) * 0.05);
      _q.setFromAxisAngle(new THREE.Vector3(1, 1, 0).normalize(), a * 2);
      _m4.compose(p, _q, _s.setScalar(1));
      fgShards.setMatrixAt(i, _m4);
    }
    fgShards.instanceMatrix.needsUpdate = true;
  }

  /* -------- draw ----------------------------------------------------------- */
  bg.render(bgScene, camera);
  if (showFg) fg.render(fgScene, camera);
  else fg.clear();

  chrome(S.idx);
  requestAnimationFrame(frame);
}

/* ================================================================== CHROME */
const dotsWrap = document.getElementById("dots");
const fill = document.querySelector("#progress .fill");
const dots = beats.map((b, i) => {
  const el = document.createElement("button");
  el.setAttribute("aria-label", b.el.dataset.label || b.key);
  el.innerHTML = `<span>${b.el.dataset.label || ""}</span>`;
  el.addEventListener("click", () => {
    const y = b.el.getBoundingClientRect().top + scrollY;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 });
    else scrollTo({ top: y, behavior: "smooth" });
  });
  dotsWrap && dotsWrap.appendChild(el);
  return el;
});
let lastIdx = -1, lastP = -1;
function chrome(idx) {
  if (idx !== lastIdx) {
    dots.forEach((d, i) => d.setAttribute("aria-current", i === idx ? "true" : "false"));
    document.body.dataset.beat = beats[idx].key;
    lastIdx = idx;
  }
  const p = Math.round(clamp(scrollY / (document.documentElement.scrollHeight - innerHeight), 0, 1) * 1000);
  if (p !== lastP && fill) { fill.style.transform = `scaleX(${p / 1000})`; lastP = p; }
}

/* ==================================================================== START */
requestAnimationFrame(frame);
requestAnimationFrame(() => {
  if (veil) { veil.classList.add("hide"); setTimeout(() => veil.remove(), 900); }
});

export { camera, core, bgScene, fgScene };
