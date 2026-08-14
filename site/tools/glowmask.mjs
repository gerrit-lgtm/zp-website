import sharp from 'sharp';

// The suit ships with a base-colour map only. Everything that reads as "lit" in the
// source render — the blue seam tracery, the visor band, the chest disc and the white
// hip/knee accents — is baked into that map as saturated blue or near-white pixels.
// Isolating those two families gives us the emissive map the asset never had.
const SIZE = 2048;
const src = sharp('tools/basecolor.jpg').resize(SIZE, SIZE, { kernel: 'lanczos3' });
const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
const out = Buffer.alloc(SIZE * SIZE * 3, 0);

let seam = 0, accent = 0;
for (let i = 0, p = 0; i < SIZE * SIZE; i++, p += ch) {
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const o = i * 3;
  if (b > 95 && b - r > 42 && b - g > 22) {
    // Blue tracery: push toward the CI's Dazzling Blue rather than the raw texel,
    // so the glow reads as brand light instead of generic sci-fi cyan.
    const k = Math.min(1, (b - 95) / 130);
    out[o] = Math.round(43 * k + b * 0.10);
    out[o + 1] = Math.round(87 * k + b * 0.28);
    out[o + 2] = Math.round(190 * k + b * 0.24);
    seam++;
  } else if (r > 205 && g > 205 && b > 205) {
    // White trim — the chest disc, hip and knee accents. Kept deliberately dim: these
    // are large unbroken areas, and at seam brightness the chest becomes a floodlight
    // that washes out the whole torso. They read as lit plate; the WP3 logo moment
    // supplies its own glow on top.
    const k = Math.min(1, (Math.min(r, g, b) - 205) / 45);
    out[o] = Math.round(48 * k); out[o + 1] = Math.round(62 * k); out[o + 2] = Math.round(92 * k);
    accent++;
  }
}
await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .blur(0.6).webp({ quality: 82 }).toFile('assets/zp-figure-glow.webp');
const pct = n => (n / (SIZE * SIZE) * 100).toFixed(2) + '%';
console.log(`glow map: seams ${pct(seam)}, accents ${pct(accent)} -> assets/zp-figure-glow.webp`);
