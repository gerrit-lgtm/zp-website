import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = process.argv[2];
mkdirSync('tools/live', { recursive: true });
const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader','--hide-scrollbars','--force-device-scale-factor=1'] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900 });
const errs = [], failed = [];
p.on('pageerror', e => errs.push('[pageerror] ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
p.on('requestfailed', r => failed.push(r.url().replace(URL, '') + ' — ' + r.failure()?.errorText));
p.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().replace(URL, '')); });

const t0 = Date.now();
await p.goto(URL, { waitUntil: 'networkidle2', timeout: 180000 });
await p.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 240000 });
const bootMs = Date.now() - t0;
await new Promise(r => setTimeout(r, 2500));

const stops = ['wp0','wp1','wp2a','wp2b','wp3','wp4','wp5','wp6'];
const spans = await p.evaluate(() => [...document.querySelectorAll('.beat')].map(b => Number(b.dataset.vh)));
const total = spans.reduce((a,c)=>a+c,0);
let cum = 0;
for (const [i, vh] of spans.entries()) {
  const f = (cum + vh * 0.64) / total; cum += vh;
  await p.evaluate(v => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * v, behavior: 'instant' }), f);
  await new Promise(r => setTimeout(r, 2000));
  await p.screenshot({ path: `tools/live/${i}-${stops[i]}.png` });
}
const info = await p.evaluate(() => ({
  ratio: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
  webgl: !!document.querySelector('#stage canvas'),
  triangles: window.performance ? undefined : undefined,
}));
console.log(`LIVE ${URL}`);
console.log(`  boot to rig-on: ${(bootMs/1000).toFixed(1)}s   scroll ratio: ${info.ratio}   canvas: ${info.webgl}`);
console.log(`  failed requests: ${failed.length ? [...new Set(failed)].join(', ') : 'none'}`);
console.log(`  console: ${errs.length ? [...new Set(errs)].slice(0,6).join(' | ') : 'clean'}`);
await b.close();
