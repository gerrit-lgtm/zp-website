/* Turns the Cycles render into what the site actually ships.
 *
 *   node render/frames.mjs render/seq
 *
 * Three jobs:
 *
 * 1. Bloom. Blender 5.2 moved the scene compositor to a node group and the Glare node's
 *    controls onto sockets, so the bloom is done here instead — which is better anyway: it
 *    retunes in seconds instead of requiring a 20-minute re-render.
 * 2. Two sizes. Desktop gets the full width; phones get half, because a phone is the
 *    device least able to afford the download and least able to show the detail.
 * 3. A manifest, so the player knows how many frames exist without guessing.
 */

import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] ?? 'render/seq';
const OUT = 'assets/film';
/* Frames are cached hard, and their filenames never change between renders — so without a
 * build stamp in the path, a returning visitor keeps seeing the previous film for as long as
 * the cache lasts. Content that changes has to change identity. */
const BUILD = process.argv[3] ?? new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const SIZES = [{ w: 2560, q: 76, tag: 'hd' }, { w: 1280, q: 72, tag: 'sd' }];

// Bloom: isolate what is genuinely bright, blur it wide, screen it back over the frame.
// Emissive tracery is the only thing above the threshold, which is exactly what should glow.
const THRESHOLD = 0.62;
const SIGMA = 18;
const STRENGTH = 0.85;

async function bloom(buf) {
  const img = sharp(buf);
  const { width, height } = await img.metadata();
  const { data } = await img.clone().raw().toBuffer({ resolveWithObject: true });

  const bright = Buffer.alloc(width * height * 3);
  for (let i = 0, p = 0; i < width * height; i++, p += 3) {
    const r = data[p] / 255, g = data[p + 1] / 255, b = data[p + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (l <= THRESHOLD) continue;
    const k = ((l - THRESHOLD) / (1 - THRESHOLD)) * STRENGTH;
    bright[p] = Math.min(255, data[p] * k);
    bright[p + 1] = Math.min(255, data[p + 1] * k);
    bright[p + 2] = Math.min(255, data[p + 2] * k);
  }

  const glow = await sharp(bright, { raw: { width, height, channels: 3 } })
    .blur(SIGMA).png().toBuffer();

  return sharp(buf).composite([{ input: glow, blend: 'screen' }]).png().toBuffer();
}

const files = (await readdir(SRC)).filter(f => f.endsWith('.png')).sort();
if (!files.length) { console.error(`no frames in ${SRC}`); process.exit(1); }
for (const s of SIZES) await mkdir(path.join(OUT, BUILD, s.tag), { recursive: true });

const totals = Object.fromEntries(SIZES.map(s => [s.tag, 0]));
for (const [i, f] of files.entries()) {
  const bloomed = await bloom(await sharp(path.join(SRC, f)).toBuffer());
  for (const s of SIZES) {
    const dest = path.join(OUT, BUILD, s.tag, `f_${String(i).padStart(4, '0')}.webp`);
    await sharp(bloomed).resize(s.w).webp({ quality: s.q, effort: 5 }).toFile(dest);
    totals[s.tag] += statSync(dest).size;
  }
  if ((i + 1) % 20 === 0 || i === files.length - 1) {
    process.stdout.write(`\r  ${i + 1}/${files.length} frames`);
  }
}

await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({
  build: BUILD,
  count: files.length,
  sizes: SIZES.map(s => ({ tag: s.tag, width: s.w })),
  pattern: 'f_%04d.webp',
}, null, 2));

console.log(`\n  build ${BUILD}`);
for (const s of SIZES) {
  console.log(`  ${s.tag} ${String(s.w).padStart(5)}px  ${(totals[s.tag] / 1e6).toFixed(1)} MB total, ` +
              `${Math.round(totals[s.tag] / files.length / 1024)} KB/frame`);
}
