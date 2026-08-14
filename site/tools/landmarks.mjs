import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { writeFileSync } from 'node:fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('build-src/armored_suit.glb');
const root = doc.getRoot();
const node = root.listNodes()[0];
const s = node.getScale()[0];
const prim = root.listMeshes()[0].listPrimitives()[0];
const arr = prim.getAttribute('POSITION').getArray();
const n = prim.getAttribute('POSITION').getCount();
const P = new Float64Array(n*3);
for (let i=0;i<n*3;i++) P[i]=arr[i]*s;

let minY=Infinity,maxY=-Infinity;
for(let i=0;i<n;i++){const y=P[i*3+1];if(y<minY)minY=y;if(y>maxY)maxY=y;}
const H=maxY-minY;
const yAt=f=>minY+f*H;

function centroid(pred){
  let cx=0,cy=0,cz=0,c=0;
  for(let i=0;i<n;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];
    if(pred(x,y,z)){cx+=x;cy+=y;cz+=z;c++;}}
  return c?[+(cx/c).toFixed(4),+(cy/c).toFixed(4),+(cz/c).toFixed(4),c]:null;
}
function extremeX(pred){ let best=-Infinity,p=null;
  for(let i=0;i<n;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];
    if(pred(x,y,z)&&x>best){best=x;p=[+x.toFixed(4),+y.toFixed(4),+z.toFixed(4)];}}
  return p;}

// --- head: top 12%
const head = centroid((x,y)=>y>yAt(0.88));
// --- helmet visor: most forward point in head region
const visor = extremeX((x,y,z)=>y>yAt(0.86)&&y<yAt(0.97));
// --- hands: find Z extremes, then cluster around them
let zMin=Infinity,zMax=-Infinity;
for(let i=0;i<n;i++){const y=P[i*3+1],z=P[i*3+2];
  if(y>yAt(0.35)&&y<yAt(0.58)){if(z<zMin)zMin=z;if(z>zMax)zMax=z;}}
const handR = centroid((x,y,z)=>y>yAt(0.35)&&y<yAt(0.58)&&z<zMin+0.055); // screen-right (-Z)
const handL = centroid((x,y,z)=>y>yAt(0.35)&&y<yAt(0.58)&&z>zMax-0.055); // screen-left (+Z)
// --- chest: forward-most surface near sternum height, centre column
const chestY = yAt(0.72);
const chest = extremeX((x,y,z)=>Math.abs(y-chestY)<0.045&&Math.abs(z)<0.05);
// --- shoulders width
let shZ=0; for(let i=0;i<n;i++){const y=P[i*3+1],z=P[i*3+2];if(y>yAt(0.78)&&y<yAt(0.84))shZ=Math.max(shZ,Math.abs(z));}
// --- feet
const feet = centroid((x,y)=>y<yAt(0.035));
const footR = centroid((x,y,z)=>y<yAt(0.05)&&z<-0.05);
const footL = centroid((x,y,z)=>y<yAt(0.05)&&z>0.05);
// --- overall
let cx=0,cy=0,cz=0; for(let i=0;i<n;i++){cx+=P[i*3];cy+=P[i*3+1];cz+=P[i*3+2];}
const out = {
  height:+H.toFixed(4), groundY:+minY.toFixed(4), topY:+maxY.toFixed(4),
  centroid:[+(cx/n).toFixed(4),+(cy/n).toFixed(4),+(cz/n).toFixed(4)],
  head:head.slice(0,3), visor, chest, handR:handR.slice(0,3), handL:handL.slice(0,3),
  feet:feet.slice(0,3), footR:footR.slice(0,3), footL:footL.slice(0,3),
  shoulderHalfWidth:+shZ.toFixed(4), handSpan:+(zMax-zMin).toFixed(4)
};
console.log(JSON.stringify(out,null,2));
writeFileSync('tools/landmarks.json', JSON.stringify(out,null,2));
