/* Boot health: console errors, failed requests, when the veil actually drops,
   and when every body first has pixels. Run against a range-capable server.
     node tools/boot-check.mjs [landscape|portrait]
   Portrait drives the phone width class (<768), which selects the mobile
   sprite sizes and the 0.55 star density — a different code path, so it is
   worth checking separately. */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = process.env.OUT || `${ROOT}.work`;
mkdirSync(OUT, { recursive: true });
const PORT = process.env.PORT || 8900;
const mode = process.argv[2] || 'landscape';
const VIEW = mode === 'portrait'
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

const b = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const pg = await b.newPage(VIEW);

/* Probe injection: publish the live instance so we can ask it when every body
   actually has pixels. Serving the patched source through page.route keeps the
   shipped file untouched — the same trick the scroll sweep uses. */
const src = readFileSync(`${ROOT}assets/js/zp-worlds.js`, 'utf8');
const probed = src.replace('new Worlds();', 'window.__wInst = new Worlds();');
if (probed === src) throw new Error('probe anchor "new Worlds();" not found');
await pg.route('**/zp-worlds.js', r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: probed }));

const errors = [], failed = [];
pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
pg.on('requestfailed', r => failed.push(`${r.url()} — ${r.failure()?.errorText}`));
pg.on('response', r => { if (r.status() >= 400) failed.push(`${r.url()} — HTTP ${r.status()}`); });

const t0 = Date.now();
await pg.goto(`http://127.0.0.1:${PORT}/worlds.html`, { waitUntil: 'domcontentloaded' });

// the veil is removed from the DOM 900ms after it gains .hide
await pg.waitForFunction(() => {
  const v = document.getElementById('veil');
  return !v || v.classList.contains('hide');
}, { timeout: 15000 }).catch(() => {});
const veilMs = Date.now() - t0;

// when does every body actually have pixels? (plate decoded or sprite shaded)
const spritesMs = await pg.evaluate(async () => {
  const t = performance.now();
  const ready = () => {
    const w = window.__wInst;
    if (!w || !w.core || !w.planets) return false;
    return !!w.core.sprite && w.planets.every(p => !!p.sprite);
  };
  if (!window.__wInst) return -1; // no probe handle; skip
  while (performance.now() - t < 12000) {
    if (ready()) return Math.round(performance.now());
    await new Promise(r => requestAnimationFrame(r));
  }
  return -2;
});

await pg.waitForTimeout(1200);
await pg.screenshot({ path: `${OUT}/boot-${mode}.jpg`, type: 'jpeg', quality: 92 });

console.log(`mode           ${mode} ${VIEW.viewport.width}x${VIEW.viewport.height} @${VIEW.deviceScaleFactor}x`);
console.log(`veil dropped   ${veilMs} ms`);
console.log(`all sprites    ${spritesMs === -1 ? 'n/a (no probe)' : spritesMs === -2 ? 'TIMEOUT' : spritesMs + ' ms'}`);
console.log(`console errors ${errors.length}`);
errors.forEach(e => console.log('   !', e));
console.log(`failed reqs    ${failed.length}`);
failed.forEach(f => console.log('   !', f));
await b.close();
process.exit(errors.length || failed.length ? 1 : 0);
