/* Mean frame time across the descent. The absolute numbers mean little — this
   runs on SwiftShader, which is far slower than a real GPU — but the RELATIVE
   figure before and after a change is exactly what you need when spending a
   render budget on more particles.

     node tools/perf-check.mjs [landscape|portrait]

   Samples at several scroll positions because cost is wildly uneven: the dust
   and star buckets near a body are far heavier than the empty stretches. */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 8900;
const mode = process.argv[2] || 'landscape';
const VIEW = mode === 'portrait'
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

/* Time draw() itself, not the frame interval. The rAF loop is vsync-limited —
   on a 120 Hz display every frame reads as 8.3 ms no matter how much or how
   little the scene costs, so the frame interval says nothing until the scene is
   already too slow to hit refresh. */
const src = readFileSync(`${ROOT}assets/js/zp-worlds.js`, 'utf8')
  .replace('    draw(p, t) {',
    `    draw(p, t) {
      const __t0 = performance.now();
      try { return this.__draw(p, t); } finally {
        (window.__dt = window.__dt || []).push(performance.now() - __t0);
      }
    }
    __draw(p, t) {`)
  .replace('new Worlds();', 'window.__wInst = new Worlds();');
if (!src.includes('__draw(p, t) {')) throw new Error('draw() anchor not found');

const b = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const pg = await b.newPage(VIEW);
await pg.route('**/zp-worlds.js', r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: src }));
await pg.goto(`http://127.0.0.1:${PORT}/worlds.html`, { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(5000);

const rows = [];
for (const p of [0, 2 / 7, 3 / 7, 4 / 7, 5 / 7, 6 / 7]) {
  await pg.evaluate(t => {
    const m = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo(0, m * t);
  }, p);
  await pg.waitForFunction(t => {
    const w = window.__wInst;
    if (!w) return false;
    const m = document.documentElement.scrollHeight - innerHeight;
    return Math.abs(window.scrollY / m - t) < 0.002 && Math.abs(w.ps - t) < 0.0025;
  }, p, { timeout: 30000 }).catch(() => {});
  const ms = await pg.evaluate(async () => {
    window.__dt = [];
    await new Promise(res => {
      let n = 0;
      const f = () => { if (++n >= 45) return res(); requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    const t = window.__dt.slice().sort((a, b) => a - b);
    return { median: t[Math.floor(t.length / 2)], p90: t[Math.floor(t.length * 0.9)] };
  });
  rows.push({ p, ...ms });
  console.log(`p=${p.toFixed(3)}  median ${ms.median.toFixed(1)} ms   p90 ${ms.p90.toFixed(1)} ms`);
}
const avg = rows.reduce((s, r) => s + r.median, 0) / rows.length;
console.log(`\nmean of medians: ${avg.toFixed(1)} ms/frame  (${mode})`);
await b.close();
