/* ============================================================
   ZeroPoint — cinematic scroll engine
   One pinned 100vh stage; the whole page is a single scrub
   timeline. Dormant → activation clip (once) → scroll scrubs
   the stitched F1→F9 master; native scroll resumes at F9.
   ============================================================ */
import './style.css';

// ---------- timeline geometry ----------
// The master is 8 locked clips: 7 × 121 frames + 122 frames @ 24fps (969 total).
// Anchors sit on the clip boundaries — each one is a locked keyframe still.
const BOUNDARY_FRAMES = [0, 121, 242, 363, 484, 605, 726, 847, 969];
const TOTAL_FRAMES = 969;
const FRACS = BOUNDARY_FRAMES.map((f) => f / TOTAL_FRAMES);
const BAND = 1 / 8;                       // one transition of scroll progress
const END_EPS = 0.045;                    // never seek the exact last timestamp

const FRAME_NAMES = [
  'Origin', 'Inner Chamber', 'Sphere Architecture', 'The Sphere',
  'Enterprise Operations', 'Industrial Operations', 'Connected Systems',
  'Executive Strategy', 'The Founders',
];

// Message overlays live on anchors F4–F8 (indices 3–7)
const MSG_FRAMES = [3, 4, 5, 6, 7];

// ---------- elements ----------
const doc = document.documentElement;
const $ = (s) => document.querySelector(s);
const cinema = $('#cinema');
const stage = $('#stage');
const film = $('#film');
const activation = $('#activation');
const poster = $('#poster');
const stillsBox = $('#stills');
const cue = $('#cue');
const cueLabel = $('#cueLabel');
const cueFill = $('#cueFill');
const hint = $('#hint');
const rail = $('#rail');
const burger = $('#burger');
const endingEl = $('#ending');
const replayEl = $('#replay');
const messages = [...document.querySelectorAll('.msg')];

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;
const useStills = reduceMotion || saveData ||
  new URLSearchParams(location.search).has('stills');
const small = matchMedia('(max-width: 820px)').matches;
const MASTER_URL = small ? '/media/master-720.mp4' : '/media/master-1080.mp4';

// ---------- state ----------
let mode = 'boot';                        // boot → activating → cinema
let travel = 1;                           // scrollable px across the scrub track
let vh = innerHeight;
let filmDuration = 0;
let lastInputTs = 0;                      // last *user* scroll intent
let lastScrollTs = 0;
let settleTimer = 0;
let autopan = null;                       // { from, to, start, dur } — programmatic scroll
let hintShown = false;

history.scrollRestoration = 'manual';
scrollTo(0, 0);

// ---------- helpers ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (v) => v * v * (3 - 2 * v);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

function measure() {
  vh = innerHeight;
  // read live — a cached value goes stale when the viewport resizes without
  // a resize event reaching us (rotation, browser chrome, embedded panes)
  travel = Math.max(1, cinema.offsetHeight - stage.offsetHeight);
  return travel;
}

function progress() {
  return clamp(scrollY / measure(), 0, 1);
}

function nearestAnchor(p) {
  let best = 0;
  for (let i = 1; i < FRACS.length; i++) {
    if (Math.abs(FRACS[i] - p) < Math.abs(FRACS[best] - p)) best = i;
  }
  return best;
}

// ---------- preload ----------
// The spec pins it: activation clip + master fully buffered before the
// interaction unlocks. BOTH are fetched to blobs — iOS Safari ignores
// preload="auto" and never fires canplaythrough for idle video, and a
// blob src makes every later seek local and instant on every platform.
const ACTIVATION_URL = '/media/activation.mp4';
let masterReady = false;
let activationReady = false;
const bytesGot = { a: 0, m: 0 };
const bytesTotal = { a: 3_000_000, m: small ? 13_400_000 : 30_000_000 };

function updateCue() {
  const total = bytesTotal.a + bytesTotal.m;
  const got = Math.min(bytesGot.a, bytesTotal.a) + Math.min(bytesGot.m, bytesTotal.m);
  cueFill.style.width = `${Math.round(clamp(got / total, 0, 1) * 100)}%`;
  if (masterReady && activationReady) {
    doc.dataset.ready = '1';
    cueLabel.textContent = 'Scroll to activate';
  }
}

async function fetchBlobUrl(url, key) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const len = +res.headers.get('content-length');
  if (len) bytesTotal[key] = len;
  const reader = res.body.getReader();
  const parts = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    bytesGot[key] += value.byteLength;
    updateCue();
  }
  bytesGot[key] = bytesTotal[key];
  return URL.createObjectURL(new Blob(parts, { type: 'video/mp4' }));
}

// catch up on readyState — with a blob src, metadata may land before a
// listener registered after an await would fire.
function awaitMetadata(video) {
  return new Promise((resolve) => {
    if (video.readyState >= 1) return resolve();
    video.addEventListener('loadedmetadata', resolve, { once: true });
  });
}

