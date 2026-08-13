import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * <three-d-stage> — 3D object viewer and exporter.
 *
 * Ported from the design project's starter scaffold to run against the locally
 * installed three.js instead of a CDN import map, so it bundles with the rest of
 * the site and cannot drift from the version the scene uses.
 *
 * The stage owns the scene: renderer, studio lighting with a soft ground shadow,
 * orbit controls, a camera auto-framed to the object's bounds, resize handling,
 * and a toolbar that exports the current object as OBJ + MTL or GLB. The
 * lighting here is deliberately neutral — this is for inspecting and exporting
 * an asset, not for presenting the brand.
 *
 * Attributes:
 *   name       — export file basename (default "model")
 *   background — CSS colour behind the scene
 *   autorotate — a slow turntable until the user interacts
 */

const stylesheet = `
  :host { position: relative; display: block; width: 100%; height: 100vh;
          background: var(--stage-bg, #071019); overflow: hidden; }
  canvas { display: block; outline: none; }
  .toolbar { position: absolute; right: 16px; bottom: 16px; display: flex; gap: 8px;
             font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; }
  .toolbar button {
    appearance: none; border: 1px solid rgba(244,244,240,.14); border-radius: 12px;
    background: #0b2972; color: #f4f4f0; font-family: inherit; font-size: 12.5px;
    font-weight: 500; line-height: 1; padding: 11px 14px; white-space: nowrap;
    cursor: pointer; transition: background 150ms cubic-bezier(.2,0,0,1);
  }
  .toolbar button + button { background: transparent; }
  .toolbar button:hover { background: #0e3390; }
  .toolbar button + button:hover { background: rgba(244,244,240,.06); }
  .toolbar button:active { transform: translateY(1px); }
  .toolbar button[disabled] { opacity: .5; pointer-events: none; }
  .note { position: absolute; left: 16px; bottom: 16px; max-width: 60%;
          font: 400 12px/1.5 Inter, -apple-system, sans-serif;
          color: rgba(244,244,240,.45); user-select: none; }
`;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

class ThreeDStage extends HTMLElement {
  private _renderer?: THREE.WebGLRenderer;
  private _scene?: THREE.Scene;
  private _camera?: THREE.PerspectiveCamera;
  private _controls?: OrbitControls;
  private _key?: THREE.DirectionalLight;
  private _ground?: THREE.Mesh;
  private _object?: THREE.Object3D;
  private _ro?: ResizeObserver;
  private _booted = false;
  private _objBtn!: HTMLButtonElement;
  private _glbBtn!: HTMLButtonElement;

  ready: Promise<{ THREE: typeof THREE }>;
  private _readyResolve!: (v: { THREE: typeof THREE }) => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = stylesheet;
    root.appendChild(style);

    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = 'Drag to orbit · scroll to zoom · right-drag to pan';
    root.appendChild(note);

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    this._objBtn = document.createElement('button');
    this._objBtn.type = 'button';
    this._objBtn.textContent = 'Download OBJ + MTL';
    this._objBtn.addEventListener('click', () => void this._exportObj());
    this._glbBtn = document.createElement('button');
    this._glbBtn.type = 'button';
    this._glbBtn.textContent = 'Download GLB';
    this._glbBtn.addEventListener('click', () => void this._exportGlb());
    toolbar.append(this._objBtn, this._glbBtn);
    root.appendChild(toolbar);
    this._setButtonsEnabled(false);

