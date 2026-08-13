import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { band, chase, smooth, usePrefersReducedMotion, useScrollProgressRef } from '../lib/scroll';

/**
 * The ZeroPoint scene.
 *
 * The object is the identity itself, in three dimensions: the outer ring is the
 * zero — "a closed, complete boundary" — five blades sweep the aperture, and a
 * round optic holds the point at (0,0). Scroll drives it through the four
 * Worlds, so the geometry carries the argument rather than decorating it:
 *
 *   hero      the iris at rest, rim-lit, the origin alight
 *   World 01  a hex shell closes over it — sealed and self-contained
 *   World 02  the shell clears and the blades open — clarity before code
 *   World 03  a belt of ventures takes up the orbit
 *   World 04  the belt condenses to a constellation and the camera settles back
 *
 * Colour is Dazzling Blue and its rim; there is no second accent, no bloom pass
 * and no noise, per the CI's rules on light and texture.
 */

const DAZZLING = '#2B579A';
const RIM = '#7FA8F0';
const CORE = '#DCE8FF';

/** Where each World sits along page progress. */
const W1 = [0.14, 0.36] as const;
const W2 = [0.34, 0.56] as const;
const W3 = [0.54, 0.76] as const;
const W4 = [0.74, 0.96] as const;

type Phase = {
  /** 0 = iris closed, 1 = fully open */
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
  const group = useRef<THREE.Group>(null);
  const blades = useRef<THREE.Group>(null);
  const optic = useRef<THREE.Mesh>(null);

  // five blades, each a curved sweep — the aperture "through which compute
  // becomes product". Built once; only their rotation animates.
  // The arc overlaps the 72° spacing, the way the blades overlap in the mark. Five
  // coplanar arcs would fuse into a single ring, so each one is offset in depth
  // and tilted — the overlap has to read as layering, not as a circle.
  const bladeGeometry = useMemo(() => new THREE.TorusGeometry(0.72, 0.052, 12, 96, 1.5), []);

  useFrame((_, dt) => {
    const p = phase.current;
    if (blades.current) {
      // opening rolls every blade back off the centre together
      const target = -0.42 - p.open * 0.72;
      blades.current.children.forEach((child, i) => {
        const base = (i / 5) * Math.PI * 2;
        child.rotation.z = chase(child.rotation.z, base + target, dt, 0.22);
      });
    }
    if (group.current) {
      group.current.rotation.z = p.spin * 0.35;
      // the iris recedes as the ventures take the frame
      const s = 1 - p.belt * 0.16 - p.swarm * 0.1;
      group.current.scale.setScalar(chase(group.current.scale.x, s, dt, 0.3));
    }
    if (optic.current) {
      const mat = optic.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + p.open * 0.45;
    }
  });

  return (
    <group ref={group}>
      {/* the zero — the complete boundary */}
      <mesh>
        <torusGeometry args={[1, 0.009, 8, 160]} />
        <meshBasicMaterial color={RIM} transparent opacity={0.75} />
      </mesh>

      {/* concentric rings: focus, expansion, the ripple of value creation */}
      <mesh>
        <torusGeometry args={[1.34, 0.004, 6, 140]} />
        <meshBasicMaterial color={DAZZLING} transparent opacity={0.3} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.72, 0.003, 6, 140]} />
        <meshBasicMaterial color={DAZZLING} transparent opacity={0.18} />
      </mesh>

      <group ref={blades}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            geometry={bladeGeometry}
            position={[0, 0, (i - 2) * 0.028]}
            rotation={[0.06, 0, 0]}
          >
            <meshStandardMaterial
              color="#121D2E"
              metalness={0.9}
              roughness={0.22}
              emissive={DAZZLING}
              emissiveIntensity={0.35}
            />
          </mesh>
        ))}
      </group>

      {/* the origin (0,0) — where value begins. toneMapped off so the core stays
          hot instead of being rolled off by the filmic curve. */}
      <mesh ref={optic}>
        <sphereGeometry args={[0.105, 48, 48]} />
        <meshBasicMaterial color={CORE} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.26, 32, 32]} />
        <meshBasicMaterial color={RIM} transparent opacity={0.12} toneMapped={false} />
      </mesh>
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
    const target = 0.2 + s * 1.35;
    m.scale.setScalar(chase(m.scale.x, target, dt, 0.28));
    m.rotation.y += dt * 0.12;
    m.rotation.x = 0.3;
    const mat = m.material as THREE.MeshBasicMaterial;
    // fades in as it seals, and clears again for World 02
    mat.opacity = s * 0.5;
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
      const sc = s.size * (0.5 + show * 0.5) * (1 + p.swarm * 0.9);
      dummy.scale.setScalar(sc);
      dummy.rotation.set(a, a * 0.7, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;

    const mat = m.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.35 + show * 0.55;
  });

  return (
    <instancedMesh ref={inst} args={[undefined, undefined, COUNT]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={CORE} transparent opacity={0} />
    </instancedMesh>
  );
}

/** Camera and phase clock — the one place scroll becomes scene state. */
function Rig({ phase }: { phase: React.MutableRefObject<Phase> }) {
  const progress = useScrollProgressRef();
  const reduced = usePrefersReducedMotion();
  const smoothed = useRef(0);

  useFrame(({ camera }, dt) => {
    const raw = progress.current;
    smoothed.current = reduced ? raw : chase(smoothed.current, raw, dt, 0.22);
    const p = smoothed.current;

    const w1 = smooth(band(p, W1[0], W1[1]));
    const w2 = smooth(band(p, W2[0], W2[1]));
    const w3 = smooth(band(p, W3[0], W3[1]));
    const w4 = smooth(band(p, W4[0], W4[1]));

    phase.current.shell = w1 * (1 - w2); // seals, then clears for clarity
    phase.current.open = w2 * (1 - w3 * 0.5);
    phase.current.belt = w3;
    phase.current.swarm = w4;
    phase.current.spin = reduced ? 0 : p * 2.4;

    // the camera never reverses direction mid-band: it eases out, in, then back
    const z = 3.25 - w1 * 0.35 + w2 * 0.1 + w3 * 0.75 + w4 * 0.45;
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
      camera={{ fov: 42, position: [0, 0, 3.25] }}
      // the scene is scenery: it must never eat a scroll or a click
      style={{ pointerEvents: 'none' }}
    >
      {/* one strong directional source, per the CI's photography rules */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[-3, 2.5, 2.5]} intensity={2.2} color={RIM} />
      <pointLight position={[0, 0, 0.4]} intensity={2.4} color={CORE} distance={3} />

      <Rig phase={phase} />
      <Iris phase={phase} />
      <HexShell phase={phase} />
      <OrbitBelt phase={phase} />
    </Canvas>
  );
}
