import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT = 'tools/verify'; mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:4321/';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--hide-scrollbars', '--force-device-scale-factor=1'] });

const newPage = async (w, h, opts = {}) => {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  if (opts.reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (opts.noJs) await p.setJavaScriptEnabled(false);
  const errs = [];
  p.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('[error] ' + m.text()); });
  p.errs = errs;
  return p;
};
const settle = (p, ms) => p.evaluate(m => new Promise(r => setTimeout(r, m)), ms);
const scrollFrac = (p, f) => p.evaluate(f => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * f, behavior: 'instant' }), f);

/* ---- 1. portrait phone ---- */
{
  const p = await newPage(390, 844, { mobile: true });
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await p.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 180000 });
  await settle(p, 2500);
  const spans = await p.evaluate(() => [...document.querySelectorAll('.beat')].map(b => Number(b.dataset.vh)));
  const total = spans.reduce((a, c) => a + c, 0);
  let cum = 0; const marks = spans.map(v => { const m = (cum + v * 0.64) / total; cum += v; return m; });
  for (const [i, m] of marks.entries()) {
    await scrollFrac(p, m); await settle(p, 2000);
    await p.screenshot({ path: `${OUT}/m${i}.png` });
  }
  const over = await p.evaluate(() => ({
    hScroll: document.documentElement.scrollWidth > innerWidth + 1,
    scrollW: document.documentElement.scrollWidth, vw: innerWidth,
  }));
  console.log('PORTRAIT 390x844:', JSON.stringify(over), p.errs.length ? p.errs.slice(0, 5) : 'no errors');
  await p.close();
}

/* ---- 2. reduced motion ---- */
{
  const p = await newPage(1440, 900, { reduced: true });
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await p.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 180000 });
  await scrollFrac(p, 0.47); await settle(p, 1200);
  await p.screenshot({ path: `${OUT}/reduced.png` });
  // With reduced motion the figure must not float and the camera must not lag.
  const drift = await p.evaluate(async () => {
    const a = performance.now();
    await new Promise(r => setTimeout(r, 700));
    return { ms: performance.now() - a };
  });
  console.log('REDUCED MOTION:', JSON.stringify(drift), p.errs.length ? p.errs.slice(0, 5) : 'no errors');
  await p.close();
}

/* ---- 3. no JavaScript ---- */
{
  const p = await newPage(1440, 900, { noJs: true });
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await p.screenshot({ path: `${OUT}/nojs.png` });
  const state = await p.evaluate(() => ({
    rigOn: document.documentElement.className,
    loaderShown: !document.getElementById('loader').hidden,
    beatsVisible: [...document.querySelectorAll('.beat')].filter(b => b.getBoundingClientRect().height > 40).length,
    docHeight: document.documentElement.scrollHeight,
    h1: document.querySelector('h1')?.textContent.slice(0, 40),
  }));
  console.log('NO-JS:', JSON.stringify(state));
  await p.close();
}

/* ---- 4. a11y / interaction state ---- */
{
  const p = await newPage(1440, 900);
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await p.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 180000 });
  await scrollFrac(p, 0.25); await settle(p, 2000);
  const a11y = await p.evaluate(() => {
    const beats = [...document.querySelectorAll('.beat')];
    const active = beats.filter(b => b.hasAttribute('data-active'));
    const smallTargets = [...document.querySelectorAll('a, button')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 24);
    }).map(el => `${el.tagName}.${el.className}:${Math.round(el.getBoundingClientRect().height)}`);
    return {
      activeBeats: active.map(b => b.id),
      inertInactive: beats.filter(b => !b.hasAttribute('data-active')).every(b => b.inert),
      focusableInInactive: beats.filter(b => !b.hasAttribute('data-active'))
        .flatMap(b => [...b.querySelectorAll('a,button')]).filter(el => !el.closest('[inert]')).length,
      navCurrent: document.querySelector('.nav__links a[aria-current]')?.textContent,
      railCurrent: document.querySelector('.rail [aria-current]')?.textContent,
      headings: [...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName).join(','),
      smallTargets,
    };
  });
  console.log('A11Y:', JSON.stringify(a11y, null, 1));
  // Nav click must move the camera to that stop.
  await p.click('.nav__links a[href="#core"]');
  await settle(p, 2500);
  console.log('NAV CLICK →', await p.evaluate(() => ({
    active: [...document.querySelectorAll('.beat[data-active]')].map(b => b.id),
    frac: +(scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(3),
  })));
  await p.close();
}
await browser.close();
