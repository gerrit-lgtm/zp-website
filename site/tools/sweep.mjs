import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const CHROME = process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-143.0.7499.169/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT = process.argv[2] || 'tools/sweep';
const FRAC = Number(process.argv[3] ?? 0.055);   // which stop to frame (0.055 ~ hero hold)
mkdirSync(OUT, { recursive: true });

/* The target is the client's own Blender render: a bright, clearly-lit gunmetal suit with
 * readable plate detail. The site's background stays the brand void, so the suit has to
 * carry as a hero object lit against black rather than a silhouette inside it. */
const V = [
  { id: 'A-shipped',   key: 3.0, fill: 1.80, hemi: 0.40, env: 0.85, exp: 1.38, envMap: 1.35, contrast: 1.03, vig: 0.55, lift: 0.5 },
  { id: 'E-bright',    key: 6.0, fill: 3.50, hemi: 0.90, env: 1.60, exp: 1.55, envMap: 1.60, contrast: 1.00, vig: 0.22, lift: 0.3 },
  { id: 'F-hero',      key: 7.5, fill: 4.50, hemi: 1.20, env: 2.10, exp: 1.60, envMap: 1.80, contrast: 1.00, vig: 0.18, lift: 0.2 },
  { id: 'G-studio',    key: 9.0, fill: 6.00, hemi: 1.60, env: 2.60, exp: 1.55, envMap: 2.00, contrast: 0.98, vig: 0.12, lift: 0.15 },
  { id: 'H-punchy',    key: 7.0, fill: 4.00, hemi: 1.00, env: 1.90, exp: 1.58, envMap: 1.75, contrast: 1.06, vig: 0.30, lift: 0.35 },
];

const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader','--hide-scrollbars','--force-device-scale-factor=1'] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900 });
await p.goto('http://127.0.0.1:4321/?debug', { waitUntil: 'networkidle2', timeout: 180000 });
await p.waitForFunction(() => !!window.__zp, { timeout: 240000 });
await p.evaluate(f => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * f, behavior: 'instant' }), FRAC);
await new Promise(r => setTimeout(r, 2600));

for (const v of V) {
  await p.evaluate(c => {
    const st = window.__zp.stage, sc = st.scene;
    sc.environmentIntensity = c.env;
    st.renderer.toneMappingExposure = c.exp;
    let seenFill = false;
    sc.traverse(o => {
      if (o.isDirectionalLight) {
        if (o.castShadow) o.intensity = c.key;
        else if (!seenFill) { o.intensity = c.fill; seenFill = true; }
      }
      if (o.isHemisphereLight) o.intensity = c.hemi;
    });
    if (st.mesh) { st.mesh.material.envMapIntensity = c.envMap; st.mesh.material.needsUpdate = true; }
    if (st.grade) {
      st.grade.uniforms.uContrast.value = c.contrast;
      st.grade.uniforms.uVignette.value = 0.9;
      st.grade.material.uniforms.uContrast.value = c.contrast;
    }
    window.__zpVig = c.vig; window.__zpLift = c.lift;
  }, v);
  await new Promise(r => setTimeout(r, 800));
  await p.screenshot({ path: `${OUT}/${v.id}.png` });
  console.log('rendered', v.id);
}
await b.close();
