import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT = process.argv[2] || 'tools/shots';
const W = Number(process.argv[3] || 1600), H = Number(process.argv[4] || 900);
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
page.on('requestfailed', r => errs.push('[404?] ' + r.url() + ' ' + r.failure()?.errorText));

await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 180000 });
await new Promise(r => setTimeout(r, 2500));

// One frame per camera stop, sampled where that stop's copy is settled.
const stops = ['wp0','wp1','wp2a','wp2b','wp3','wp4','wp5','wp6'];
const spans = await page.evaluate(() => [...document.querySelectorAll('.beat')].map(b => Number(b.dataset.vh)));
const total = spans.reduce((a,c)=>a+c,0);
let cum = 0;
const marks = spans.map(vh => { const m = (cum + vh*0.64)/total; cum += vh; return m; });

for (let i = 0; i < marks.length; i++) {
  await page.evaluate(f => {
    const span = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo({ top: span * f, behavior: 'instant' });
  }, marks[i]);
  // let the ~8%/frame damping settle
  await new Promise(r => setTimeout(r, 2200));
  await page.screenshot({ path: `${OUT}/${i}-${stops[i]}.png` });
}
const info = await page.evaluate(() => ({ dpr: devicePixelRatio, h: document.documentElement.scrollHeight, vh: innerHeight }));
console.log('scrollHeight', info.h, 'vh', info.vh, 'ratio', (info.h/info.vh).toFixed(2));
console.log(errs.length ? 'CONSOLE:\n' + [...new Set(errs)].slice(0,25).join('\n') : 'console clean');
await browser.close();
