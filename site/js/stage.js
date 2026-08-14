/* The WebGL stage: one figure, fixed in place, lit for the void, with the small set of
 * props the storyboard asks each stop to bring on — the hologram slab at the right
 * palm, three fanned cards at the left, the ZeroPoint mark on the chest, the ground glow.
 *
 * The asset arrives with a base-colour map and nothing else (metalness 0, roughness 0.9,
 * no normal / ORM / emissive maps), which renders as flat grey plastic. What brings it
 * back, in rough order of how much each one matters:
 *
 *   1. Anti-aliasing that actually applies. `antialias: true` on the renderer is
 *      ignored the moment EffectComposer owns the output, so the composer's own target
 *      has to ask for MSAA samples. Without this every edge in the frame is jagged.
 *   2. An environment with SHAPE. Metal is defined by what it reflects; reflecting a
 *      flat gradient is why untextured metal looks like plastic. This one is a small
 *      procedural studio — soft box, two rim strips, floor bounce.
 *   3. Shadows, including self-shadowing. The shoulder plates dropping onto the chest
 *      is most of what makes armour read as armour, and a contact shadow is the only
 *      thing that stops the figure floating in the void.
 *   4. Ground-truth ambient occlusion (GTAO) for crevice depth.
 *   5. Surface maps derived from the base colour at build time (tools/surface.mjs):
 *      normal for relief, ORM for per-texel roughness and metalness. One flat roughness
 *      value across 1.85m of armour is the classic CG tell.
 *   6. A grade — S-curve, cool shadows, vignette, a little grain.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FIGURE, ANCHORS, place } from './rig.js';

const FOV = 30;
const VOID = 0x01060c;
const DAZZLING = 0x2b579a;    // CI highlight
const BLUE_BRIGHT = 0x3b6fd4; // CI data-viz accent

/* The finishing grade. Filmic contrast, a cool lift in the shadows so the blacks read
 * as night rather than as clipping, a vignette to hold the eye, and just enough grain
 * to stop the large dark areas banding on 8-bit displays. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.9 },
    uGrain: { value: 0.022 },
    uContrast: { value: 1.00 },
    uLift: { value: new THREE.Color(0x0a1424) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uContrast;
    uniform vec3 uLift;
    varying vec2 vUv;

    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;

      // Filmic S-curve around pivot 0.42 — deepens the void without crushing the suit.
      c = clamp((c - 0.42) * uContrast + 0.42, 0.0, 1.0);

      // Cool the shadows only; the weight falls off as luminance rises.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += uLift * (1.0 - smoothstep(0.0, 0.45, l)) * 0.35;

      // Vignette, generous enough to frame but never to read as a dark ring.
      vec2 p = vUv - 0.5;
      c *= mix(1.0, smoothstep(0.92, 0.20, length(p) * uVignette), 0.42);

      // Animated grain, scaled down in the highlights where it would show as noise.
      float n = fract(sin(dot(vUv * vec2(1279.0, 3571.0) + uTime, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - 0.5) * uGrain * (1.0 - l * 0.7);

      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export class Stage {
  constructor(mount, { reducedMotion = false } = {}) {
    this.mount = mount;
    this.reduced = reducedMotion;
    this.fov = FOV;
    this.clock = new THREE.Clock();
    this.beats = { holoA: 0, holoB: 0, cards: 0, iris: 0, ground: 0, dust: 0 };
    this.cur = null;   // damped camera state
    this.ready = false;
    this.logoMats = [];

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(VOID, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.60;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);

    this.figure = new THREE.Group();
    this.scene.add(this.figure);

    this.#light();
    this.#props();
    this.resize();
  }

  /* ------------------------------------------------------------------ lighting */

  /* A small procedural studio, 1024x512 equirect. Near-neutral graphite rather than
     navy — a blue environment turns the whole figure into blue plastic, and the blue
     belongs in the seams and the rims. What matters here is not the colour but the
     shapes: metal reflects the soft box and the rim strips, and those reflections are
     the difference between armour and vinyl. */
  #environment() {
    const W = 1024, H = 512;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0.00, '#2b313c');
    sky.addColorStop(0.40, '#12161d');
    sky.addColorStop(0.52, '#070a0e');
    sky.addColorStop(1.00, '#020305');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    const blob = (cx, cy, rx, ry, inner, outer) => {
      const r = Math.max(rx, ry);
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, inner); rg.addColorStop(1, outer);
      g.save();
      g.translate(cx, cy); g.scale(rx / r, ry / r); g.translate(-cx, -cy);
      g.fillStyle = rg;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.restore();
    };

    // Key soft box, high and to the front-right of the figure.
    blob(W * 0.62, H * 0.24, W * 0.20, H * 0.20, 'rgba(228,238,255,0.95)', 'rgba(228,238,255,0)');
    // Weaker fill box opposite, so the shadow side keeps its panel detail.
    blob(W * 0.20, H * 0.34, W * 0.15, H * 0.16, 'rgba(150,168,196,0.42)', 'rgba(150,168,196,0)');
    // Two narrow rim strips behind, in Dazzling Blue — the sovereign edge.
    blob(W * 0.02, H * 0.44, W * 0.035, H * 0.30, 'rgba(43,87,154,0.85)', 'rgba(43,87,154,0)');
    blob(W * 0.95, H * 0.46, W * 0.030, H * 0.26, 'rgba(43,87,154,0.70)', 'rgba(43,87,154,0)');
    // Floor bounce just under the horizon, keeping the boots off pure black.
    blob(W * 0.55, H * 0.70, W * 0.45, H * 0.10, 'rgba(58,72,94,0.34)', 'rgba(58,72,94,0)');

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
    return env;
  }

  #light() {
    this.scene.environment = this.#environment();
    this.scene.environmentIntensity = 2.10;

    // Key: neutral, front-high on the screen-right side, as in the source render. It
    // carries the form and it is the only light that casts — one shadow source keeps
    // the read clean, and self-shadowing is where the armour comes from.
    const key = new THREE.DirectionalLight(0xf4f7ff, 7.5);
    key.position.set(2.4, 2.8, -1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const s = key.shadow.camera;
    s.left = -0.95; s.right = 0.95; s.top = 1.25; s.bottom = -1.25; s.near = 1.2; s.far = 7.5;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.018;
    key.shadow.radius = 2.2;
    this.scene.add(key, key.target);
    this.key = key;

    // Soft neutral fill opposite the key. Never casts — a second shadow would muddy it.
    const fill = new THREE.DirectionalLight(0xb9c8de, 4.50);
    fill.position.set(1.4, 0.5, 2.2);
    this.scene.add(fill);

    // Two rims in Dazzling Blue, cutting suit from void. Weak enough to stay an edge —
    // at full strength they paint the entire body blue.
    const rimL = new THREE.DirectionalLight(DAZZLING, 1.5);
    rimL.position.set(-1.6, 1.1, 2.6);
    const rimR = new THREE.DirectionalLight(DAZZLING, 1.1);
    rimR.position.set(-1.8, 0.6, -2.4);
    this.scene.add(rimL, rimR);

    this.scene.add(new THREE.HemisphereLight(0x39485e, 0x02060b, 1.20));

    // Practical at the chest: the mark reads as the source of its own light.
    this.chestLight = new THREE.PointLight(BLUE_BRIGHT, 0, 0.55, 2);
    this.chestLight.position.set(0.24, ANCHORS.chestDisc[1], 0);
    this.scene.add(this.chestLight);

    // One practical per hand, brought up with that hand's hologram so the slab looks
    // projected rather than pasted next to the palm.
    this.handLight = { R: null, L: null };
    for (const [k, a] of [['R', ANCHORS.handR], ['L', ANCHORS.handL]]) {
      const l = new THREE.PointLight(BLUE_BRIGHT, 0, 0.4, 2);
      l.position.set(a[0] + 0.06, a[1] + 0.03, a[2]);
      this.handLight[k] = l;
      this.scene.add(l);
    }

    // Catches the contact shadow. Invisible except where the figure occludes the key.
    this.shadowFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.62, depthWrite: false }),
    );
    this.shadowFloor.rotation.x = -Math.PI / 2;
    this.shadowFloor.position.y = FIGURE.groundY + 0.001;
    this.shadowFloor.receiveShadow = true;
    this.scene.add(this.shadowFloor);
  }

  /* --------------------------------------------------------------------- props */

  /** Hologram surfaces are drawn to canvas so the copy stays crisp and on-brand. */
  #slabTexture(draw) {
    const W = 1024, H = 640;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    // Glass body: a gradient rather than a flat fill, so the slab has a light direction.
    const body = g.createLinearGradient(0, 0, W * 0.4, H);
    body.addColorStop(0, 'rgba(16,38,74,0.66)');
    body.addColorStop(1, 'rgba(4,12,26,0.60)');
    g.fillStyle = body;
    g.beginPath(); g.roundRect(8, 8, W - 16, H - 16, 26); g.fill();

    // Scanlines — the cheapest honest signal that a surface is a projection.
    g.save();
    g.beginPath(); g.roundRect(8, 8, W - 16, H - 16, 26); g.clip();
    g.fillStyle = 'rgba(123,164,240,0.055)';
    for (let y = 12; y < H; y += 4) g.fillRect(8, y, W - 16, 1);
    g.restore();

    g.strokeStyle = 'rgba(123,164,240,0.80)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(8, 8, W - 16, H - 16, 26); g.stroke();

    // Corner brackets, so the frame reads as an instrument and not a rounded rectangle.
    g.strokeStyle = 'rgba(180,208,255,0.95)'; g.lineWidth = 5;
    const B = 46;
    for (const [x, y, dx, dy] of [[26, 26, 1, 1], [W - 26, 26, -1, 1], [26, H - 26, 1, -1], [W - 26, H - 26, -1, -1]]) {
      g.beginPath();
      g.moveTo(x, y + dy * B); g.lineTo(x, y); g.lineTo(x + dx * B, y);
      g.stroke();
    }

    draw(g, W, H);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAniso;
    return tex;
  }

  #slab(tex, w, h) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.visible = false;
    return m;
  }

  #props() {
    const label = (g, text, x, y, size, color, weight = 600, track = 0) => {
      g.fillStyle = color;
      g.font = `${weight} ${size}px "Plus Jakarta Sans", system-ui, sans-serif`;
      if (!track) { g.fillText(text, x, y); return; }
      let cx = x;
      for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + track; }
    };

    // WP2a — a render pipeline mid-flight: what Studio actually does.
    const texA = this.#slabTexture((g, W) => {
      label(g, 'ZERO POINT STUDIO', 54, 100, 30, 'rgba(150,186,250,0.95)', 600, 5);
      label(g, 'R20.02 / master', 54, 184, 62, '#F4F4F0', 700);
      g.fillStyle = 'rgba(244,244,240,0.18)';
      g.fillRect(54, 240, W - 108, 4);
      g.fillStyle = '#5A8BE8';
      g.fillRect(54, 240, (W - 108) * 0.78, 4);
      label(g, '600 frames · 18.1 s', 54, 296, 28, 'rgba(178,192,212,0.95)', 500);
      for (let i = 0; i < 12; i++) {
        const x = 54 + (i % 6) * 156, y = 348 + Math.floor(i / 6) * 130;
        g.fillStyle = i < 9 ? 'rgba(59,111,212,0.34)' : 'rgba(244,244,240,0.07)';
        g.beginPath(); g.roundRect(x, y, 136, 108, 10); g.fill();
        g.strokeStyle = i < 9 ? 'rgba(140,180,250,0.62)' : 'rgba(244,244,240,0.14)';
        g.lineWidth = 2; g.stroke();
      }
    });

    // WP2b — the same slab, swapped to an agent graph. Camera holds; content changes.
    const texB = this.#slabTexture((g, W, H) => {
      label(g, 'ZERO POINT ENTERPRISE', 54, 100, 30, 'rgba(150,186,250,0.95)', 600, 5);
      label(g, 'Private agents', 54, 180, 56, '#F4F4F0', 700);
      const nodes = [[190, 330], [430, 270], [430, 406], [670, 330], [880, 260], [880, 410]];
      g.strokeStyle = 'rgba(140,180,250,0.58)'; g.lineWidth = 3;
      for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5]]) {
        g.beginPath(); g.moveTo(...nodes[a]); g.lineTo(...nodes[b]); g.stroke();
      }
      nodes.forEach(([x, y], i) => {
        g.fillStyle = i === 3 ? '#5A8BE8' : 'rgba(6,18,38,0.95)';
        g.strokeStyle = 'rgba(150,186,250,0.9)'; g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, 30, 0, Math.PI * 2); g.fill(); g.stroke();
      });
      label(g, 'Acceptance gates · 200 specialists', 54, H - 92, 30, 'rgba(178,192,212,0.95)', 500);
    });

    // Sized against the frame the camera holds at this stop (0.40 world units tall):
    // a prop in the hand's orbit, not a billboard the hand happens to be near.
    this.holoA = this.#slab(texA, 0.155, 0.097);
    this.holoB = this.#slab(texB, 0.155, 0.097);
    const hand = ANCHORS.handR;
    for (const s of [this.holoA, this.holoB]) {
      s.position.set(hand[0] + 0.10, hand[1] + 0.075, hand[2] - 0.060);
      this.scene.add(s);
    }

    // WP4 — three cards fanning off the left palm: the advisory offer.
    this.cards = new THREE.Group();
    ['AI readiness', 'Governance', 'Workflow economics'].forEach((title, i) => {
      const tex = this.#slabTexture((g, W, H) => {
        label(g, `0${i + 1}`, 54, 224, 46, 'rgba(150,186,250,0.9)', 700, 4);
        label(g, title, 54, 356, 74, '#F4F4F0', 700);
        g.fillStyle = 'rgba(90,139,232,0.55)';
        g.beginPath(); g.roundRect(54, 416, 260, 10, 5); g.fill();
      });
      const card = this.#slab(tex, 0.115, 0.072);
      // Fan up and outboard (+Z is screen-left, the side this hand is on). Kept tight:
      // spread toward the camera magnifies the far cards and pushes them out of frame.
      card.position.set(0.055 + i * 0.012, 0.018 + i * 0.045, 0.018 + i * 0.026);
      card.rotation.set(0, 0, (i - 1) * 0.10);
      card.visible = false;
      this.cards.add(card);
    });
    this.cards.position.set(ANCHORS.handL[0], ANCHORS.handL[1], ANCHORS.handL[2]);
    this.scene.add(this.cards);

    // WP5 — the ground the figure stands on, lit only where it is standing.
    const gc = document.createElement('canvas');
    gc.width = gc.height = 256;
    const gg = gc.getContext('2d');
    const rg = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(74,120,205,0.70)');
    rg.addColorStop(0.30, 'rgba(38,74,136,0.26)');
    rg.addColorStop(0.62, 'rgba(20,40,84,0.09)');
    rg.addColorStop(1, 'rgba(1,6,12,0)');
    gg.fillStyle = rg; gg.fillRect(0, 0, 256, 256);
    const gtex = new THREE.CanvasTexture(gc);
    gtex.colorSpace = THREE.SRGBColorSpace;
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.0),
      new THREE.MeshBasicMaterial({ map: gtex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, FIGURE.groundY + 0.004, 0);
    this.scene.add(this.ground);

    // Dust settling on that ground — motion at the one stop that would otherwise be still.
    const N = 190;
    this.dustRise = 0.16;
    const pos = new Float32Array(N * 3);
    this.dustSeed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = Math.sqrt(Math.random()) * 0.6, a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = FIGURE.groundY + Math.random() * this.dustRise;
      pos[i * 3 + 2] = Math.sin(a) * r;
      this.dustSeed[i] = Math.random();
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({
      color: 0x9dbdf5, size: 0.0038, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    this.dust.visible = false;
    this.scene.add(this.dust);
  }

  /* --------------------------------------------------------------------- load */

  async load(url, onProgress) {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url, e => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total * 0.88);
    });

    const tl = new THREE.TextureLoader();
    const [glow, orm] = await Promise.all([
      tl.loadAsync('assets/zp-figure-glow.webp'),
      tl.loadAsync('assets/zp-figure-orm.webp'),
    ]);
    // glTF authors UVs y-down, which the loader handles for embedded textures but not
    // for ones we attach ourselves.
    for (const t of [glow, orm]) { t.flipY = false; t.anisotropy = this.maxAniso; }
    glow.colorSpace = THREE.SRGBColorSpace;   // emissive is authored in sRGB
    orm.colorSpace = THREE.NoColorSpace;      // data channels

    /* No normal map. One was derived from the base colour and it was a mistake: the
     * source is a 4K JPEG whose compression blocks and painted brushwork do not
     * correspond to real geometry, so the derived relief rendered as scratches and
     * streaks across the plates. Denoising and dropping the strength reduced the
     * artefacts without ever making the result better than no map at all. Roughness
     * variation gives the surface life without inventing surface that isn't there. */

    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material;
      if (m.map) m.map.anisotropy = this.maxAniso;

      // Roughness comes per-texel from the ORM map's G channel, so the scalar becomes a
      // plain multiplier and sits at 1. Metalness stays a flat 0.55: driving it from the
      // map pushed the plates toward chrome, and metal has no diffuse response, so the
      // broad form of the figure vanished and left only specular highlights.
      m.roughness = 1;
      m.roughnessMap = orm;
      m.metalness = 0.55;
      m.envMapIntensity = 1.80;
      m.emissiveMap = glow;
      m.emissive = new THREE.Color(0xffffff);
      m.emissiveIntensity = 1.15;
      m.needsUpdate = true;

      o.castShadow = true;
      o.receiveShadow = true;   // self-shadowing: shoulder plates onto the chest
      o.frustumCulled = false;
      this.mesh = o;
    });

    this.figure.add(gltf.scene);
    this.ready = true;
    onProgress?.(0.94);
    return gltf;
  }

  /** The ZeroPoint mark, as real geometry seated on the chest plate. */
  async loadLogo(url, onProgress) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const logo = gltf.scene;

    // The mark is authored lying flat (thin axis Y, 0.126 across). The chest plate faces
    // +X, so tip it upright: -90 deg about Z maps +Y onto +X.
    const rig = new THREE.Group();
    rig.add(logo);
    rig.rotation.z = -Math.PI / 2;
    // The mark is 0.1256 across and the disc is 0.1288, so it fits 1:1 — scale it to the
    // measured disc rather than to a guess, and seat it just proud of the surface.
    const fit = (ANCHORS.chestDiscSize * 0.98) / 0.1256;
    rig.scale.setScalar(fit);
    rig.position.set(ANCHORS.chestDisc[0] - 0.004, ANCHORS.chestDisc[1], ANCHORS.chestDisc[2]);
    this.logo = rig;
    this.logoSpin = logo.getObjectByName('ZP_Spinner') || logo;

    logo.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material;
      m.envMapIntensity = 1.2;
      // The optic is the light source; the blades stay dark metal and catch the rims.
      const optic = /optic/i.test(m.name);
      m.emissive = new THREE.Color(optic ? BLUE_BRIGHT : 0x0d1a33);
      m.emissiveIntensity = 0;
      m.needsUpdate = true;
      o.castShadow = !optic;
      o.receiveShadow = true;
      this.logoMats.push(m);
    });

    this.scene.add(rig);
    onProgress?.(1);
    return gltf;
  }

  /* ------------------------------------------------------------------- render */

  #composer(w, h) {
    // MSAA has to be requested on the composer's own target. `antialias: true` on the
    // renderer applies to the default framebuffer, which a composed pipeline never
    // draws to — miss this and every edge in the frame is aliased.
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: this.tier === 'high' ? 4 : 2,
    });
    const comp = new EffectComposer(this.renderer, rt);
    comp.addPass(new RenderPass(this.scene, this.camera));

    if (this.tier === 'high') {
      const gtao = new GTAOPass(this.scene, this.camera, w, h);
      // Radius is in world units: the figure is 1.85 tall, so this is panel-gap scale.
      gtao.updateGtaoMaterial({ radius: 0.075, distanceExponent: 1.2, thickness: 0.4, scale: 1.0, samples: 16 });
      gtao.blendIntensity = 0.65;
      comp.addPass(gtao);
      this.gtao = gtao;
    }

    // Low and tight: only the tracery and the mark should bloom, and the halo has to
    // stay small enough not to eat the copy beside it.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.30, 0.34, 0.92);
    comp.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    comp.addPass(this.grade);

    comp.addPass(new OutputPass());
    this.comp = comp;
  }

  resize() {
    const w = this.mount.clientWidth, h = this.mount.clientHeight;
    if (!w || !h) return;
    this.aspect = w / h;

    // Three tiers. The composed stack is the expensive one, so phones render direct with
    // the renderer's own MSAA instead of paying for GTAO and four full-screen passes.
    const px = w * h;
    this.tier = w < 900 ? 'low' : (px > 2_600_000 ? 'mid' : 'high');
    const dpr = Math.min(window.devicePixelRatio || 1, this.tier === 'mid' ? 1.35 : 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    if (this.key) this.key.shadow.mapSize.setScalar(this.tier === 'low' ? 1024 : 2048);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();

    if (this.tier === 'low') {
      if (this.comp) { this.comp.dispose?.(); this.comp = null; this.gtao = null; this.grade = null; this.compTier = null; }
      return;
    }
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (!this.comp || this.compTier !== this.tier) {
      this.comp?.dispose?.();
      this.gtao = null;
      this.#composer(bw, bh);
      this.compTier = this.tier;
    }
    this.comp.setSize(bw, bh);
    this.gtao?.setSize(bw, bh);
  }

  /** Aim the camera. `snap` places it instantly; otherwise it eases in, ~8%/frame. */
  apply(sampled, snap = false) {
    const p = place(sampled, this.aspect || 1, this.fov);
    this.goal = p;
    if (snap || !this.cur) {
      const [px, py, pz] = p.position, [tx, ty, tz] = p.target;
      this.cur = { px, py, pz, tx, ty, tz };
      this.camera.position.set(px, py, pz);
      this.camera.lookAt(tx, ty, tz);
    }
  }

  setBeats(b) { Object.assign(this.beats, b); }

  frame() {
    if (!this.goal) return;
    const t = this.clock.getElapsedTime();
    const k = this.reduced ? 1 : 0.085;   // the spec's ~8% per-frame smoothing
    const c = this.cur, g = this.goal;
    c.px += (g.position[0] - c.px) * k;
    c.py += (g.position[1] - c.py) * k;
    c.pz += (g.position[2] - c.pz) * k;
    c.tx += (g.target[0] - c.tx) * k;
    c.ty += (g.target[1] - c.ty) * k;
    c.tz += (g.target[2] - c.tz) * k;
    this.camera.position.set(c.px, c.py, c.pz);
    this.camera.lookAt(c.tx, c.ty, c.tz);

    // The shadow camera rides with the subject, so a 2k map is never spread over more
    // than the part of the figure actually in frame.
    if (this.key) {
      this.key.target.position.set(c.tx, c.ty, c.tz);
      this.key.position.set(c.tx + 2.4, c.ty + 2.8, c.tz - 1.5);
    }

    if (!this.reduced && this.ready) {
      // Breathing, kept below the threshold of noticing — it only has to not be a statue.
      this.figure.position.y = Math.sin(t * 0.62) * 0.0038;
      this.figure.rotation.y = Math.sin(t * 0.21) * 0.011;
    }

    this.#beats(t);
    if (this.grade) this.grade.uniforms.uTime.value = t;
    (this.comp ?? this.renderer).render(this.scene, this.camera);
  }

  #beats(t) {
    const b = this.beats;
    const face = (m, v) => { m.visible = v > 0.002; m.material.opacity = v; };

    // Slabs rise out of the palm and turn to meet the camera.
    for (const [slab, v] of [[this.holoA, b.holoA], [this.holoB, b.holoB]]) {
      face(slab, v);
      if (!slab.visible) continue;
      const hand = ANCHORS.handR;
      const wide = (this.aspect ?? 1) >= 1;
      slab.position.x = hand[0] + (wide ? 0.10 : 0.07);
      slab.position.z = hand[2] - (wide ? 0.060 : 0.005);
      slab.position.y = hand[1] + 0.048 + 0.030 * v + (this.reduced ? 0 : Math.sin(t * 0.9) * 0.003);
      slab.lookAt(this.camera.position);
    }
    this.handLight.R.intensity = Math.max(b.holoA, b.holoB) * 0.38;

    this.cards.visible = b.cards > 0.002;
    this.cards.children.forEach((card, i) => {
      // Staggered fan: each card waits its turn, 18% of the beat apart.
      const v = Math.max(0, Math.min(1, (b.cards - i * 0.18) / 0.55));
      card.visible = v > 0.002;
      card.material.opacity = v;
      card.scale.setScalar(0.9 + v * 0.1);
      if (card.visible) card.lookAt(this.camera.position);
    });
    this.handLight.L.intensity = b.cards * 0.38;

    // The mark: always seated on the chest, lit only as far as the stop asks.
    if (this.logo) {
      const lit = b.iris;
      for (const m of this.logoMats) {
        m.emissiveIntensity = /optic/i.test(m.name) ? 0.12 + lit * 0.9 : lit * 0.30;
      }
      if (!this.reduced) this.logoSpin.rotation.y = t * 0.18;
    }
    this.chestLight.intensity = b.iris * 0.22;
    if (this.mesh) this.mesh.material.emissiveIntensity = 1.15 + b.iris * 0.2;

    face(this.ground, b.ground * 0.42);
    this.dust.visible = b.dust > 0.002;
    this.dust.material.opacity = b.dust * 0.20;
    if (this.dust.visible && !this.reduced) {
      const p = this.dust.geometry.attributes.position;
      const rise = this.dustRise;
      for (let i = 0; i < this.dustSeed.length; i++) {
        const s = this.dustSeed[i];
        p.array[i * 3 + 1] = FIGURE.groundY + ((s * rise + t * 0.012 * (0.4 + s)) % rise);
      }
      p.needsUpdate = true;
    }
  }
}
