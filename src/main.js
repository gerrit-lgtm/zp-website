/* ============================================================
   ZeroPoint — cinematic scroll engine
   One pinned 100vh stage; the whole page is a single scrub
   timeline. Dormant → activation clip (once) → scroll scrubs a
   canvas image sequence of the F1→F9 master (video seeking is
   asynchronous and can never scrub smoothly — synchronous
   drawImage with cross-dissolve between adjacent frames can);
   native scroll resumes at F9.
   ============================================================ */
import './style.css';

// ---------- timeline geometry ----------
// The master is 8 locked clips: 7 × 121 frames + 122 frames @ 24fps (969
// source frames, 40.375s). Anchors sit on the clip boundaries — each one
// is a locked keyframe still.
const BOUNDARY_FRAMES = [0, 121, 242, 363, 484, 605, 726, 847, 969];
const FRACS = BOUNDARY_FRAMES.map((f) => f / 969);
const BAND = 1 / 8;                       // one transition of scroll progress

const FRAME_NAMES = [
  'Origin', 'Inner Chamber', 'Sphere Architecture', 'The Sphere',
  'Enterprise Operations', 'Industrial Operations', 'Connected Systems',
  'Executive Strategy', 'The Founders',
];

// Message overlays live on anchors F2–F8 (indices 1–7) — the early frames
// carry prologue copy so the pull-back has a story from the first scroll
const MSG_FRAMES = [1, 2, 3, 4, 5, 6, 7];

// ---------- elements ----------
const doc = document.documentElement;
const $ = (s) => document.querySelector(s);
const cinema = $('#cinema');
const stage = $('#stage');
const canvas = $('#film');
const ctx = canvas.getContext('2d');
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
const anchorStill = $('#anchorStill');
const messages = [...document.querySelectorAll('.msg')];

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;
const useStills = reduceMotion || saveData ||
  new URLSearchParams(location.search).has('stills');
// the lighter sequence only for true touch devices — a narrow *desktop*
// window on a retina display magnifies 720p frames and reads blurry
const small = matchMedia('(max-width: 820px)').matches &&
  matchMedia('(pointer: coarse)').matches;

// ---------- image sequence ----------
// frames are extracted per source clip (no re-encode generation, debanded):
// 61 (desktop) / 31 (touch) per clip + a pinned exact final frame, so
// anchor k sits exactly on frame FPC·k. ~12 fps — with the dissolve,
// scroll-controlled motion reads like the full 24fps master.
const FPC = small ? 31 : 61;
const SEQ_COUNT = FPC * 8 + 1;
const SEQ_DIR = small ? '/media/seq-720' : '/media/seq-1080';
const TIER0_STRIDE = small ? 4 : 8;
const ACTIVATION_URL = '/media/activation.mp4';
const frames = new Array(SEQ_COUNT).fill(null);

const frameUrl = (i) => `${SEQ_DIR}/f_${String(i + 1).padStart(3, '0')}.jpg`;

// ---------- state ----------
let mode = 'boot';                        // boot → activating → cinema
let travel = 1;
let vh = innerHeight;
let lastInputTs = 0;
let settleTimer = 0;
let autopan = null;                       // programmatic scroll animation
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

// ---------- canvas ----------
let dpr = 1;

function sizeCanvas() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(stage.clientWidth * dpr);
  canvas.height = Math.round(stage.clientHeight * dpr);
  ctx.imageSmoothingQuality = 'high';
  lastA = -1;                             // force a redraw at the new size
}

// Never stretch source pixels much past native on desktop — beyond that,
// letterbox into the void (#01060C); the composition is a centred axis on
// near-black, so the bars are invisible. Touch keeps full cover: bars
// would shrink the world to a strip on portrait screens.
const MAX_UPSCALE = 1.2;
let drawRect = { x: 0, y: 0, w: 0, h: 0, letterbox: false };

function computeRect(img) {
  const coverS = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const containS = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const s = small ? coverS : Math.min(coverS, Math.max(containS, MAX_UPSCALE));
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  drawRect = {
    x: (canvas.width - dw) / 2,
    y: (canvas.height - dh) / 2,
    w: dw,
    h: dh,
    letterbox: s < coverS - 1e-6,
  };
}

