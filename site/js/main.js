/* Boot, and the one loop that drives everything: scroll position in, camera placement
 * and overlay state out.
 *
 * The page is readable without any of this. main is ordinary document flow until the
 * stage actually comes up; only then does .rig-on lift the copy into the fixed overlay
 * the camera composes against. A machine with no WebGL gets a plain dark page, not a
 * blank one.
 */

import { Stage } from './stage.js';
import { buildTimeline, sample, WAYPOINTS } from './rig.js';

const root = document.documentElement;
const mount = document.getElementById('stage');
const loader = document.getElementById('loader');
const beats = [...document.querySelectorAll('.beat')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
const ramp = (t, a, b) => clamp((t - a) / (b - a));

/* ------------------------------------------------------------------ geometry */

// The ride is the sum of the beats' own heights (1,160vh as specified), plus one
// viewport of run-out so the final stop gets its full scroll range rather than
// losing it to the fold.
const spans = beats.map(b => Number(b.dataset.vh));
const totalVh = spans.reduce((a, c) => a + c, 0);
document.getElementById('scroll').style.height = `${totalVh + 100}vh`;

let cum = 0;
const ranges = spans.map(vh => {
  const r = { start: cum / totalVh, end: (cum + vh) / totalVh };
  cum += vh;
  return r;
});
const timeline = buildTimeline(ranges);

/** Scroll position where a beat's copy is settled and readable. */
const restOf = i => {
  const r = ranges[i];
  return (r.start + (r.end - r.start) * 0.64) * scrollSpan();
};
const scrollSpan = () => document.documentElement.scrollHeight - innerHeight;

/* -------------------------------------------------------------------- chrome */

const rail = document.getElementById('rail-list');
rail.innerHTML = WAYPOINTS.map((w, i) =>
  `<li><button type="button" data-go="${i}">${w.label}</button></li>`).join('');

const goTo = i => scrollTo({ top: restOf(i), behavior: reduced ? 'auto' : 'smooth' });

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { goTo(Number(go.dataset.go)); return; }
  // Beats are fixed once the rig is on, so native anchor jumps have nowhere to land.
  const a = e.target.closest('a[href^="#"]');
  if (!a || !root.classList.contains('rig-on')) return;
  const i = beats.findIndex(b => b.id === a.hash.slice(1));
  if (i < 0) return;
  e.preventDefault();
  goTo(i);
  history.replaceState(null, '', a.hash);
});

const navLinks = [...document.querySelectorAll('.nav__links a')];
const railBtns = () => [...rail.querySelectorAll('button')];

/* ---------------------------------------------------------------------- loop */

const stage = new Stage(mount, { reducedMotion: reduced });
let active = -1;

function paint() {
  const t = clamp(scrollY / Math.max(1, scrollSpan()));
  const s = sample(timeline, t);
  stage.apply(s);

  // Copy lands as the camera settles (arrival is 55% through a beat), holds while you
  // read, then clears the frame before the next move begins.
  let best = 0, bestI = 0;
  beats.forEach((el, i) => {
    const r = ranges[i];
    const q = (t - r.start) / (r.end - r.start);
    // The first beat is already on screen when the page loads, so it must start at full
    // opacity — fading it in from q=0.18 left anyone landing at scroll 0 with no headline.
    const fadeIn = i === 0 ? 1 : ramp(q, 0.18, 0.42);
    const v = q < 0 || q > 1 ? 0 : Math.min(fadeIn, 1 - ramp(q, 0.88, 1));
    const on = v > 0.02;
    if (el.toggleAttribute('data-active', on)) el.style.setProperty('--drift', ramp(q, 0.42, 0.95));
    el.inert = !on;
    if (v > best) { best = v; bestI = i; }
  });

  if (bestI !== active) {
    active = bestI;
    const id = beats[bestI].id;
    navLinks.forEach(a => a.toggleAttribute('aria-current', a.hash === `#${id}`));
    railBtns().forEach((b, i) => b.toggleAttribute('aria-current', i === bestI));
  }

  // The 3D beats the storyboard asks for, keyed off the same scroll positions.
  const at = (i, a, b) => { const r = ranges[i]; return ramp(t, r.start + (r.end - r.start) * a, r.start + (r.end - r.start) * b); };
  const off = (i, a, b) => 1 - at(i, a, b);
  stage.setBeats({
    holoA: at(2, 0.10, 0.40) * off(3, 0.10, 0.30),
    holoB: at(3, 0.20, 0.45) * off(3, 0.90, 1.0),
    cards: at(5, 0.12, 0.62) * off(5, 0.90, 1.0),
    // The disc keeps a low glow throughout — it is part of the suit — and blooms at
    // WP3. Capped well under 1: at full additive strength it blows the whole frame.
    iris: Math.max(0.10 * at(0, 0.2, 0.6), 0.45 * at(4, 0.15, 0.5) * off(4, 0.88, 1.0)),
    ground: Math.max(at(6, 0.05, 0.5) * off(6, 0.92, 1.0), at(7, 0.0, 0.4) * 0.55),
    dust: at(6, 0.10, 0.55) * off(6, 0.88, 1.0),
  });

  stage.frame();
}

let running = true;
function tick() { if (running) paint(); requestAnimationFrame(tick); }

addEventListener('resize', () => { stage.resize(); }, { passive: true });
document.addEventListener('visibilitychange', () => { running = !document.hidden; });

/* ---------------------------------------------------------------------- start */

const setPct = p => {
  const v = Math.round(p * 100);
  loader.querySelector('.bar i').style.setProperty('--p', `${v}%`);
  loader.querySelector('[data-pct]').textContent = v;
};

try {
  // Two LODs. A phone has no use for 965k triangles it renders at 390px wide, and it is
  // the device least able to afford an 11 MB download.
  const lite = innerWidth < 900
    || (navigator.deviceMemory ?? 8) <= 4
    || navigator.connection?.saveData === true;
  await stage.load(lite ? 'assets/zp-figure-lite.glb' : 'assets/zp-figure.glb', setPct);
  await stage.loadLogo('assets/zp-logo.glb', setPct);
  setPct(1);
  root.classList.add('rig-on');
  stage.resize();
  stage.apply(sample(timeline, clamp(scrollY / Math.max(1, scrollSpan()))), true);
  paint();
  requestAnimationFrame(tick);
  loader.classList.add('is-done');
  setTimeout(() => { loader.hidden = true; }, 800);
  // Lighting is tuned by eye against rendered frames, so ?debug exposes the stage to
  // the screenshot harness (tools/sweep.mjs). Opt-in only.
  if (location.search.includes('debug')) window.__zp = { stage, THREE: stage.scene };
} catch (err) {
  // No WebGL, or the asset failed: fall back to the document underneath.
  console.warn('[zeropoint] stage unavailable, serving the flat page —', err);
  mount.remove();
  loader.hidden = true;
}