async function preloadMaster() {
  try {
    film.src = await fetchBlobUrl(MASTER_URL, 'm');
  } catch {
    film.src = MASTER_URL;               // fall back to Range-based seeking
    bytesGot.m = bytesTotal.m;
  }
  await awaitMetadata(film);
  filmDuration = film.duration;
  film.currentTime = 0.001;              // paint the lit frame beneath the activation layer
  masterReady = true;
  updateCue();
}

async function preloadActivation() {
  try {
    activation.src = await fetchBlobUrl(ACTIVATION_URL, 'a');
  } catch {
    activation.src = ACTIVATION_URL;
    bytesGot.a = bytesTotal.a;
  }
  await awaitMetadata(activation);
  activationReady = true;
  updateCue();
}

// ---------- stills mode (reduced motion / data saver) ----------
let stillEls = [];
function buildStills() {
  stillsBox.hidden = false;
  stillEls = FRACS.map((_, i) => {
    const img = new Image();
    img.src = `/media/f${i + 1}.jpg`;
    img.alt = '';
    if (i > 0) img.loading = 'lazy';
    stillsBox.appendChild(img);
    return img;
  });
  masterReady = true;
  activationReady = true;
  updateCue();
}

function updateStills(p) {
  const idx = nearestAnchor(p);
  stillEls.forEach((el, i) => el.classList.toggle('on', i === idx));
}

// ---------- activation gate ----------
function armGate() {
  const fire = (e) => {
    if (mode !== 'boot') return;
    if (!(masterReady && activationReady)) return;   // interaction unlocks only when buffered
    if (e.type === 'keydown' &&
        !['ArrowDown', 'PageDown', 'Space', ' ', 'Enter'].includes(e.key)) return;
    beginActivation();
  };
  addEventListener('wheel', fire, { passive: true });
  addEventListener('touchmove', fire, { passive: true });
  addEventListener('keydown', fire);
  cue.addEventListener('click', fire);
}

function beginActivation() {
  mode = 'activating';
  doc.dataset.mode = 'activating';                   // cue is removed the instant light-up begins

  if (useStills) {                                   // reduced motion: fade unlit → lit, no camera move
    updateStills(0);
    setTimeout(enterCinema, 750);
    return;
  }

  activation.play().catch(() => {});
  poster.dataset.done = '1';

  // prime the master's first frame inside this user-gesture context —
  // iOS paints nothing for a paused pre-gesture seek, which would flash
  // black at the activation → film handoff
  film.addEventListener('timeupdate', () => {
    film.pause();
    film.currentTime = 0.001;
  }, { once: true });
  film.play().catch(() => {});

  // scroll during the light-up is absorbed — extra gestures just lean on the throttle
  const lean = () => {
    if (mode === 'activating') {
      activation.playbackRate = Math.min(activation.playbackRate + 0.35, 2.2);
    }
  };
  addEventListener('wheel', lean, { passive: true });
  addEventListener('touchmove', lean, { passive: true });

  activation.addEventListener('ended', enterCinema, { once: true });
  // if 'ended' never fires (decode hiccup), don't wedge the page
  setTimeout(() => { if (mode === 'activating') enterCinema(); }, 9000);
}

function enterCinema() {
  if (mode === 'cinema') return;
  mode = 'cinema';
  doc.dataset.film = 'on';                           // master frame 0 = activation's last frame
  doc.dataset.mode = 'cinema';                       // unlocks native scroll
  activation.style.opacity = '0';
  scrollTo(0, 0);
  measure();
  hint.classList.add('on');
  hintShown = true;
}

// ---------- scrub loop ----------
function applyFrame(p) {
  if (useStills) { updateStills(p); return; }
  if (!filmDuration) return;
  const t = Math.min(p * filmDuration, filmDuration - END_EPS);
  // gate on the element's own seeking flag — a missed 'seeked' event must not wedge the scrub
  if (film.readyState >= 2 && !film.seeking && Math.abs(film.currentTime - t) > 0.02) {
    film.currentTime = t;
  }
}

function updateOverlays(p) {
  // messages: fully present near their anchor, fading over the outer band — pure
  // function of scrub position, so the choreography reverses for free
  for (let m = 0; m < messages.length; m++) {
    const a = FRACS[MSG_FRAMES[m]];
    const d = Math.abs(p - a) / BAND;
    const v = smooth(clamp(1 - (d - 0.18) / 0.32, 0, 1));
    const el = messages[m];
    el.style.opacity = v.toFixed(3);
    el.style.transform = `translateY(${((1 - v) * 16).toFixed(1)}px)`;
    el.setAttribute('aria-hidden', v < 0.05 ? 'true' : 'false');
  }

  // dot rail
  const idx = nearestAnchor(p);
  for (let i = 0; i < railItems.length; i++) {
    railItems[i].classList.toggle('active', i === idx);
  }

  // nav + end states
  const end = p >= 0.99;
  doc.dataset.nav = end ? 'end' : (p > 0.002 ? 'scrub' : 'hero');
  if (end) doc.dataset.end = '1';
  else delete doc.dataset.end;

  endingEl.setAttribute('aria-hidden', end ? 'false' : 'true');
  replayEl.setAttribute('aria-hidden', end ? 'false' : 'true');

  if (hintShown && p > 0.01) { hint.classList.remove('on'); hintShown = false; }
}

