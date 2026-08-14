import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const scene = root.getDefaultScene() || root.listScenes()[0];
const b = getBounds(scene);
console.log('bounds', JSON.stringify(b));
console.log('size  ', [b.max[0]-b.min[0], b.max[1]-b.min[1], b.max[2]-b.min[2]].map(v=>+v.toFixed(4)));
console.log('meshes', root.listMeshes().length, 'nodes', root.listNodes().length, 'materials', root.listMaterials().length, 'textures', root.listTextures().length);
let tris=0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const i=p.getIndices(), po=p.getAttribute('POSITION'); tris += (i?i.getCount():po.getCount())/3; }
console.log('triangles', Math.round(tris));
for (const n of root.listNodes()) console.log('  node:', n.getName()||'(unnamed)', 'T',n.getTranslation().map(v=>+v.toFixed(3)), 'S',n.getScale().map(v=>+v.toFixed(3)));
for (const m of root.listMaterials()) console.log('  mat:', m.getName()||'(unnamed)', 'base',m.getBaseColorFactor().map(v=>+v.toFixed(2)), 'metal',m.getMetallicFactor(), 'rough',m.getRoughnessFactor(), 'emis',m.getEmissiveFactor(), 'maps: base',!!m.getBaseColorTexture(),'norm',!!m.getNormalTexture());
console.log('primitive attributes:', root.listMeshes()[0]?.listPrimitives()[0]?.listSemantics());
