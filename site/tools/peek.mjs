import puppeteer from 'puppeteer-core';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 820 });
try {
  await p.goto(process.argv[2], { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log(JSON.stringify(await p.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim().slice(0, 80) ?? null,
    text: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 200),
    imgs: document.images.length,
  })), null, 1));
  await p.screenshot({ path: 'tools/domain-now.png' });
} catch (e) { console.log('error:', e.message); }
await b.close();
