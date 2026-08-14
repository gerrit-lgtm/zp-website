import puppeteer from 'puppeteer-core';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--enable-unsafe-swiftshader','--hide-scrollbars','--force-device-scale-factor=1'] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900 });
await p.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle2', timeout: 120000 });
await p.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 180000 });
await new Promise(r => setTimeout(r, 2500));
for (const f of [0.098, 0.175]) {
  await p.evaluate(v => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * v, behavior: 'instant' }), f);
  await new Promise(r => setTimeout(r, 2200));
  const on = await p.evaluate(() => [...document.querySelectorAll('.beat[data-active]')].map(x => x.id));
  console.log(`frac ${f} active:`, JSON.stringify(on));
  await p.screenshot({ path: `tools/final/tween-${f}.png` });
}
await b.close();
