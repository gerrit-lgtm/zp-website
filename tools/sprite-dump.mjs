/* Render a kind's sprite headlessly and hash it. Used to prove the Job D
   refactor leaves the core byte-identical, and to eyeball the worlds. */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/* Output lands in .work/ inside the repo (gitignored) so the harness survives
   a wiped session scratchpad. Override with OUT=... to put it elsewhere. */
const OUT = process.env.OUT || `${ROOT}.work`;
mkdirSync(OUT, { recursive: true });
const PORT = process.env.PORT || 8900;   // must match tools/serve.mjs
const which = process.argv[2] || 'work'; // 'work' | 'head'
const KINDS = ['core', 'basalt', 'clouds', 'fissure', 'ice'];

const src = which === 'head'
  ? execSync('git show HEAD:assets/js/zp-worlds.js', { cwd: ROOT, maxBuffer: 1 << 24 }).toString()
  : readFileSync(`${ROOT}assets/js/zp-worlds.js`, 'utf8');

// expose the class so we can drive makeSprite directly, without the scene
const probed = src.replace('new Worlds();', 'window.__Worlds = Worlds;');
if (probed === src) throw new Error('probe anchor "new Worlds();" not found');

const b = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const pg = await b.newPage({ viewport: { width: 900, height: 600 } });
await pg.route('**/zp-worlds.js', r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: probed }));
await pg.goto(`http://127.0.0.1:${PORT}/worlds.html`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1500);

for (const kind of KINDS) {
  const { b64, S } = await pg.evaluate((kind) => {
    const W = window.__Worlds;
    // a bare instance would boot the whole scene; borrow the prototype instead
    const inst = Object.create(W.prototype);
    inst.dpr = 1;
    const S = inst.spriteSize(kind);
    const sp = document.createElement('canvas'); sp.width = sp.height = S;
    const sc = sp.getContext('2d');
    const img = sc.createImageData(S, S);
    inst.renderSpriteRows(img.data, kind, S, 0, S);
    sc.putImageData(img, 0, 0);
    /* composite onto the real deep-space ground — a sprite is NEVER seen on
       transparency, and dumping one that way both misreads the halo and
       makes Chrome emit a palettised PNG that invents colour banding */
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ct = cv.getContext('2d');
    ct.fillStyle = '#0b1322'; ct.fillRect(0, 0, S, S);
    ct.drawImage(sp, 0, 0);
    return { b64: cv.toDataURL('image/png').split(',')[1], S };
  }, kind);
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(`${OUT}/sprite-${which}-${kind}.png`, buf);
  console.log(kind.padEnd(8), S + 'px', createHash('sha256').update(buf).digest('hex').slice(0, 16));
}
await b.close();
