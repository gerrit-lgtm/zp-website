import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT = process.argv[2] || 'tools/phases';
const W = Number(process.argv[3] || 1600), H = Number(process.argv[4] || 900);
const URL = process.argv[5] || 'http://127.0.0.1:4321/';
mkdirSync(OUT, { recursive: true });

// One frame per moment that matters across the four phases.
const STOPS = [
  [0.00, 'a-hero'], [0.09, 'b-hero-leaving'], [0.24, 'c-cards-in'], [0.33, 'd-cards'],
  [0.42, 'e-cards-out'], [0.55, 'f-say1'], [0.70, 'g-say2'], [0.87, 'h-say3'],
  [0.97, 'i-contact'], [1.00, 'j-close'],
];

const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errs = [], failed = [];
p.on('pageerror', e => errs.push('[pageerror] ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
p.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });

await p.goto(URL, { waitUntil: 'networkidle2', timeout: 180000 });
await p.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 240000 });
await new Promise(r => setTimeout(r, 2600));

for (const [f, name] of STOPS) {
  await p.evaluate(v => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * v, behavior: 'instant' }), f);
  await new Promise(r => setTimeout(r, 1900));
  await p.screenshot({ path: `${OUT}/${name}.png` });
}
const info = await p.evaluate(() => ({
  ratio: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
  hasFigure: !!window.__zp?.stage?.mesh,
  hasLogo: !!window.__zp?.stage?.logo,
  hScroll: document.documentElement.scrollWidth > innerWidth + 1,
}));
console.log(`ratio ${info.ratio}  figure ${info.hasFigure}  logo ${info.hasLogo}  h-scroll ${info.hScroll}`);
console.log('failed:', failed.length ? [...new Set(failed)].join(', ') : 'none');
console.log('console:', errs.length ? [...new Set(errs)].slice(0, 6).join(' | ') : 'clean');
await b.close();