function drawCover(img) {
  ctx.drawImage(img, drawRect.x, drawRect.y, drawRect.w, drawRect.h);
}

// the hi-res anchor still must occupy the exact same rect as the canvas
// draw, or the rest-point crossfade would jump between crop framings
function syncStillRect() {
  const s = anchorStill.style;
  if (!drawRect.letterbox) {
    s.left = s.top = '0';
    s.right = s.bottom = '';
    s.width = s.height = '100%';
    return;
  }
  s.left = `${drawRect.x / dpr}px`;
  s.top = `${drawRect.y / dpr}px`;
  s.right = s.bottom = 'auto';
  s.width = `${drawRect.w / dpr}px`;
  s.height = `${drawRect.h / dpr}px`;
}

function nearestLoaded(from, dir) {
  for (let i = from; i >= 0 && i < SEQ_COUNT; i += dir) {
    if (frames[i]) return i;
  }
  return -1;
}

// pre-decode a window around the playhead so draws never wait on decode
let warmCenter = -1e9;
function warm(center) {
  if (Math.abs(center - warmCenter) < 2) return;
  warmCenter = center;
  for (let i = Math.max(0, center - 8); i <= Math.min(SEQ_COUNT - 1, center + 8); i++) {
    frames[i]?.decode?.().catch(() => {});
  }
}

let lastA = -1, lastB = -1, lastAlpha = -1;

// scroll progress → fractional frame, piecewise per clip segment so every
// anchor lands exactly on its locked boundary frame
function frameFloatFor(p) {
  let seg = 7;
  for (let k = 1; k < 8; k++) {
    if (p < FRACS[k]) { seg = k - 1; break; }
  }
  const local = clamp((p - FRACS[seg]) / (FRACS[seg + 1] - FRACS[seg]), 0, 1);
  return (seg + local) * FPC;
}

