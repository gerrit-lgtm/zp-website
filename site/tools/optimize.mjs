import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { weld, simplify, quantize, textureCompress, prune, dedup } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';

await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const RATIO = Number(process.argv[2] ?? 0.3);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read('build-src/armored_suit.glb');

/* The suit's white trim — chest disc, hip and knee plates — is painted at pure #FFF.
 * That is fine in the bright studio the source render used, but on a black stage a
 * pure-white plate is by far the brightest thing in frame: it clips, then bloom turns
 * the chest into a floodlight that swallows the headline. Rolling the top of the
 * highlight range down keeps the trim reading as white against the dark armour while
 * leaving it room to be lit. Done to the texture so every stop inherits it. */
async function compressHighlights(tex, knee = 0.62, ceiling = 0.56) {
  const { data, info } = await sharp(Buffer.from(tex.getImage()))
    .raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  for (let p = 0; p < data.length; p += ch) {
    const r = data[p] / 255, g = data[p + 1] / 255, b = data[p + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (l <= knee) continue;
    const f = (knee + (l - knee) * ((ceiling - knee) / (1 - knee))) / l;
    data[p] = Math.round(r * f * 255);
    data[p + 1] = Math.round(g * f * 255);
    data[p + 2] = Math.round(b * f * 255);
  }
  const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .jpeg({ quality: 95 }).toBuffer();
  tex.setImage(out).setMimeType('image/jpeg');
}
for (const tex of doc.getRoot().listTextures()) await compressHighlights(tex);

await doc.transform(
  dedup(), prune(),
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.002, lockBorder: false }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 88 }),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true)
   .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });

const root = doc.getRoot();
let tris = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount()/3;
await io.write('assets/zp-figure.glb', doc);
console.log(`ratio ${RATIO} -> ${Math.round(tris).toLocaleString()} tris, ${(statSync('assets/zp-figure.glb').size/1e6).toFixed(2)} MB`);
