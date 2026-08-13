import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildIris, IRIS_RADIUS } from './iris';
import { band, chase, smooth, usePrefersReducedMotion, useScrollProgressRef } from '../lib/scroll';

/**
 * The ZeroPoint scene.
 *
 * The object is the identity itself: the machined iris mechanism from
 * `./iris.ts` — outer ring as the closed boundary, five blades taken from the
 * mark and instanced at exactly 72°, a round optic holding the point at (0,0).
 * Scroll drives it through the four Worlds, so the geometry carries the argument
 * rather than decorating it:
 *
 *   hero      the iris at rest, rim-lit, the origin alight
 *   World 01  a hex shell closes over it — sealed and self-contained
 *   World 02  the shell clears and the blades swing open — clarity before code
 *   World 03  a belt of ventures takes up the orbit
 *   World 04  the belt condenses to a constellation and the camera settles back
 *
 * Colour is Dazzling Blue and its rim; there is no second accent, no bloom pass
 * and no noise, per the CI's rules on light and texture.
 */

const DAZZLING = '#2B579A';
const RIM = '#7FA8F0';
const CORE = '#DCE8FF';

/**
 * Where each World sits along page progress.
 *
 * Measured from the `[data-world]` panels rather than hardcoded, because the
 * whole premise is that the geometry and the copy advance together — and a
 * hardcoded band silently drifts the moment a paragraph is added.
 *
 * Each band *completes* as its panel reaches the centre of the viewport, so a
 * reader sitting on World 01's copy sees the shell fully sealed rather than
 * half-sealed. It then holds at 1 while they scroll past, and the next world's
 * band takes the frame over.
 *
 * Falls back to an even split if the panels are not in the DOM.
 */
type Band = readonly [number, number];

function measureWorldBands(): Band[] {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-world]'));
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (!els.length || max <= 0) {
    return [
      [0.14, 0.36],
      [0.34, 0.56],
      [0.54, 0.76],
      [0.74, 0.96],
    ];
  }
  return els.map((el) => {
    const h = el.offsetHeight;
    const centre = el.offsetTop + h / 2 - window.innerHeight / 2;
    return [(centre - h * 0.9) / max, centre / max] as Band;
  });
}

/**
 * The mechanism is modelled at true scale (Ø 260 mm). The camera work and the
 * phase tuning are all expressed against a unit-radius object, so the group is
 * scaled to put the outer ring at radius ~1 rather than re-deriving every
 * distance in millimetres.
 */
const FIT = 1 / IRIS_RADIUS;

type Phase = {
  /** 0 = blades at rest in the mark's own position, 1 = swung fully open */
  open: number;
  /** 0 → 1 as the hex shell seals */
  shell: number;
  /** 0 → 1 as the venture belt spins up */
  belt: number;
  /** 0 → 1 as the belt condenses into the team constellation */
  swarm: number;
  spin: number;
};

function Iris({ phase }: { phase: React.MutableRefObject<Phase> }) {
  const offset = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const scaler = useRef<THREE.Group>(null);
  const iris = useMemo(buildIris, []);
  const { viewport } = useThree();

  useFrame((_, dt) => {
    const p = phase.current;

    // each blade swings about its own post, the way a real iris opens — the
    // stack does not spin about the centre
    const swing = p.open * 0.36;
    iris.bladePivots.forEach((pivot, k) => {
      pivot.rotation.z = chase(pivot.rotation.z, iris.bladeHome[k] + swing, dt, 0.22);
    });

    // the optic is the point of light, not a grey bead — it lifts further as the
    // aperture clears a path for it
    iris.materials.optic.emissiveIntensity = 1.4 + p.open * 1.4;

    if (spinner.current) spinner.current.rotation.z = p.spin * 0.35;
    if (scaler.current) {
      // the mechanism recedes as the ventures take the frame
      const target = FIT * (1 - p.belt * 0.16 - p.swarm * 0.1);
      scaler.current.scale.setScalar(chase(scaler.current.scale.x, target, dt, 0.3));
    }
    if (offset.current) {
      // Landscape puts the mechanism right of centre so the left columns stay
      // clear for type, as the CI's hero does. Portrait has no room for that, so
      // it centres and sits behind the copy instead.
      const wide = viewport.aspect > 1.2;
      offset.current.position.x = wide ? 0.9 : 0;
      offset.current.position.y = wide ? -0.05 : 0.15;
    }
  });

  return (
    <group ref={offset}>
    <group ref={spinner}>
      <group ref={scaler} scale={FIT}>
        <primitive object={iris.group} />
      </group>

      {/* concentric rings: focus, expansion, the ripple of value creation */}
      <mesh>
        <torusGeometry args={[1.34, 0.004, 6, 140]} />
        <meshBasicMaterial color={DAZZLING} transparent opacity={0.3} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.72, 0.003, 6, 140]} />
        <meshBasicMaterial color={DAZZLING} transparent opacity={0.18} />
      </mesh>

      {/* the bloom around the origin — the system's one glow */}
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshBasicMaterial color={RIM} transparent opacity={0.1} toneMapped={false} />
      </mesh>
    </group>
    </group>
  );
}

