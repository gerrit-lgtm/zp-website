/* Capture the canvas engine's own frames at each story beat. This engine
   already implements the exact camera grammar the film needs — falling
   backwards down the outside of the coil, looking back up its own path —
   so its output is the structural truth to hand the image model. */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT=fileURLToPath(new URL('..',import.meta.url));
/* .work/ inside the repo (gitignored) — a session scratchpad gets wiped and
   this harness is meant to outlive the session. OUT=... to override. */
const PORT=process.env.PORT||8900;
/*   node tools/capture-beats.mjs [landscape|portrait] [--with-copy]
   --with-copy keeps the overlay text visible. Use it to check the copy clears
   each subject; omit it to judge the scene alone. */
const mode=process.argv.includes('portrait')?'portrait':'landscape';
const withCopy=process.argv.includes('--with-copy');
const OUT=process.env.OUT||`${ROOT}.work/beats-${mode}${withCopy?'-copy':''}`;
mkdirSync(OUT,{recursive:true});
const VIEW=mode==='portrait'
  ?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}
  :{viewport:{width:1920,height:1080},deviceScaleFactor:1};
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-unsafe-swiftshader']});
const pg=await b.newPage(VIEW);
await pg.goto(`http://127.0.0.1:${PORT}/worlds.html`,{waitUntil:'domcontentloaded'});
await pg.waitForTimeout(6000);            // let every deferred sprite land
/* Hide the copy with visibility, NEVER display:none — that collapses the
   scroll height and every beat then captures an identical frame. */
if(!withCopy) await pg.addStyleTag({content:'main *,#rail,#brand,#talk,#veil{visibility:hidden!important}'});
else await pg.addStyleTag({content:'#veil{visibility:hidden!important}'});
for (let i=0;i<7;i++){
  const p=i/7;
  await pg.evaluate(p=>{const m=document.documentElement.scrollHeight-innerHeight;window.scrollTo(0,m*p);},p);
  await pg.waitForTimeout(2200);
  await pg.screenshot({path:`${OUT}/beat${i}.jpg`,type:'jpeg',quality:94});
  console.log(mode,'beat',i,'p=',p.toFixed(3));
}
await b.close();