// Raw wheel input arrives in discrete jumps; mapping it 1:1 to video time
// reads as jank. smoothP chases the scroll target on an exponential ease
// (~110ms time constant, frame-rate independent), so steps become glides.
let smoothP = 0;
let lastTickTs = 0;

function update(force) {
  if (mode !== 'cinema') return;
  if (force) smoothP = progress();
  applyFrame(smoothP);
  updateOverlays(smoothP);
}

function tick(now) {
  if (mode === 'cinema') {
    const targetP = progress();
    const dt = Math.min(now - lastTickTs || 16.7, 100);
    smoothP += (targetP - smoothP) * (1 - Math.exp(-dt / 110));
    if (Math.abs(targetP - smoothP) < 0.0004) smoothP = targetP;
    applyFrame(smoothP);
    updateOverlays(smoothP);
  }
  lastTickTs = now;
  requestAnimationFrame(tick);
}

// ---------- snap-settle + programmatic seeks ----------
function cancelAutopan() { autopan = null; }

function panTo(targetY, dur) {
  autopan = { from: scrollY, to: targetY, start: performance.now(), dur };
  requestAnimationFrame(stepAutopan);
}

function stepAutopan(now) {
  if (!autopan) return;
  const { from, to, start, dur } = autopan;
  const t = clamp((now - start) / dur, 0, 1);
  const eased = dur > 900 ? easeInOutCubic(t) : easeOutCubic(t);
  scrollTo(0, from + (to - from) * eased);
  if (t < 1) requestAnimationFrame(stepAutopan);
  else autopan = null;
}

function scheduleSettle() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    if (mode !== 'cinema' || autopan) return;
    if (performance.now() - lastInputTs < 200) return scheduleSettle();
    const p = progress();
    if (p <= 0.002 || p >= 0.998) return;
    const target = FRACS[nearestAnchor(p)] * travel;
    const dist = Math.abs(target - scrollY);
    if (dist < 4) return;
    // 220ms decel for short settles, stretched a little for longer travel
    panTo(target, clamp(220 + (dist / vh) * 260, 220, 640));
  }, 240);
}

addEventListener('scroll', () => {
  lastScrollTs = performance.now();
  if (!autopan) { lastInputTs = lastScrollTs; scheduleSettle(); }
}, { passive: true });

['wheel', 'touchstart', 'keydown'].forEach((ev) =>
  addEventListener(ev, () => {
    lastInputTs = performance.now();
    cancelAutopan();
  }, { passive: true }));

// nav links, dots, brand, replay — everything seeks the camera
function seekToFrame(i, dur) {
  if (mode !== 'cinema') return;
  closeSheet();
  panTo(FRACS[i] * measure(), dur);
}

document.querySelectorAll('[data-seek-frame]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    seekToFrame(+el.dataset.seekFrame, 1500);
  });
});

$('#replay').addEventListener('click', () => seekToFrame(0, 1900));

// ---------- dot rail ----------
const railItems = FRAME_NAMES.map((name, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.setAttribute('aria-label', `Go to ${name} (${i + 1} of 9)`);
  const tip = document.createElement('span');
  tip.className = 'rail-tip';
  tip.textContent = name;
  b.appendChild(tip);
  b.addEventListener('click', () => seekToFrame(i, 900));
  li.appendChild(b);
  rail.appendChild(li);
  return li;
});

// ---------- mobile sheet ----------
function closeSheet() {
  delete doc.dataset.sheet;
  burger.setAttribute('aria-expanded', 'false');
}
burger.addEventListener('click', () => {
  if (doc.dataset.sheet === 'open') closeSheet();
  else {                                             // sheet open = scrub paused (scroll locked via CSS)
    doc.dataset.sheet = 'open';
    burger.setAttribute('aria-expanded', 'true');
  }
});
$('#sheet').hidden = false;

// ---------- boot ----------
addEventListener('resize', measure);
measure();
armGate();

if (useStills) {
  buildStills();
} else {
  preloadActivation();
  preloadMaster();
}

updateCue();
requestAnimationFrame(tick);

// probe hook for scroll-sweep verification harnesses (headless panes defer
// rAF + scroll events, so invariant checks drive the update directly)
window.__zp = { update, progress, measure, FRACS, seekToFrame };
