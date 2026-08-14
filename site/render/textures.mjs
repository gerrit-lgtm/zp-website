/* Prepares the three texture inputs the Blender scene needs, from the source model.
 *
 *   node render/textures.mjs
 *
 * All three are derived, so they are gitignored and not kept — which means this has to be
 * runnable from nothing but build-src/armored_suit.glb. It is the first step of the render
 * pipeline; scene.py will not load without it.
 *
 *   render/basecolor.png   the model's own albedo, extracted from the GLB
 *   render/glow.png        emissive mask: the blue tracery and trim already in the albedo
 *   render/orm.png         R occlusion, G roughness, B metalness
 */

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const SRC = 'build-src/armored_suit.glb';
const OUT = 'render';
await mkdir(OUT, { recursive: true });

// --- albedo, straight out of the source model
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(SRC);
const tex = doc.getRoot().listTextures()[0];
if (!tex) throw new Error('no texture in ' + SRC);
const albedo = Buffer.from(tex.getImage());
await sharp(albedo).png().toFile(`${OUT}/basecolor.png`);

const SIZE = 2048;
const { data, info } = await sharp(albedo)
  .resize(SIZE, SIZE, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
const N = SIZE * SIZE;

// --- glow: everything in the albedo that is meant to read as lit
const glow = Buffer.alloc(N * 3, 0);
for (let i = 0, p = 0; i < N; i++, p += ch) {
  const r = data[p], g = data[p + 1], b = data[p + 2], o = i * 3;
  if (b > 95 && b - r > 42 && b - g > 22) {
    // Blue tracery, pushed toward the CI's Dazzling Blue rather than the raw texel, so the
    // glow reads as brand light instead of generic sci-fi cyan.
    const k = Math.min(1, (b - 95) / 130);
    glow[o] = Math.round(43 * k + b * 0.10);
    glow[o + 1] = Math.round(87 * k + b * 0.28);
    glow[o + 2] = Math.round(190 * k + b * 0.24);
  } else if (r > 205 && g > 205 && b > 205) {
    // White trim, kept dim: these are large unbroken areas and at seam brightness the chest
    // becomes a floodlight.
    const k = Math.min(1, (Math.min(r, g, b) - 205) / 45);
    glow[o] = Math.round(48 * k); glow[o + 1] = Math.round(62 * k); glow[o + 2] = Math.round(92 * k);
  }
}
await sharp(glow, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .blur(0.6).png().toFile(`${OUT}/glow.png`);

// --- ORM. A single flat roughness across 1.85m of armour is the classic CG tell; this gives
// the surface per-texel variation to break up the specular.
const lumU8 = Buffer.alloc(N);
for (let i = 0, p = 0; i < N; i++, p += ch) {
  lumU8[i] = Math.round(0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]);
}
const blur = await sharp(lumU8, { raw: { width: SIZE, height: SIZE, channels: 1 } })
  .blur(10).raw().toBuffer();

const orm = Buffer.alloc(N * 3);
for (let i = 0, p = 0; i < N; i++, p += ch) {
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const l = lumU8[i] / 255;
  const seam = b > 95 && b - r > 42 && b - g > 22;
  const trim = r > 205 && g > 205 && b > 205;
  const ao = 0.86 + 0.14 * Math.min(1, (blur[i] / 255) * 2.6);
  let rough = 0.58 - 0.16 * Math.min(1, l * 2.2);
  if (trim) rough = 0.42;
  if (seam) rough = 0.26;
  let metal = 0.55;
  if (trim) metal = 0.20;
  if (seam) metal = 0.0;
  const o = i * 3;
  orm[o] = Math.round(Math.min(1, ao) * 255);
  orm[o + 1] = Math.round(Math.max(0.05, Math.min(1, rough)) * 255);
  orm[o + 2] = Math.round(metal * 255);
}
await sharp(orm, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .png().toFile(`${OUT}/orm.png`);

console.log(`  basecolor.png  full-resolution source albedo`);
console.log(`  glow.png       ${SIZE}x${SIZE}`);
console.log(`  orm.png        ${SIZE}x${SIZE}`);
