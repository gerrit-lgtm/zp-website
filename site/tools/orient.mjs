import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('build-src/armored_suit.glb');
const root = doc.getRoot();
const node = root.listNodes()[0];
console.log('node T',node.getTranslation(),'R',node.getRotation(),'S',node.getScale());
const t=node.getTranslation(), s=node.getScale(), q=node.getRotation();
const prim = root.listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION');
const n = pos.getCount();
const arr = pos.getArray();
// assume rotation is identity or axis-aligned; apply q properly
function rot(p,q){const [x,y,z]=p,[qx,qy,qz,qw]=q;
 const ix=qw*x+qy*z-qz*y, iy=qw*y+qz*x-qx*z, iz=qw*z+qx*y-qy*x, iw=-qx*x-qy*y-qz*z;
 return [ix*qw+iw*-qx+iy*-qz-iz*-qy, iy*qw+iw*-qy+iz*-qx-ix*-qz, iz*qw+iw*-qz+ix*-qy-iy*-qx];}
const P=new Float64Array(n*3);
for(let i=0;i<n;i++){
  let p=[arr[i*3]*s[0],arr[i*3+1]*s[1],arr[i*3+2]*s[2]];
  p=rot(p,q);
  P[i*3]=p[0]+t[0];P[i*3+1]=p[1]+t[1];P[i*3+2]=p[2]+t[2];
}
let minY=Infinity,maxY=-Infinity;
for(let i=0;i<n;i++){const y=P[i*3+1];if(y<minY)minY=y;if(y>maxY)maxY=y;}
const H=maxY-minY;
console.log('world Y',minY.toFixed(4),maxY.toFixed(4),'H',H.toFixed(4));
function slabStats(lo,hi){
  const idx=[];
  for(let i=0;i<n;i++){const y=P[i*3+1];if(y>=minY+lo*H&&y<=minY+hi*H)idx.push(i);}
  const out={n:idx.length};
  for(const [name,ax] of [['X',0],['Z',2]]){
    let mn=Infinity,mx=-Infinity,sum=0;
    for(const i of idx){const x=P[i*3+ax];if(x<mn)mn=x;if(x>mx)mx=x;sum+=x;}
    const B=20,h=new Array(B).fill(0);
    for(const i of idx){const x=P[i*3+ax];h[Math.min(B-1,Math.floor((x-mn)/((mx-mn)||1)*B))]++;}
    out[name]={mn:+mn.toFixed(3),mx:+mx.toFixed(3),span:+(mx-mn).toFixed(3),mean:+(sum/idx.length).toFixed(4),hist:h.map(c=>Math.round(c/idx.length*100))};
  }
  return out;
}
console.log('FEET  0-6%   ',JSON.stringify(slabStats(0,0.06)));
console.log('SHIN  8-20%  ',JSON.stringify(slabStats(0.08,0.20)));
console.log('HANDS 40-52% ',JSON.stringify(slabStats(0.40,0.52)));
console.log('CHEST 62-74% ',JSON.stringify(slabStats(0.62,0.74)));
console.log('HEAD  88-100%',JSON.stringify(slabStats(0.88,1.0)));
