import puppeteer from 'puppeteer-core';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = process.argv[2] || 'http://127.0.0.1:4321/';
const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader','--hide-scrollbars','--force-device-scale-factor=1'] });

for (const [w, h, label] of [[1600, 900, 'desktop 1600x900'], [390, 844, 'phone 390x844']]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 180000 });
  await p.waitForFunction(() => document.documentElement.classList.contains('rig-on'), { timeout: 240000 });
  await new Promise(r => setTimeout(r, 2000));
  // Measure over a scroll sweep, which is when the camera and the beats are all working.
  const stats = await p.evaluate(async () => {
    const frames = [];
    let last = performance.now();
    const span = document.documentElement.scrollHeight - innerHeight;
    let done;
    const stop = new Promise(r => done = r);
    let n = 0;
    const tick = () => {
      const now = performance.now();
      frames.push(now - last); last = now;
      window.scrollTo({ top: span * (n / 180), behavior: 'instant' });
      if (++n < 180) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
    await stop;
    frames.sort((a, b) => a - b);
    const pick = q => frames[Math.floor(frames.length * q)];
    return { median: +pick(0.5).toFixed(1), p95: +pick(0.95).toFixed(1), worst: +frames.at(-1).toFixed(1), n: frames.length };
  });
  const tier = await p.evaluate(() => window.__zp?.stage?.tier ?? 'n/a');
  console.log(`${label.padEnd(20)} median ${String(stats.median).padStart(5)}ms (${Math.round(1000/stats.median)}fps)  p95 ${String(stats.p95).padStart(5)}ms  worst ${stats.worst}ms`);
  await p.close();
}
await b.close();
