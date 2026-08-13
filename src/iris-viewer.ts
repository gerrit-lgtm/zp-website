import './three/three-d-stage';
import type { ThreeDStage } from './three/three-d-stage';
import { buildIris } from './three/iris';

/**
 * The iris asset page. Orbit it, then export OBJ + MTL or GLB.
 *
 * The GLB is the one to take into Blender for the loop render: the five-fold
 * symmetry is exact by construction, so a 72.000° rotation about Z returns every
 * vertex to its start and the loop is frame-perfect — no drift, no morphing
 * geometry, which is what an AI video model cannot guarantee.
 */
const stage = document.querySelector('three-d-stage') as ThreeDStage | null;

if (stage) {
  void stage.ready.then(() => {
    stage.setObject(buildIris().group);
  });
}
