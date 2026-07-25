/* THE CAMERA INVARIANT: across the whole descent, every body enters the frame
   exactly ONCE, holds, and leaves exactly once. A body that exits and re-enters
   reads as a continuity break — the camera appears to double back.

     node tools/scroll-sweep.mjs [landscape|portrait] [steps] [cyOverride]

   Verified on two metrics, because they fail differently:
     any    — any part of the body's disc is within the frame
     centre — the body's CENTRE is within the frame
   Header note 13 records that portrait holds on `any` while `centre` still
   clips at the seams in a 390px frame, the body never fully leaving view. So a
   centre-metric run of 2 in portrait is the known, accepted state — compare
   against the baseline before and after a change rather than demanding 1.

   Works by probe injection through page.route: the shipped file is untouched. */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 8900;
const mode = process.argv[2] || 'landscape';
const STEPS = Number(process.argv[3] || 100);
const cyOverride = process.argv[4];
const VIEW = mode === 'portrait'
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

let src = readFileSync(`${ROOT}assets/js/zp-worlds.js`, 'utf8');
if (cyOverride) {
  const A = 'const cy = H * (portrait ? 0.40 : 0.50);';
  if (!src.includes(A)) throw new Error('cy anchor missing');
  src = src.replace(A, `const cy = H * (portrait ? ${cyOverride} : 0.50);`);
}
/* Publish each body's projected screen position, radius and fade alpha for the
   frame currently on screen. Hooking drawPlanet/drawCore would only see bodies
   that survive the cull, which is the very thing under test — so sample from
   the draw loop's own object list instead. */
const A_OBJS = 'objs.sort((a, b) => b.s[2] - a.s[2]);';
if (!src.includes(A_OBJS)) throw new Error('objs anchor missing');
src = src.replace(A_OBJS, A_OBJS + `
      window.__frame = objs.map(o => ({
        kind: o.t === 'core' ? 'core' : o.o.kind,
        x: o.s[0], y: o.s[1], a: o.a,
        r: foc * (o.t === 'core' ? this.core.r : o.o.r) / this.trueDist(o.t === 'core' ? this.core : o.o),
      }));
      window.__W = W; window.__H = H;`);
src = src.replace('new Worlds();', 'window.__wInst = new Worlds();');

const b = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const pg = await b.newPage(VIEW);
await pg.route('**/zp-worlds.js', r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: src }));
await pg.goto(`http://127.0.0.1:${PORT}/worlds.html`, { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(5000);

const KINDS = ['core', 'basalt', 'clouds', 'fissure', 'ice'];
const seenAny = {}, seenCentre = {};
KINDS.forEach(k => { seenAny[k] = []; seenCentre[k] = []; });

for (let i = 0; i <= STEPS; i++) {
  await pg.evaluate(p => {
    const m = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo(0, m * p);
  }, i / STEPS);
  /* Settle on the realised scroll AND the damped follower — see the long note
     in tools/measure-draw.mjs; waiting on |ps - p| alone silently no-ops. */
  await pg.waitForFunction(t => {
    const w = window.__wInst;
    if (!w) return false;
    const m = document.documentElement.scrollHeight - innerHeight;
    return Math.abs(window.scrollY / m - t) < 0.002 && Math.abs(w.ps - t) < 0.0025;
  }, i / STEPS, { timeout: 30000 })
    .catch(() => { throw new Error(`scene never settled at step ${i}`); });

  const f = await pg.evaluate(() => ({ objs: window.__frame || [], W: window.__W, H: window.__H }));
  for (const k of KINDS) {
    const o = f.objs.find(o => o.kind === k);
    const vis = !!o && o.a > 0.01 &&
      o.x + o.r > 0 && o.x - o.r < f.W && o.y + o.r > 0 && o.y - o.r < f.H;
    const cen = !!o && o.a > 0.01 && o.x > 0 && o.x < f.W && o.y > 0 && o.y < f.H;
    seenAny[k].push(vis); seenCentre[k].push(cen);
  }
}

const runs = arr => {
  let n = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] && !arr[i - 1]) n++;
  return n;
};
console.log(`${mode} ${VIEW.viewport.width}x${VIEW.viewport.height}, ${STEPS} steps` +
            (cyOverride ? `, portrait cy=${cyOverride}` : ''));
console.log('kind      any-visible runs   centre-visible runs');
let bad = 0;
for (const k of KINDS) {
  const ra = runs(seenAny[k]), rc = runs(seenCentre[k]);
  if (ra > 1) bad++;
  console.log(k.padEnd(9), String(ra).padStart(11), String(rc).padStart(21),
              ra > 1 ? '   <-- ENTERS MORE THAN ONCE' : '');
}
console.log(bad ? `FAIL: ${bad} body(s) violate enter-once on the any-visible metric`
                : 'OK: every body enters once on the any-visible metric');
await b.close();
