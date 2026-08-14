/* Where exactly is the white disc on the chest?
 * It is painted into the base colour, so its 3D position is only knowable by walking the
 * mesh, sampling the texture at each triangle's UV centroid, and keeping the triangles
 * whose texel is white trim and which face forward on the chest. Area-weighted centroid
 * of those triangles is the disc's true centre. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('build-src/armored_suit.glb');
const root = doc.getRoot();
const s = root.listNodes()[0].getScale()[0];
const prim = root.listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION').getArray();
const UV = prim.getAttribute('TEXCOORD_0').getArray();
const IDX = prim.getIndices().getArray();

const T = 1024;
const { data, info } = await sharp('tools/basecolor.jpg').resize(T, T).raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
const texel = (u, v) => {
  const x = Math.min(T - 1, Math.max(0, Math.round(u * (T - 1))));
  const y = Math.min(T - 1, Math.max(0, Math.round(v * (T - 1))));
  const p = (y * T + x) * ch;
  return [data[p], data[p + 1], data[p + 2]];
};

let cx = 0, cy = 0, cz = 0, wsum = 0, n = 0;
let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity, maxX = -Infinity;
for (let t = 0; t < IDX.length; t += 3) {
  const [a, b, c] = [IDX[t], IDX[t + 1], IDX[t + 2]];
  const px = [], py = [], pz = [];
  for (const i of [a, b, c]) { px.push(P[i * 3] * s); py.push(P[i * 3 + 1] * s); pz.push(P[i * 3 + 2] * s); }
  const mx = (px[0] + px[1] + px[2]) / 3, my = (py[0] + py[1] + py[2]) / 3, mz = (pz[0] + pz[1] + pz[2]) / 3;
  // Front of the chest only: forward-facing, upper torso, near the centreline.
  if (mx < 0.10 || my < 0.30 || my > 0.62 || Math.abs(mz) > 0.16) continue;
  const u = (UV[a * 2] + UV[b * 2] + UV[c * 2]) / 3;
  const v = (UV[a * 2 + 1] + UV[b * 2 + 1] + UV[c * 2 + 1]) / 3;
  const [r, g, bl] = texel(u, v);
  if (!(r > 195 && g > 195 && bl > 195)) continue;   // white trim
  // Triangle area as the weight.
  const e1 = [px[1] - px[0], py[1] - py[0], pz[1] - pz[0]];
  const e2 = [px[2] - px[0], py[2] - py[0], pz[2] - pz[0]];
  const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const w = Math.hypot(...cr) / 2;
  cx += mx * w; cy += my * w; cz += mz * w; wsum += w; n++;
  minY = Math.min(minY, my); maxY = Math.max(maxY, my);
  minZ = Math.min(minZ, mz); maxZ = Math.max(maxZ, mz);
  maxX = Math.max(maxX, mx);
}
console.log('white-trim triangles on the chest front:', n);
console.log('disc centre      ', [cx / wsum, cy / wsum, cz / wsum].map(v => +v.toFixed(4)));
console.log('disc extent  Y   ', [+minY.toFixed(4), +maxY.toFixed(4)], 'height', +(maxY - minY).toFixed(4));
console.log('disc extent  Z   ', [+minZ.toFixed(4), +maxZ.toFixed(4)], 'width ', +(maxZ - minZ).toFixed(4));
console.log('front surface X  ', +maxX.toFixed(4));