// scrub = draw the frame below the playhead, dissolve the next one over it.
// Both draws are synchronous, so this runs at display rate — no seeks.
function draw(p) {
  const fl = frameFloatFor(p);
  let a = nearestLoaded(Math.floor(fl), -1);
  if (a < 0) a = nearestLoaded(Math.floor(fl) + 1, 1);
  if (a < 0) return;
  let b = nearestLoaded(Math.max(Math.ceil(fl), a + 1), 1);
  if (b < 0) b = a;
  const alpha = b > a ? clamp((fl - a) / (b - a), 0, 1) : 0;
  if (a === lastA && b === lastB && Math.abs(alpha - lastAlpha) < 0.004) return;
  lastA = a; lastB = b; lastAlpha = alpha;
  computeRect(frames[a]);
  syncStillRect();
  if (drawRect.letterbox) {
    ctx.fillStyle = '#01060C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.globalAlpha = 1;
  drawCover(frames[a]);
  if (b !== a && alpha > 0.001) {
    ctx.globalAlpha = alpha;
    drawCover(frames[b]);
    ctx.globalAlpha = 1;
  }
  warm(Math.round(fl));
}

// ---------- preload ----------
// The spec pins it: activation clip + enough frames to scrub before the
// interaction unlocks. Tier 0 (every 4th frame) arms the gate; the rest
// stream in behind and the dissolve tightens as they land.
let activationReady = false;
let tier0Done = false;
let tier0Loaded = 0;
const TIER0 = [];
for (let i = 0; i < SEQ_COUNT; i += TIER0_STRIDE) TIER0.push(i);
if (!TIER0.includes(SEQ_COUNT - 1)) TIER0.push(SEQ_COUNT - 1);
const bytesGot = { a: 0 };
const bytesTotal = { a: 3_000_000 };

function updateCue() {
  const pct = (bytesGot.a / bytesTotal.a) * 0.25 + (tier0Loaded / TIER0.length) * 0.75;
  cueFill.style.width = `${Math.round(clamp(pct, 0, 1) * 100)}%`;
  if (activationReady && tier0Done) {
    doc.dataset.ready = '1';
    cueLabel.textContent = 'Scroll to activate';
  }
}

function loadFrames(indices, onEach) {
  return new Promise((resolve) => {
    let inflight = 0;
    let cursor = 0;
    const pump = () => {
      if (cursor >= indices.length && inflight === 0) return resolve();
      while (inflight < 8 && cursor < indices.length) {
        const i = indices[cursor++];
        if (frames[i]) { onEach?.(); continue; }
        inflight++;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { frames[i] = img; inflight--; onEach?.(); pump(); };
        img.onerror = () => { inflight--; onEach?.(); pump(); };
        img.src = frameUrl(i);
      }
    };
    pump();
  });
}

async function preloadSequence() {
  await loadFrames(TIER0, () => { tier0Loaded++; updateCue(); });
  tier0Done = true;
  updateCue();
  // stream the in-between frames mip-style (halving the stride each tier) —
  // the dissolve simply tightens as each tier lands
  for (let s = TIER0_STRIDE / 2; s >= 1; s /= 2) {
    const tier = [];
    for (let i = s; i < SEQ_COUNT; i += 2 * s) {
      if (!frames[i]) tier.push(i);
    }
    await loadFrames(tier);
  }
  // warm the anchor stills so the rest-point crossfade is instant
  FRACS.forEach((_, i) => { new Image().src = `/media/f${i + 1}.jpg`; });
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

// iOS Safari honors preload="none" strictly and reads nothing until load()
// is called, so force it — and never let a silent engine wedge the gate:
// give up waiting after 5s and let playback initialize on the gesture.
function awaitMetadata(video) {
  video.load();
  return Promise.race([
    new Promise((resolve) => {
      if (video.readyState >= 1) return resolve();
      video.addEventListener('loadedmetadata', resolve, { once: true });
    }),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
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
  activationReady = true;
  tier0Done = true;
  tier0Loaded = TIER0.length;
  bytesGot.a = bytesTotal.a;
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
    if (!(activationReady && tier0Done)) return;     // unlocks only when buffered
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

  // scroll during the light-up is absorbed — extra gestures lean on the throttle
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
  if (!useStills) { sizeCanvas(); draw(0); }
  doc.dataset.film = 'on';                           // sequence frame 0 = activation's last frame
  doc.dataset.mode = 'cinema';                       // unlocks native scroll
  activation.style.opacity = '0';
  scrollTo(0, 0);
  measure();
  hint.classList.add('on');
  hintShown = true;
}

// ---------- scrub loop ----------
// Raw wheel input arrives in discrete jumps; mapping it 1:1 to the film
// reads as jank. smoothP chases the scroll target on an exponential ease
// (~140ms time constant, frame-rate independent), so steps become glides.
let smoothP = 0;
let lastTickTs = 0;

function applyFrame(p) {
  if (useStills) updateStills(p);
  else draw(p);
}

// The paused frame reads soft on large/retina screens, so at every rest
// point the hi-res 3840px still of that exact frame crossfades in over
// the canvas; any scroll movement fades it back out. Hysteresis keeps it
// from flickering at the threshold.
let stillIdx = -1;
let stillOn = false;

function updateAnchorStill(p) {
  if (useStills) return;
  const i = nearestAnchor(p);
  const dist = Math.abs(p - FRACS[i]);
  const on = stillOn ? dist < 0.009 : dist < 0.005;
  if (on && stillIdx !== i) {
    anchorStill.src = `/media/f${i + 1}.jpg`;
    stillIdx = i;
  }
  if (on !== stillOn) {
    stillOn = on;
    anchorStill.classList.toggle('on', on);
  }
}

function updateOverlays(p) {
  updateAnchorStill(p);

  // messages: fully present near their anchor, fading over the outer band —
  // a pure function of scrub position, so the choreography reverses for free
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
    smoothP += (targetP - smoothP) * (1 - Math.exp(-dt / 140));
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
  if (!autopan) { lastInputTs = performance.now(); scheduleSettle(); }
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

replayEl.addEventListener('click', () => seekToFrame(0, 1900));

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
addEventListener('resize', () => {
  measure();
  if (mode === 'cinema' && !useStills) { sizeCanvas(); draw(smoothP); }
});
measure();
armGate();

if (useStills) {
  buildStills();
} else {
  preloadActivation();
  preloadSequence();
}

updateCue();
requestAnimationFrame(tick);

// probe hook for scroll-sweep verification harnesses (headless panes defer
// rAF + scroll events, so invariant checks drive the update directly)
window.__zp = {
  update, progress, measure, FRACS, seekToFrame,
  seqLoaded: () => frames.filter(Boolean).length,
};
