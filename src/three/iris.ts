import * as THREE from 'three';

/**
 * The ZeroPoint iris mechanism, in real-world metres — Ø 260 mm.
 *
 * The blade profile is taken verbatim from one blade of the mark in
 * `zeropoint-icon.svg` and instanced five times at exactly 72°. The mark's own
 * five blades are hand-drawn and each slightly different; instancing a single
 * profile makes the five-fold symmetry exact, which is what lets a 72° rotation
 * be a frame-perfect loop.
 *
 * Every mesh and material is named, so an OBJ export carries readable `o` and
 * `usemtl` lines and a GLB opens with a sane outliner.
 *
 * Units: metres, centred on the origin, optical axis +Z.
 */

/** One blade of the mark. SVG space: centre (1032.41, 852.24), 1 unit = 0.3 mm. */
const BLADE_D =
  'M 1068.02 465.728 C 1093.84 468.984 1111.31 471.944 1136.6 478.92 C 1235.53 506.902 1319.35 572.918 1369.74 662.532 C 1353.98 716.074 1325.12 770.136 1295.1 816.839 C 1280.75 838.811 1254.86 874.345 1236.61 893.178 C 1252.04 771.956 1192.17 633.248 1125.39 534.637 C 1109.29 510.858 1087.59 486.671 1068.02 465.728 z';

const CX = 1032.41;
const CY = 852.24;
const S = 0.0003;

const mx = (v: number) => (v - CX) * S;
/** SVG y runs down; flip it so the mark reads correctly from +Z. */
const my = (v: number) => -(v - CY) * S;

/** Minimal SVG path reader — this one path only ever uses M, C and z. */
function pathToShape(d: string): THREE.Shape {
  const t = d.trim().split(/\s+/);
  const shape = new THREE.Shape();
  for (let i = 0; i < t.length; ) {
    const cmd = t[i++];
    if (cmd === 'M') shape.moveTo(mx(+t[i++]), my(+t[i++]));
    else if (cmd === 'L') shape.lineTo(mx(+t[i++]), my(+t[i++]));
    else if (cmd === 'C')
      shape.bezierCurveTo(
        mx(+t[i++]),
        my(+t[i++]),
        mx(+t[i++]),
        my(+t[i++]),
        mx(+t[i++]),
        my(+t[i++]),
      );
    else if (cmd === 'z' || cmd === 'Z') shape.closePath();
  }
  return shape;
}

/* Geometry constants, all in metres. */
const Ri = 0.1185; // ring inner radius
const Ro = 0.13; // ring outer radius — Ø 260 mm
const Rg = 0.1272; // groove radius
const D = 0.014; // ring half-depth
const c = 0.0015; // chamfer
const TH = 0.0038; // blade thickness
const STEP = 0.0046; // Z step between blades in the stack
const R_PIN = 0.1085; // pivot post radius
const BLADES = 5;
const TURN = (2 * Math.PI) / BLADES;

/**
 * Metalness stays at or below 0.4 throughout: the scene carries no environment
 * map, and a high-metalness surface with nothing to reflect renders near-black.
 * The metal read comes from a brighter base colour instead.
 */
export function irisMaterials() {
  return {
    blade: new THREE.MeshStandardMaterial({
      name: 'blade-charcoal',
      color: 0x333b45,
      roughness: 0.42,
      metalness: 0.35,
    }),
    ring: new THREE.MeshStandardMaterial({
      name: 'ring-steel',
      color: 0x6f7d8c,
      roughness: 0.34,
      metalness: 0.38,
    }),
    housing: new THREE.MeshStandardMaterial({
      name: 'housing-navy',
      color: 0x0e1c38,
      roughness: 0.55,
      metalness: 0.25,
    }),
    pivot: new THREE.MeshStandardMaterial({
      name: 'pivot-steel',
      color: 0x4a5665,
      roughness: 0.22,
      metalness: 0.4,
    }),
    optic: new THREE.MeshStandardMaterial({
      name: 'optic-light',
      color: 0xf4f4f0,
      roughness: 0.1,
      metalness: 0,
      emissive: 0xdfe8ff,
      emissiveIntensity: 0.45,
    }),
  };
}

export type Iris = {
  group: THREE.Group;
  /** One group per blade, pivoted on its post — rotate .rotation.z to swing it */
  bladePivots: THREE.Group[];
  /** Each blade's home rotation, so a swing can be applied as an offset */
  bladeHome: number[];
  optic: THREE.Mesh;
  materials: ReturnType<typeof irisMaterials>;
};

