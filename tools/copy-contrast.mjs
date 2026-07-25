/* Portrait legibility audit: for every beat, measure the SCENE luminance
   directly behind the eyebrow label and report a WCAG contrast ratio against
   the eyebrow's own colour.

   Why this and not a fixed pixel band: the copy block is bottom-anchored, so
   the label's y moves with the section's content. Sampling fixed rows measures
   the planet instead of the text and reports nonsense.

     node tools/copy-contrast.mjs [cyOverride]
*/
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 8900;
const cyOverride = process.argv[2];

let src = readFileSync(`${ROOT}assets/js/zp-worlds.js`, 'utf8');
if (cyOverride) {
  const A = 'const cy = H * (portrait ? 0.40 : 0.50);';
  if (!src.includes(A)) throw new Error('cy anchor missing');
  src = src.replace(A, `const cy = H * (portrait ? ${cyOverride} : 0.50);`);
}
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const relL = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05); };

const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await pg.route('**/zp-worlds.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: src }));
await pg.goto(`http://127.0.0.1:${PORT}/worlds.html`, { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(6000);
await pg.addStyleTag({ content: '#veil{visibility:hidden!important}' });

const shippedCy = (readFileSync(`${ROOT}assets/js/zp-worlds.js`, 'utf8')
  .match(/portrait \? ([\d.]+) : 0\.50/) || [, '?'])[1];
console.log(`portrait cy = ${cyOverride || shippedCy + ' (as shipped)'}`);
console.log('beat  label                              bg lum   contrast  onLit  verdict');
let worst = 99;
for (let i = 0; i < 7; i++) {
  await pg.evaluate(p => { const m = document.documentElement.scrollHeight - innerHeight; window.scrollTo(0, m * p); }, i / 7);
  await pg.waitForTimeout(2400);
  const info = await pg.evaluate(i => {
    const secs = document.querySelectorAll('[data-sec]');
    const eb = secs[i] && secs[i].querySelector('.geyebrow');
    if (!eb) return null;
    const r = eb.getBoundingClientRect();
    const cs = getComputedStyle(eb);
    return { text: eb.textContent.trim().slice(0, 34), colour: cs.color,
             rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
  }, i);
  if (!info) { console.log(String(i).padEnd(5), '(no eyebrow in this section)'); continue; }
  // sample the SCENE only, with the copy layer hidden, at the label's rect
  await pg.addStyleTag({ content: '#hidecopy{}' });
  await pg.evaluate(() => { document.querySelector('main').style.visibility = 'hidden'; });
  const shot = await pg.screenshot({ clip: { x: info.rect.x, y: info.rect.y, width: Math.max(1, info.rect.w), height: Math.max(1, info.rect.h) } });
  await pg.evaluate(() => { document.querySelector('main').style.visibility = ''; });
  const { createCanvas, loadImage } = { createCanvas: null, loadImage: null };
  // decode PNG in-page (no native deps)
  const bg = await pg.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    /* Not the brightest pixel — a single star behind one letter does not make
       a label unreadable. Report the MEAN ground, plus the share of the label's
       area sitting on ground bright enough to swallow it. That share is what
       decides whether the line reads. */
    let sr = 0, sg = 0, sb = 0, n = 0, hostile = 0;
    for (let p = 0; p < d.length; p += 4) {
      sr += d[p]; sg += d[p + 1]; sb += d[p + 2]; n++;
      const l = 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2];
      if (l > 96) hostile++;            // ~0.13 relative luminance and up
    }
    return { mean: [sr / n, sg / n, sb / n], hostile: hostile / n };
  }, shot.toString('base64'));
  const m = info.colour.match(/\d+/g).map(Number);
  const cr = ratio(relL(m), relL(bg.mean));
  worst = Math.max(worst === 99 ? 0 : worst, bg.hostile * 100);
  const pct = bg.hostile * 100;
  const verdict = pct > 25 ? 'FAIL - label sits on lit body' : pct > 8 ? 'marginal' : 'clear';
  console.log(String(i).padEnd(5), info.text.padEnd(35), String(Math.round(relL(bg.mean) * 1000) / 1000).padStart(6),
              '  ' + cr.toFixed(2).padStart(6), '  ' + pct.toFixed(0).padStart(3) + '%  ' + verdict);
}
console.log('worst: ' + worst.toFixed(0) + '% of a label on lit ground');
await b.close();
