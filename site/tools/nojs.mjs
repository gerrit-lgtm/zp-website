import puppeteer from 'puppeteer-core';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 900 });
await p.setJavaScriptEnabled(false);
await p.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle2' });
console.log(JSON.stringify(await p.evaluate(() => ({
  loaderDisplay: getComputedStyle(document.getElementById('loader')).display,
  stagePresent: !!document.getElementById('stage'),
  scrollSpacer: getComputedStyle(document.getElementById('scroll')).display,
  docHeight: document.documentElement.scrollHeight,
  hScroll: document.documentElement.scrollWidth > innerWidth + 1,
  visibleBeats: [...document.querySelectorAll('.beat')].filter(el => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.height > 40 && cs.opacity !== '0';
  }).map(el => el.id),
})), null, 1));
await p.screenshot({ path: 'tools/verify/nojs-top.png' });
await p.evaluate(() => window.scrollTo(0, 1500));
await p.screenshot({ path: 'tools/verify/nojs-mid.png' });
await b.close();