export function buildIris(): Iris {
  const materials = irisMaterials();
  const group = new THREE.Group();
  group.name = 'zeropoint-iris';

  /* --- outer ring: machined annulus with a shallow groove around its rim --- */
  const profile = (
    [
      [Ri, -D + c],
      [Ri + c, -D],
      [Ro - c, -D],
      [Ro, -D + c],
      [Ro, -0.008],
      [Rg, -0.006],
      [Rg, 0.006],
      [Ro, 0.008],
      [Ro, D - c],
      [Ro - c, D],
      [Ri + c, D],
      [Ri, D - c],
      [Ri, -D + c],
    ] as const
  ).map(([r, y]) => new THREE.Vector2(r, y));
  const ring = new THREE.Mesh(new THREE.LatheGeometry(profile, 168), materials.ring);
  ring.name = 'outer-ring';
  ring.rotation.x = Math.PI / 2; // lathe axis Y → optical axis Z
  group.add(ring);

  /* --- housing race: thin dark ring seated behind the blade stack --- */
  const raceProfile = (
    [
      [0.1005, -0.00095],
      [0.102, -0.00125],
      [Ri - 0.0006, -0.00125],
      [Ri - 0.0006, 0.00125],
      [0.102, 0.00125],
      [0.1005, 0.00095],
      [0.1005, -0.00095],
    ] as const
  ).map(([r, y]) => new THREE.Vector2(r, y));
  const race = new THREE.Mesh(new THREE.LatheGeometry(raceProfile, 168), materials.housing);
  race.name = 'housing-race';
  race.rotation.x = Math.PI / 2;
  race.position.z = -0.0122;
  group.add(race);

  /* --- five blades: one profile, instanced at exactly 72° --- */
  const shape = pathToShape(BLADE_D);
  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: TH,
    bevelEnabled: true,
    bevelThickness: 0.0009,
    bevelSize: 0.0009,
    bevelSegments: 2,
    curveSegments: 48,
  });
  bladeGeo.translate(0, 0, -TH / 2);

  // the pivot sits under the blade's outermost point — the tip that "ends
  // exactly at its target point" in the mark
  const pts = shape.getPoints(160);
  let tip = pts[0];
  for (const p of pts) if (p.length() > tip.length()) tip = p;
  const tipAngle = Math.atan2(tip.y, tip.x);
  const pin0 = new THREE.Vector2(Math.cos(tipAngle) * R_PIN, Math.sin(tipAngle) * R_PIN);

  /*
   * Each blade hangs off its own pivot group so it can swing about its post,
   * the way a real iris blade does, rather than the whole stack spinning about
   * the centre. The group carries the blade's home rotation, and the mesh is
   * offset by -pin0 so that at swing 0 the blade lands exactly where the mark
   * puts it.
   */
  const bladePivots: THREE.Group[] = [];
  const bladeHome: number[] = [];
  for (let k = 0; k < BLADES; k++) {
    const home = -k * TURN;
    const px = Math.cos(tipAngle + home) * R_PIN;
    const py = Math.sin(tipAngle + home) * R_PIN;

    const pivot = new THREE.Group();
    pivot.name = 'blade-pivot-' + (k + 1);
    pivot.position.set(px, py, -2 * STEP + k * STEP);
    pivot.rotation.z = home;

    const blade = new THREE.Mesh(bladeGeo, materials.blade);
    blade.name = 'blade-' + (k + 1);
    blade.position.set(-pin0.x, -pin0.y, 0);
    pivot.add(blade);

    group.add(pivot);
    bladePivots.push(pivot);
    bladeHome.push(home);
  }

  /* --- pivot posts, one per blade, on the same 72° division --- */
  const pinGeo = new THREE.CylinderGeometry(0.0038, 0.0038, 0.0215, 24);
  for (let k = 0; k < BLADES; k++) {
    const a = tipAngle - k * TURN;
    const pin = new THREE.Mesh(pinGeo, materials.pivot);
    pin.name = 'pivot-post-' + (k + 1);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(Math.cos(a) * R_PIN, Math.sin(a) * R_PIN, -0.0025);
    group.add(pin);
  }

  /* --- centre optic: the point where value begins --- */
  const optic = new THREE.Mesh(new THREE.SphereGeometry(0.0225, 64, 48), materials.optic);
  optic.name = 'centre-optic';
  group.add(optic);

  return { group, bladePivots, bladeHome, optic, materials };
}

/** Ø 260 mm outer radius, for callers that need to frame or rescale it. */
export const IRIS_RADIUS = Ro;