    this.ready = new Promise((resolve) => {
      this._readyResolve = resolve;
    });
  }

  connectedCallback() {
    if (this._booted) {
      if (this._renderer) {
        this._renderer.setAnimationLoop(this._loop);
        this._ro?.observe(this);
      }
      return;
    }
    this._booted = true;
    this._boot();
  }

  disconnectedCallback() {
    this._renderer?.setAnimationLoop(null);
    this._ro?.disconnect();
  }

  private _loop = () => {
    this._controls?.update();
    if (this._renderer && this._scene && this._camera) {
      this._renderer.render(this._scene, this._camera);
    }
  };

  private _boot() {
    const bg = this.getAttribute('background');
    if (bg) this.style.setProperty('--stage-bg', bg);

    // preserveDrawingBuffer keeps the last frame readable after compositing,
    // which is what lets a screenshot capture the scene rather than a blank canvas
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer = renderer;
    this.shadowRoot!.insertBefore(renderer.domElement, this.shadowRoot!.firstChild);

    const scene = new THREE.Scene();
    this._scene = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
    camera.position.set(3, 2.2, 4);
    this._camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = this.hasAttribute('autorotate');
    controls.autoRotateSpeed = 1.2;
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
    });
    this._controls = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0002;
    this._key = key;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
    fill.position.set(-5, 3, -4);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this._ground = ground;
    scene.add(ground);

    const fit = () => {
      const w = this.clientWidth || 1;
      const h = this.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    fit();
    this._ro = new ResizeObserver(fit);
    if (this.isConnected) {
      this._ro.observe(this);
      renderer.setAnimationLoop(this._loop);
    }

    this._readyResolve({ THREE });
  }

  /** Show the object, enable shadows, rest it on the ground and frame it. */
  setObject(object: THREE.Object3D) {
    if (!this._scene || !this._camera || !this._controls) {
      throw new Error('three-d-stage: not ready — await stage.ready first');
    }
    if (this._object) this._scene.remove(this._object);
    this._object = object;
    object.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(object);
    if (!box.isEmpty()) {
      if (this._ground) this._ground.position.y = box.min.y;
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const dist = (sphere.radius / Math.tan((this._camera.fov * Math.PI) / 360)) * 1.35;
      const dir = new THREE.Vector3(1, 0.55, 1.25).normalize();
      this._camera.position.copy(sphere.center).add(dir.multiplyScalar(dist));
      this._camera.near = Math.max(dist / 100, 0.01);
      this._camera.far = dist * 100;
      this._camera.updateProjectionMatrix();
      this._controls.target.copy(sphere.center);
      this._controls.update();
      if (this._key) {
        const span = sphere.radius * 3;
        const cam = this._key.shadow.camera as THREE.OrthographicCamera;
        cam.left = -span;
        cam.right = span;
        cam.top = span;
        cam.bottom = -span;
        cam.updateProjectionMatrix();
      }
    }
    this._scene.add(object);
    this._setButtonsEnabled(true);
  }

  private get _basename() {
    return (this.getAttribute('name') || 'model').replace(/[^\w.-]+/g, '_');
  }

  private _setButtonsEnabled(on: boolean) {
    this._objBtn.disabled = !on;
    this._glbBtn.disabled = !on;
  }

  /** Every mesh and material needs a unique name for the o / usemtl lines. */
  private _nameParts() {
    const mats: THREE.Material[] = [];
    const seen = new Set<string>();
    let meshI = 0;
    let matI = 0;
    this._object?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.name) mesh.name = 'part_' + meshI;
      meshI += 1;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of list) {
        if (!m || mats.includes(m)) continue;
        if (!m.name) {
          m.name = 'mat_' + matI;
          matI += 1;
        }
        while (seen.has(m.name)) {
          m.name = m.name + '_' + matI;
          matI += 1;
        }
        seen.add(m.name);
        mats.push(m);
      }
    });
    return mats;
  }

  private async _exportObj() {
    if (!this._object) return;
    const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
    const mats = this._nameParts();
    const base = this._basename;
    const obj = 'mtllib ' + base + '.mtl\n' + new OBJExporter().parse(this._object);
    let mtl = '# Exported by three-d-stage\n';
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      const c = std.color ?? new THREE.Color(0.8, 0.8, 0.8);
      const rough = typeof std.roughness === 'number' ? std.roughness : 0.5;
      const opacity = typeof std.opacity === 'number' ? std.opacity : 1;
      mtl += 'newmtl ' + m.name + '\n';
      mtl += `Kd ${c.r.toFixed(4)} ${c.g.toFixed(4)} ${c.b.toFixed(4)}\n`;
      mtl += 'Ks 0.2000 0.2000 0.2000\n';
      mtl += 'Ns ' + Math.round((1 - rough) * 200) + '\n';
      mtl += 'd ' + opacity.toFixed(4) + '\n\n';
    }
    download(new Blob([obj], { type: 'text/plain' }), base + '.obj');
    download(new Blob([mtl], { type: 'text/plain' }), base + '.mtl');
  }

  private async _exportGlb() {
    if (!this._object) return;
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    this._nameParts();
    const buf = await new GLTFExporter().parseAsync(this._object, { binary: true });
    download(new Blob([buf as ArrayBuffer], { type: 'model/gltf-binary' }), this._basename + '.glb');
  }
}

if (!customElements.get('three-d-stage')) {
  customElements.define('three-d-stage', ThreeDStage);
}

export type { ThreeDStage };