/** World 01 — sealed and self-contained. Nothing enters, nothing leaks. */
function HexShell({ phase }: { phase: React.MutableRefObject<Phase> }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const s = phase.current.shell;
    m.scale.setScalar(chase(m.scale.x, 0.2 + s * 1.35, dt, 0.28));
    m.rotation.y += dt * 0.12;
    m.rotation.x = 0.3;
    (m.material as THREE.MeshBasicMaterial).opacity = s * 0.5;
    m.visible = s > 0.01;
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color={RIM} wireframe transparent opacity={0} />
    </mesh>
  );
}

/** World 03 — a belt of ventures shares this orbit. */
function OrbitBelt({ phase }: { phase: React.MutableRefObject<Phase> }) {
  const inst = useRef<THREE.InstancedMesh>(null);
  const COUNT = 46;

  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        angle: (i / COUNT) * Math.PI * 2 + (i % 3) * 0.28,
        radius: 1.5 + ((i * 37) % 11) / 26,
        tilt: (((i * 53) % 19) / 19 - 0.5) * 0.5,
        size: 0.016 + ((i * 29) % 7) / 320,
        speed: 0.22 + ((i * 17) % 9) / 42,
      })),
    [],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const t = useRef(0);

  useFrame((_, dt) => {
    const m = inst.current;
    if (!m) return;
    const p = phase.current;
    const show = Math.max(p.belt, p.swarm);
    m.visible = show > 0.01;
    if (!m.visible) return;
    t.current += dt;

    seeds.forEach((s, i) => {
      const a = s.angle + t.current * s.speed;
      // the belt draws inward and lifts as it becomes the team constellation
      const r = s.radius * (1 - p.swarm * 0.55) * (0.55 + show * 0.45);
      dummy.position.set(
        Math.cos(a) * r,
        Math.sin(a) * r * (1 - p.swarm * 0.35) + s.tilt * (1 - p.swarm) * 1.4,
        Math.sin(a * 1.7) * s.tilt * 1.6 + p.swarm * 0.4,
      );
      dummy.scale.setScalar(s.size * (0.5 + show * 0.5) * (1 + p.swarm * 0.9));
      dummy.rotation.set(a, a * 0.7, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    (m.material as THREE.MeshBasicMaterial).opacity = 0.35 + show * 0.55;
  });

  return (
    <instancedMesh ref={inst} args={[undefined, undefined, COUNT]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={CORE} transparent opacity={0} toneMapped={false} />
    </instancedMesh>
  );
}

/** Camera and phase clock — the one place scroll becomes scene state. */
function Rig({ phase }: { phase: React.MutableRefObject<Phase> }) {
  const progress = useScrollProgressRef();
  const reduced = usePrefersReducedMotion();
  const smoothed = useRef(0);
  const bands = useRef<Band[]>([]);

  useEffect(() => {
    const remeasure = () => {
      bands.current = measureWorldBands();
    };
    // the panels are min-height in vh, so their offsets move with the viewport
    remeasure();
    const id = window.setTimeout(remeasure, 300); // after fonts settle the layout
    window.addEventListener('resize', remeasure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', remeasure);
    };
  }, []);

  useFrame(({ camera }, dt) => {
    const raw = progress.current;
    smoothed.current = reduced ? raw : chase(smoothed.current, raw, dt, 0.22);
    const p = smoothed.current;

    const b = bands.current;
    const at = (i: number) => (b[i] ? smooth(band(p, b[i][0], b[i][1])) : 0);
    const w1 = at(0);
    const w2 = at(1);
    const w3 = at(2);
    const w4 = at(3);

    phase.current.shell = w1 * (1 - w2); // seals, then clears for clarity
    phase.current.open = w2 * (1 - w3 * 0.5);
    phase.current.belt = w3;
    phase.current.swarm = w4;
    phase.current.spin = reduced ? 0 : p * 2.4;

    // the camera never reverses direction mid-band: it eases in, then back out
    const z = 4.15 - w1 * 0.35 + w2 * 0.1 + w3 * 0.75 + w4 * 0.45;
    const y = 0.06 + w2 * 0.12 - w4 * 0.16;
    camera.position.x = 0;
    camera.position.y = reduced ? 0 : y;
    camera.position.z = z;
    camera.lookAt(0, 0, 0);

    // probe hook, matching the convention used by the earlier scroll engine:
    // headless panes throttle rAF, so invariants are asserted off this rather
    // than off a screenshot
    (window as unknown as { __zpScene?: unknown }).__zpScene = {
      p, w1, w2, w3, w4, camZ: z, ...phase.current,
    };
  });

  return null;
}

export default function Scene() {
  const phase = useRef<Phase>({ open: 0, shell: 0, belt: 0, swarm: 0, spin: 0 });

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 42, position: [0, 0, 4.15] }}
      // the scene is scenery: it must never eat a scroll or a click
      style={{ pointerEvents: 'none' }}
    >
      {/*
        One strong directional source from the upper left, as the CI's
        photography rules require, plus a dim cool counter-light so the far side
        of the mechanism does not fall to black. No warm fill and no ground
        plane — this is a void, not a studio.
      */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[-3.2, 2.6, 2.6]} intensity={2.8} color={RIM} />
      <directionalLight position={[3.5, -1.5, -2]} intensity={0.5} color={DAZZLING} />
      <pointLight position={[0, 0, 0.35]} intensity={1.8} color={CORE} distance={2.6} />

      <Rig phase={phase} />
      <Iris phase={phase} />
      <HexShell phase={phase} />
      <OrbitBelt phase={phase} />
    </Canvas>
  );
}
