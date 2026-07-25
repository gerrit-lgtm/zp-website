/* Render one procedural sprite to a square image on pure black, ready to be
   upscaled. The disc is already at the engine's exact 0.68 contract, so the
   upscale (which cannot reframe) returns it still at 0.68 — no refitting. */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT=fileURLToPath(new URL('..',import.meta.url));
const OUT=process.env.OUT||`${ROOT}.work`;
mkdirSync(OUT,{recursive:true});
const PORT=process.env.PORT||8900;
/*   node tools/sprite-out.mjs <kind> [size]
   `size` overrides spriteSize(). The shader is procedural and therefore
   resolution-independent, so rendering the SOURCE larger than the engine's
   runtime sprite costs nothing but time and gives the upscaler more to work
   with — worth it when the target plate is bigger than 2x the runtime sprite
   (clouds is drawn at up to 3067 device px). */
const kind=process.argv[2];
const sizeArg=process.argv[3]?Number(process.argv[3]):0;
const src=readFileSync(`${ROOT}assets/js/zp-worlds.js`,'utf8').replace('new Worlds();','window.__W=Worlds;');
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:800,height:600}});
await pg.route('**/zp-worlds.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:src}));
await pg.goto(`http://127.0.0.1:${PORT}/worlds.html`,{waitUntil:'domcontentloaded'});
await pg.waitForTimeout(1500);
const b64=await pg.evaluate(({kind,sizeArg})=>{
  const inst=Object.create(window.__W.prototype); inst.dpr=1;
  const S=sizeArg||inst.spriteSize(kind);
  const sp=document.createElement('canvas'); sp.width=sp.height=S;
  const sc=sp.getContext('2d'); const img=sc.createImageData(S,S);
  inst.renderSpriteRows(img.data,kind,S,0,S); sc.putImageData(img,0,0);
  const cv=document.createElement('canvas'); cv.width=cv.height=S;
  const ct=cv.getContext('2d'); ct.fillStyle='#000'; ct.fillRect(0,0,S,S); ct.drawImage(sp,0,0);
  return cv.toDataURL('image/jpeg',0.96).split(',')[1];
},{kind,sizeArg});
writeFileSync(`${OUT}/sprite-${kind}${sizeArg?'-'+sizeArg:''}.jpg`,Buffer.from(b64,'base64'));
console.log(`wrote ${OUT}/sprite-${kind}${sizeArg?'-'+sizeArg:''}.jpg`);
await b.close();
