/* Surface maps the asset never shipped.
 *
 * The suit arrives with a base-colour map and nothing else: no roughness, no occlusion.
 * A PBR material with one flat roughness value across 1.85m of armour is a large part of
 * why CG reads as plastic — real metal varies, and panel gaps catch light differently
 * from plates. That variation is recoverable, because the panel lines, plate shading and
 * trim are already painted into the base colour.
 *
 *   zp-figure-orm.webp   R = occlusion, G = roughness, B = metalness (ORM packing, one
 *                        texture bound to several maps — three reads each channel)
 *
 * A derived NORMAL map was tried here and removed. The source is a 4K JPEG, and its
 * compression blocks and painted brushwork do not correspond to real geometry, so the
 * relief rendered as scratches and streaks across the plates. Denoising and cutting the
 * strength reduced the artefacts without ever beating no map at all. Only the channels
 * that describe how the surface responds to light survive; nothing invents surface.
 *
 * Of the ORM channels the renderer currently consumes only roughness: metalness from the
 * map pushed the plates toward chrome, and metal has no diffuse response, so the broad
 * form of the figure vanished. R and B are still written — they cost nothing and the
 * decision may go the other way once the asset gets a real bake.
 */

import sharp from 'sharp';

const SIZE = 2048;
const src = sharp('tools/basecolor.jpg').resize(SIZE, SIZE, { kernel: 'lanczos3' });
const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
const N = SIZE * SIZE;

// Luminance, and a blurred copy of it. The difference is the fine detail; the blur
// itself is the broad shading we use for occlusion.
const lum = new Float32Array(N);
for (let i = 0, p = 0; i < N; i++, p += ch) {
  lum[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
}

const lumU8 = Buffer.alloc(N);
for (let i = 0; i < N; i++) lumU8[i] = Math.round(lum[i] * 255);
const raw1 = { raw: { width: SIZE, height: SIZE, channels: 1 } };

const blurBuf = await sharp(lumU8, raw1).blur(10).raw().toBuffer();
const blur = new Float32Array(N);
for (let i = 0; i < N; i++) blur[i] = blurBuf[i] / 255;

/* ------------------------------------------------------------------ ORM map */

const orm = Buffer.alloc(N * 3);
let seams = 0, trim = 0;
for (let i = 0, p = 0; i < N; i++, p += ch) {
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const l = lum[i];
  const isSeam = b > 95 && b - r > 42 && b - g > 22;   // lit blue tracery
  const isTrim = r > 205 && g > 205 && b > 205;        // white plates

  // Occlusion: broad darkness in the paint is where the plates tuck under each other.
  // Kept shallow — this supplements screen-space AO, it does not replace it.
  const ao = 0.86 + 0.14 * Math.min(1, blur[i] * 2.6);

  // Roughness: panel gaps and dark recesses are rough and dusty; raised plates have
  // been polished by use. This variation is what breaks up the specular.
  let rough = 0.58 - 0.16 * Math.min(1, l * 2.2);
  if (isTrim) rough = 0.42;      // painted trim, satin
  if (isSeam) rough = 0.26;      // glass over the light channels

  // Metalness: armour is metal, the trim is painted, the light channels are glass.
  let metal = 0.55;
  if (isTrim) { metal = 0.20; trim++; }
  if (isSeam) { metal = 0.0; seams++; }

  const o = i * 3;
  orm[o]     = Math.round(Math.min(1, ao) * 255);
  orm[o + 1] = Math.round(Math.max(0.05, Math.min(1, rough)) * 255);
  orm[o + 2] = Math.round(metal * 255);
}
await sharp(orm, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .webp({ quality: 92, effort: 5 }).toFile('assets/zp-figure-orm.webp');

const pct = n => (n / N * 100).toFixed(2) + '%';
console.log(`ORM map    → assets/zp-figure-orm.webp     (seams ${pct(seams)}, trim ${pct(trim)})`);
