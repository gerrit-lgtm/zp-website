/* De-lighting.
 *
 *   node tools/delight.mjs render/basecolor.png render/basecolor-flat.png
 *
 * The suit's albedo was produced by projecting photographs onto the mesh, so it has lighting
 * painted into it — soft shadows under the shoulders, glows around the light channels, dark
 * gradients down the flanks. That baked shading then gets lit AGAIN at render time, which is
 * a large part of why the surface reads as a flat photograph rather than a material.
 *
 * A base colour should describe only what the surface IS, never how it happened to be lit.
 * Photographed lighting is low-frequency: it varies slowly across the surface, while the real
 * material detail — panel lines, grain, trim — is high-frequency. Dividing the image by a
 * heavily blurred copy of itself removes the slow variation and keeps the fast, which is the
 * standard trick. The result is flatter and duller on its own, and that is correct: our own
 * lights are supposed to supply the shading.
 */

import sharp from 'sharp';

const SRC = process.argv[2] ?? 'render/basecolor.png';
const DST = process.argv[3] ?? 'render/basecolor-flat.png';
const RADIUS = Number(process.argv[4] ?? 90);   // how slow "slow" is, in pixels
const AMOUNT = Number(process.argv[5] ?? 0.85); // 1 = remove all low-frequency variation

const img = sharp(SRC);
const { width, height } = await img.metadata();
const { data } = await img.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const N = width * height;

// The shading field: luminance with all the detail blurred out of it.
const lum = Buffer.alloc(N);
for (let i = 0, p = 0; i < N; i++, p += 3) {
  lum[i] = Math.round(0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]);
}
const shade = await sharp(lum, { raw: { width, height, channels: 1 } })
  .blur(RADIUS).raw().toBuffer();

// Mean shading, so dividing it out preserves overall exposure rather than washing the map.
let mean = 0;
for (let i = 0; i < N; i++) mean += shade[i];
mean /= N;

const out = Buffer.alloc(N * 3);
for (let i = 0, p = 0; i < N; i++, p += 3) {
  // Guarded: in genuinely black regions the divisor approaches zero and would explode.
  const s = Math.max(12, shade[i]);
  const gain = 1 + AMOUNT * (mean / s - 1);
  out[p] = Math.min(255, data[p] * gain);
  out[p + 1] = Math.min(255, data[p + 1] * gain);
  out[p + 2] = Math.min(255, data[p + 2] * gain);
}

await sharp(out, { raw: { width, height, channels: 3 } }).png().toFile(DST);
console.log(`  de-lit ${width}x${height} -> ${DST} (radius ${RADIUS}px, amount ${AMOUNT})`);
