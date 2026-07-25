/* How many DEVICE pixels does each body actually occupy at its largest during
   the descent? That is the only honest input to "what resolution should the
   plate be" — a plate smaller than this is being upscaled by the browser at
   the body's biggest moment, which is exactly when it is most visible.

     node tools/measure-draw.mjs [landscape|portrait]

   Works by wrapping drawImage on the 2D context: every body goes through it,
   and the w argument IS the drawn diameter in device px (the canvas is sized
   in device px and drawPlanet/drawCore pass d*2 straight in). */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 8900;
const mode = process.argv[2] || 'landscape';
const VIEW = mode === 'portrait'
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

const src = readFileSync(`${ROOT}assets/js/zp-worlds.js`, 'utf8');
/* Tag each body's sprite so the drawImage hook can attribute the call, then
   publish the instance. Tagging happens at draw time because a plate replaces
   pl.sprite asynchronously. */
const probed = src
  .replace('if (!pl.sprite) return; // still rendering in the deferred queue',
           'if (!pl.sprite) { window.__cull.nosprite[pl.kind] = (window.__cull.nosprite[pl.kind]||0)+1; return; }')
  .replace('if (r < .4) return;',
           'if (r < .4) { window.__cull.small[pl.kind] = (window.__cull.small[pl.kind]||0)+1; return; }')
  .replace('if (o.a < 0.01) continue;',
           'if (o.a < 0.01) { const kk = o.t === "core" ? "core" : o.o.kind; window.__cull.faded[kk] = (window.__cull.faded[kk]||0)+1; continue; }')
  .replace("this.planets.forEach((pl, pi) => { const s = proj(pl.x, pl.y, pl.z); if (s) objs.push({ t: 'p', o: pl, s, a: bodyA(pi + 2) }); });",
           "this.planets.forEach((pl, pi) => { const s = proj(pl.x, pl.y, pl.z); if (s) objs.push({ t: 'p', o: pl, s, a: bodyA(pi + 2) }); else window.__cull.unprojected[pl.kind] = (window.__cull.unprojected[pl.kind]||0)+1; });")
  .replace('ctx.drawImage(pl.sprite, s[0] - d, s[1] - d, d * 2, d * 2);',
           'pl.sprite.__kind = pl.kind; ctx.drawImage(pl.sprite, s[0] - d, s[1] - d, d * 2, d * 2);')
  .replace('ctx.drawImage(this.core.sprite, s[0] - d, s[1] - d, d * 2, d * 2);',
           'this.core.sprite.__kind = "core"; ctx.drawImage(this.core.sprite, s[0] - d, s[1] - d, d * 2, d * 2);')
  .replace('new Worlds();', 'window.__wInst = new Worlds();');
for (const anchor of ['pl.sprite.__kind', 'this.core.sprite.__kind', 'window.__wInst', '__cull.small', '__cull.faded', '__cull.unprojected', '__cull.nosprite'])
  if (!probed.includes(anchor)) throw new Error('probe anchor missing: ' + anchor);

const b = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const pg = await b.newPage(VIEW);
await pg.route('**/zp-worlds.js', r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: probed }));
await pg.addInitScript(() => {
  window.__peak = {};
  window.__peakVis = {};
  window.__srcSize = {};
  window.__tagged = 0; window.__untagged = 0;
  window.__cull = { nosprite: {}, small: {}, faded: {}, unprojected: {} };
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...rest) {
    const k = img && img.__kind;
    if (k) window.__tagged++; else window.__untagged++;
    if (k && rest.length === 4) {
      const w = rest[2];
      if (!(window.__peak[k] >= w)) window.__peak[k] = w;
      /* The emergence fade means a body can be huge while almost invisible.
         Only the size it reaches while actually READABLE sets the resolution
         requirement, so track that separately. */
      if (this.globalAlpha >= 0.6 && !(window.__peakVis[k] >= w)) window.__peakVis[k] = w;
      window.__srcSize[k] = img.naturalWidth || img.width;
    }
    return orig.call(this, img, ...rest);
  };
});
await pg.goto(`http://127.0.0.1:${PORT}/worlds.html`, { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(4000); // let plates decode and the fbm queue drain

/* Walk the whole descent so every body passes through its closest approach.
   Scene progress is a DAMPED follower (`ps += (p - ps) * 0.085`), and under
   SwiftShader the rAF loop runs at a few frames a second — so a fixed delay
   per step leaves ps pinned near zero and only the core (which is exempt from
   the emergence fade) ever draws. Wait for convergence instead. */
const STEPS = 70;
for (let i = 0; i <= STEPS; i++) {
  await pg.evaluate(p => {
    const m = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo(0, m * p);
  }, i / STEPS);
  /* Settle on TWO conditions, both evaluated in-page at poll time: the realised
     scroll has arrived, and the damped follower has caught up to it.
     Two traps, each of which silently reports every body as "never drawn":
       - `Math.abs(ps - p) < eps` alone is true on the FIRST poll of every step,
         because the engine only refreshes `p` inside its own rAF loop and ps
         has already converged to the previous value. The sweep then completes
         having advanced the scene by almost nothing.
       - Reading scrollY back immediately after scrollTo is just as stale:
         worlds.css sets `scroll-behavior: smooth`, so the scroll is animated
         and scrollY still holds the old position when evaluate() returns. */
  await pg.waitForFunction(t => {
    const w = window.__wInst;
    if (!w) return false;
    const m = document.documentElement.scrollHeight - innerHeight;
    const realised = Math.min(1, Math.max(0, window.scrollY / m));
    return Math.abs(realised - t) < 0.002 && Math.abs(w.ps - t) < 0.0025;
  }, i / STEPS, { timeout: 30000 })
    .catch(() => { throw new Error(`scene never settled at step ${i} (p=${i / STEPS})`); });
}

const { peak, peakVis, srcSize, diag } = await pg.evaluate(() => {
  const w = window.__wInst;
  return {
    peak: window.__peak, peakVis: window.__peakVis, srcSize: window.__srcSize,
    diag: {
      tagged: window.__tagged, untagged: window.__untagged, cull: window.__cull,
      spriteTypes: w ? w.planets.map(p => `${p.kind}:${p.sprite ? p.sprite.constructor.name : 'NULL'}`) : [],
      coreSprite: w && w.core.sprite ? w.core.sprite.constructor.name : 'NULL',
    },
  };
});
if (process.env.DEBUG) console.log('diag', JSON.stringify(diag, null, 2));
console.log(`${mode} ${VIEW.viewport.width}x${VIEW.viewport.height} @${VIEW.deviceScaleFactor}x`);
console.log('kind        src   peak  peak@a>=.6   verdict (at readable opacity)');
for (const k of ['core', 'basalt', 'clouds', 'fissure', 'ice']) {
  const p = peak[k], pv = peakVis[k], s = srcSize[k];
  if (p === undefined) { console.log(k.padEnd(9), 'never drawn'); continue; }
  const ratio = (pv || p) / s;
  const verdict = ratio > 1.02 ? `UPSCALED ${ratio.toFixed(2)}x -> wants a ${Math.ceil((pv || p) / 128) * 128}px plate`
    : ratio > 0.75 ? 'well matched' : `downscaled ${(1 / ratio).toFixed(2)}x - headroom`;
  console.log(k.padEnd(9), String(s).padStart(6), String(Math.round(p)).padStart(6),
              String(pv === undefined ? '-' : Math.round(pv)).padStart(11), '  ' + verdict);
}
await b.close();
