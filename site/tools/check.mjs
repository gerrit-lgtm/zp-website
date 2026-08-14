import puppeteer from 'puppeteer-core';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = process.argv[2] || 'http://127.0.0.1:4321/';
const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--hide-scrollbars', '--force-device-scale-factor=1'] });

const boot = async (w, h, opts = {}) => {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  if (opts.reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (opts.noJs) await p.setJavaScriptEnabled(false);
  const errs = [];
  p.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.gstatic/.test(m.text())) errs.push('[console] ' + m.text()); });
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 180000 });
  if (!opts.noJs) await p.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 240000 });
  p.errs = errs;
  return p;
};
const at = (p, f) => p.evaluate(v => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * v, behavior: 'instant' }), f);
const wait = (p, ms) => p.evaluate(m => new Promise(r => setTimeout(r, m)), ms);

/* --- portrait + a11y at each phase --- */
{
  const p = await boot(390, 844, { mobile: true });
  await wait(p, 2400);
  const rows = [];
  for (const [f, name] of [[0, 'hero'], [0.30, 'cards'], [0.70, 'say'], [0.98, 'contact']]) {
    await at(p, f); await wait(p, 1400);
    rows.push(await p.evaluate(n => ({
      phase: n,
      hScroll: document.documentElement.scrollWidth > innerWidth + 1,
      visible: [...document.querySelectorAll('#hero,#cards,#say,#contact')].filter(e => !e.hidden).map(e => e.id),
      focusableHidden: [...document.querySelectorAll('#hero,#cards,#say,#contact')]
        .filter(e => e.hidden).flatMap(e => [...e.querySelectorAll('a,button,input')]).length,
      small: [...document.querySelectorAll('a,button,input')].filter(e => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 44;
      }).map(e => `${e.tagName}.${e.className || e.id}:${Math.round(e.getBoundingClientRect().height)}`),
    }), name));
  }
  for (const r of rows) console.log(`PORTRAIT ${r.phase.padEnd(8)} h-scroll ${r.hScroll} · visible [${r.visible}] · focusables-in-hidden ${r.focusableHidden} · small ${r.small.length ? r.small.join(',') : 'none'}`);
  console.log('  errors:', p.errs.length ? p.errs.slice(0, 4) : 'none');
  await p.close();
}

/* --- reduced motion --- */
{
  const p = await boot(1440, 900, { reduced: true });
  await at(p, 0.5); await wait(p, 1200);
  console.log('REDUCED  ok, errors:', p.errs.length ? p.errs.slice(0, 3) : 'none');
  await p.close();
}

/* --- no JS --- */
{
  const p = await boot(1280, 900, { noJs: true });
  console.log('NO-JS   ', JSON.stringify(await p.evaluate(() => ({
    loader: getComputedStyle(document.getElementById('loader')).display,
    scroll: getComputedStyle(document.getElementById('scroll')).display,
    fallbackH1: document.querySelector('.fallback h1')?.textContent.slice(0, 34),
    sections: document.querySelectorAll('.fallback section').length,
    hScroll: document.documentElement.scrollWidth > innerWidth + 1,
  }))));
  await p.close();
}

/* --- nav + form --- */
{
  const p = await boot(1440, 900);
  await wait(p, 2200);
  await p.click('.nav a[href="#platform"]');
  await wait(p, 2600);
  console.log('NAV      platform →', JSON.stringify(await p.evaluate(() => ({
    frac: +(scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(2),
    visible: [...document.querySelectorAll('#hero,#cards,#say,#contact')].filter(e => !e.hidden).map(e => e.id),
  }))));
  await at(p, 0.99); await wait(p, 1800);
  await p.type('#email', 'not-an-email');
  await p.click('#submit'); await wait(p, 300);
  const bad = await p.evaluate(() => document.getElementById('note').textContent);
  await p.evaluate(() => { document.getElementById('email').value = 'gerrit@zeropoint.africa'; });
  await p.click('#submit'); await wait(p, 300);
  const good = await p.evaluate(() => ({ note: document.getElementById('note').textContent, label: document.getElementById('submit').textContent }));
  console.log('FORM     invalid →', JSON.stringify(bad));
  console.log('FORM     valid   →', JSON.stringify(good));
  console.log('  errors:', p.errs.length ? p.errs.slice(0, 3) : 'none');
  await p.close();
}
await b.close();
