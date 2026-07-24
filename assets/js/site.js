/* ZeroPoint — immersive helix engine v2.1
   One continuous reversed descent rendered on a fixed canvas.

   v2 (HELIX-V2.md §7), hardened after adversarial review:
   - one global frame timeline; midline-based beat progress so scroll→frame
     velocity is continuous at every beat handoff (no lurches, no dead zones)
   - sub-frame rendering: fractional position, true-neighbour frames blended
   - inertial smoothing (critically damped) — wheel kicks land like camera weight
   - frames decoded BEFORE first paint (img.decode) + hot-window decode warming
   - priority loader: manifest counts, stride ladder interleaved ACROSS segments,
     2 pool slots reserved for the hot window so flicks are never starved
   - per-segment focal RANGES (start→end keyframe) applied and blended at seams
   - mobile URL-bar resizes ignored; breakpoint crossings re-resolve safely
   Works today on poster fallbacks; drops in real WebP frames the moment
   video-pipeline/process_python.py writes assets/frames/<segment>/. */
(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOBILE_BP = 768;

  /* ================================================================ CONFIG */
  /* Segments in PLAYBACK (descent) order; frames on disk are pre-reversed.
     focal: [startKeyframe, endKeyframe] horizontal crop anchor, blended across
     the segment (see HELIX-V2.md §4 focal spec). */

  const LEGACY = {
    segments: [
      { dir: "01-summit-enterprise", poster: "assets/img/poster-summit.png",  focal: [0.70, 0.70] },
      { dir: "02-galaxy-mid",        poster: "assets/img/poster-summit.png",  focal: [0.58, 0.58] },
      { dir: "03-base-team",         poster: "assets/img/poster-arrival.png", focal: [0.62, 0.62] },
    ],
    beats: [
      { sel: "#hero",         seg: 0, f: [0.00, 0.00] },
      { sel: "#departure",    seg: 0, f: [0.00, 0.50] },
      { sel: "#w-enterprise", seg: 0, f: [0.50, 1.00], holdTail: 0.22 },
      { sel: "#w-consulting", seg: 1, f: [0.00, 0.50], holdTail: 0.22 },
      { sel: "#w-factory",    seg: 1, f: [0.50, 1.00], holdTail: 0.22 },
      { sel: "#team",         seg: 2, f: [0.00, 0.60], holdTail: 0.20 },
      { sel: "#arrival",      seg: 2, f: [0.60, 1.00], holdTail: 0.30 },
    ],
  };

  /* Four-leg journey per prompts/HELIX-V2.md — activate when v1–v4 frames land.
     TODO before flipping: export text-free posters from the approved K0 / K4
     stills (HELIX-V2.md §6 step 4) and point these poster paths at them. */
  const HELIX_V2 = {
    segments: [
      { dir: "01-leg-aperture-bastion", poster: "assets/img/poster-k0.png", focal: [0.68, 0.66] },
      { dir: "02-leg-bastion-signal",   poster: "assets/img/poster-k0.png", focal: [0.66, 0.62] },
      { dir: "03-leg-signal-forge",     poster: "assets/img/poster-k0.png", focal: [0.62, 0.64] },
      { dir: "04-leg-forge-vista",      poster: "assets/img/poster-k4.png", focal: [0.64, 0.55] },
    ],
    beats: [
      { sel: "#hero",         seg: 0, f: [0.00, 0.00] },
      { sel: "#departure",    seg: 0, f: [0.00, 0.55] },
      { sel: "#w-enterprise", seg: 0, f: [0.55, 1.00], holdTail: 0.30 },
      { sel: "#w-consulting", seg: 1, f: [0.00, 1.00], holdTail: 0.30 },
      { sel: "#w-factory",    seg: 2, f: [0.00, 1.00], holdTail: 0.30 },
      { sel: "#team",         seg: 3, f: [0.00, 0.62], holdTail: 0.25 },
      { sel: "#arrival",      seg: 3, f: [0.62, 1.00], holdTail: 0.35 },
    ],
  };

  const ACTIVE = HELIX_V2; // v1–v4 footage processed 24 Jul — orbital descent live

  const SEGMENTS = ACTIVE.segments.map(s => ({
    ...s, focal: Array.isArray(s.focal) ? s.focal : [s.focal, s.focal],
  }));
  const BEATS = ACTIVE.beats.map(b => ({ ...b, el: document.querySelector(b.sel) }))
                            .filter(b => b.el);

  const SMOOTH_RATE = 13;       // 1/s — engine tracks Lenis's already-smoothed scroll tightly
                                //        (Lenis is the single smoothing layer; keep this high so
                                //         the canvas doesn't add a SECOND lag → no floaty drift)
  const POOL = 6;               // concurrent frame fetches…
  const LADDER_POOL = 4;        // …of which background ladder may use at most 4
  const HOT_BEHIND = 12, HOT_AHEAD = 24;
  const STRIDES = [16, 8, 4, 2, 1];

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const isMobile = () => window.innerWidth <= MOBILE_BP;

  /* ================================================================ CANVAS */
  const cv = document.getElementById("frames");
  const ctx = cv.getContext("2d", { alpha: false });
  let mobileMode = isMobile();
  let baseGradient = null;
  let lastW = 0, lastH = 0;

  function sizeCanvas() {
    /* Cap the backing store at source resolution — pixels beyond the 1920w
       (1280w mobile) frames buy nothing and double the fill cost on retina. */
    const srcW = mobileMode ? 1280 : 1920;
    const dpr = Math.min(2, window.devicePixelRatio || 1, srcW / window.innerWidth);
    cv.width = Math.round(window.innerWidth * dpr);
    cv.height = Math.round(window.innerHeight * dpr);
    cv.style.width = window.innerWidth + "px";
    cv.style.height = window.innerHeight + "px";
    lastW = window.innerWidth; lastH = window.innerHeight;
    baseGradient = ctx.createLinearGradient(0, 0, cv.width, cv.height);
    /* Peacoat shades only — CI: space never pure black */
    baseGradient.addColorStop(0, "#1D3557");
    baseGradient.addColorStop(0.5, "#192231");
    baseGradient.addColorStop(1, "#121926");
  }
  sizeCanvas();

  function drawCover(img, focal, extraScale, alpha) {
    const cw = cv.width, ch = cv.height;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(cw / iw, ch / ih) * (extraScale || 1);
    const w = iw * scale, h = ih * scale;
    const x = (cw - w) * clamp(focal, 0, 1);
    const y = (ch - h) * 0.5;
    ctx.globalAlpha = alpha == null ? 1 : clamp(alpha, 0, 1);
    ctx.drawImage(img, x, y, w, h);
    ctx.globalAlpha = 1;
  }

  function paintBase() {
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }

  /* ================================================================ FRAMES */
  /* Global timeline: segment i owns global indices [seg.start, seg.start+count). */

  let frames = [];           // flat global array of decoded Image | undefined
  let inflight = new Set();  // global indices being fetched (per generation)
  let hotQueue = [];
  let ladderQueue = [];
  let activePool = 0;
  let totalFrames = 0;
  let timelineReady = false;
  let generation = 0;        // bumped on breakpoint crossing; voids stale work

  function frameName(i) { return "f_" + String(i + 1).padStart(3, "0") + ".webp"; }

  function loadImage(src) {
    /* Resolve only after pixels are decoded — onload alone means "bytes
       arrived", and the decode would then happen synchronously inside the
       first ctx.drawImage, dropping frames mid-scrub. */
    return new Promise((res, rej) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => {
        if (im.decode) im.decode().then(() => res(im), () => res(im));
        else res(im);
      };
      im.onerror = () => rej(new Error("404 " + src));
      im.src = src;
    });
  }

  async function urlExists(u) {
    try { const r = await fetch(u, { method: "HEAD" }); return r.ok; }
    catch (e) { return false; }
  }

  async function resolveSegment(seg) {
    /* Determine mode + frame count. manifest.json (pipeline-written) preferred;
       fallback: cheap HEAD probes. All writes are generation-guarded. */
    const gen = generation;
    if (!seg.posterImg && seg.poster) {
      loadImage(seg.poster).then(im => { seg.posterImg = im; dirty = true; }).catch(() => {});
    }
    if (REDUCED) { seg.mode = "poster"; return seg; }

    const base = `assets/frames/${seg.dir}/`;
    const dirResolved = mobileMode ? base + "mob/" : base;

    let count = 0;
    try {
      const r = await fetch(base + "manifest.json", { cache: "no-cache" });
      if (r.ok) {
        const m = await r.json();
        count = (mobileMode ? (m.mob || m.frames) : m.frames) | 0;
      }
    } catch (e) { /* no manifest — probe */ }

    if (!count) {
      if (await urlExists(dirResolved + frameName(0))) {
        let lo = 1, hi = 2;
        while (hi <= 512 && await urlExists(dirResolved + frameName(hi - 1))) { lo = hi; hi *= 2; }
        let bad = Math.min(hi, 513);
        while (lo + 1 < bad) {
          const mid = (lo + bad) >> 1;
          if (await urlExists(dirResolved + frameName(mid - 1))) lo = mid; else bad = mid;
        }
        count = lo;
      }
    }

    if (gen !== generation) return seg; // breakpoint crossed mid-resolve
    if (count > 0) { seg.count = count; seg.mode = "frames"; seg.dirResolved = dirResolved; }
    else { seg.mode = "poster"; seg.count = 0; }
    return seg;
  }

  function buildTimeline() {
    let start = 0;
    for (const seg of SEGMENTS) {
      seg.start = start;
      if (seg.mode === "frames") start += seg.count;
      else seg.count = 0;
    }
    totalFrames = start;
    frames = new Array(totalFrames);
    inflight = new Set();
    hotQueue = [];
    ladderQueue = [];

    /* Seam/keyframe frames first, then the stride ladder INTERLEAVED across
       segments — every segment reaches coarse coverage before any refines. */
    const seen = new Set();
    const push = (g) => { if (!seen.has(g)) { seen.add(g); ladderQueue.push(g); } };
    for (const seg of SEGMENTS) {
      if (seg.mode !== "frames") continue;
      push(seg.start);
      push(seg.start + seg.count - 1);
    }
    for (const s of STRIDES) {
      for (const seg of SEGMENTS) {
        if (seg.mode !== "frames") continue;
        for (let i = 0; i < seg.count; i += s) push(seg.start + i);
      }
    }
    timelineReady = totalFrames > 0;
  }

  function segAt(g) {
    for (let i = SEGMENTS.length - 1; i >= 0; i--) {
      const s = SEGMENTS[i];
      if (s.mode === "frames" && g >= s.start && g < s.start + s.count) return s;
    }
    return null;
  }

  function requestHotWindow(target) {
    const lo = Math.min(target, pos == null ? target : pos);
    const hi = Math.max(target, pos == null ? target : pos);
    const from = clamp(Math.floor(lo) - HOT_BEHIND, 0, totalFrames - 1);
    const to = clamp(Math.ceil(hi) + HOT_AHEAD, 0, totalFrames - 1);
    hotQueue = [];
    for (let g = from; g <= to; g++) {
      if (!frames[g] && !inflight.has(g)) hotQueue.push(g);
      else if (frames[g] && frames[g].decode) frames[g].decode().catch(() => {}); // warm
    }
    pump();
  }

  function pump() {
    while (true) {
      while (hotQueue.length && (frames[hotQueue[0]] || inflight.has(hotQueue[0]))) hotQueue.shift();
      while (ladderQueue.length && (frames[ladderQueue[0]] || inflight.has(ladderQueue[0]))) ladderQueue.shift();
      let g;
      if (hotQueue.length && activePool < POOL) g = hotQueue.shift();
      else if (ladderQueue.length && activePool < LADDER_POOL) g = ladderQueue.shift();
      else return;
      const seg = segAt(g);
      if (!seg) continue;
      const gen = generation;
      const infl = inflight; // this generation's set — stale finallys can't corrupt a rebuilt one
      infl.add(g);
      activePool++;
      loadImage(seg.dirResolved + frameName(g - seg.start))
        .then(im => {
          if (gen !== generation) return;
          frames[g] = im;
          /* repaint only if this frame can change what's on screen */
          if (pos == null || Math.abs(g - pos) <= HOT_AHEAD + 8 ||
              !frames[clamp(Math.round(pos), 0, totalFrames - 1)]) dirty = true;
        })
        .catch(() => {})
        .finally(() => { infl.delete(g); activePool--; pump(); });
    }
  }

  function nearestLoaded(g) {
    g = clamp(Math.round(g), 0, totalFrames - 1);
    if (frames[g]) return { img: frames[g], at: g };
    for (let d = 1; d < 512; d++) {
      if (g - d >= 0 && frames[g - d]) return { img: frames[g - d], at: g - d };
      if (g + d < totalFrames && frames[g + d]) return { img: frames[g + d], at: g + d };
    }
    return null;
  }

  function focalAt(g) {
    const seg = segAt(clamp(Math.round(g), 0, totalFrames - 1));
    if (!seg) return 0.5;
    const t = seg.count > 1 ? (g - seg.start) / (seg.count - 1) : 0;
    return lerp(seg.focal[0], seg.focal[1], clamp(t, 0, 1));
  }

  /* ================================================================ SCROLL → TARGET */
  function beatProgress(b) {
    /* Progress measured through the viewport MIDLINE — the same line
       currentBeatIndex() switches beats on. p = 0 exactly when the beat takes
       over, p = 1 exactly when it hands off, for ANY section height: velocity
       is continuous at every boundary (fixes the team→arrival frame lurch). */
    const r = b.el.getBoundingClientRect();
    return clamp((window.innerHeight * 0.5 - r.top) / Math.max(1, r.height), 0, 1);
  }

  function currentBeatIndex() {
    const vh = window.innerHeight;
    const mid = vh * 0.5;
    const first = BEATS[0].el.getBoundingClientRect();
    if (first.top > mid) return 0;
    for (let i = 0; i < BEATS.length; i++) {
      const r = BEATS[i].el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) return i;
    }
    return BEATS.length - 1;
  }

  function targetState() {
    const bi = currentBeatIndex();
    const b = BEATS[bi];
    const seg = SEGMENTS[b.seg];
    let lp = beatProgress(b);
    if (b.holdTail) lp = clamp(lp / (1 - b.holdTail), 0, 1);
    const fr = lerp(b.f[0], b.f[1], lp);
    let global = null;
    if (timelineReady && seg.mode === "frames" && seg.count > 0) {
      global = seg.start + fr * (seg.count - 1);
    }
    return { bi, b, seg, fr, global };
  }

  /* ================================================================ RENDER */
  let pos = null;      // smoothed global frame position
  let dirty = true;
  let chasing = false;
  let lastTick = performance.now();
  let lastScrollY = -1;

  function render(t) {
    if (t.global != null) requestHotWindow(t.global);

    let painted = false;
    if (t.global != null && pos != null) {
      const i0 = clamp(Math.floor(pos), 0, totalFrames - 1);
      const i1 = clamp(i0 + 1, 0, totalFrames - 1);
      const a = clamp(pos - i0, 0, 1);
      const f0 = nearestLoaded(i0);
      const f1 = i1 !== i0 ? nearestLoaded(i1) : f0;
      if (f0) {
        const focal = lerp(focalAt(i0), focalAt(i1), a);
        drawCover(f0.img, focal, 1, 1);
        /* blend true neighbours only — blending across a coarse-load gap
           would paint a ghost double-exposure */
        if (f1 && f1.at === f0.at + 1 && a > 0.01) drawCover(f1.img, focal, 1, a);
        painted = true;
      }
    }
    if (!painted) {
      paintBase();
      if (t.seg.posterImg) {
        const push = 1.0 + t.fr * 0.10;
        const focal = lerp(t.seg.focal[0], t.seg.focal[1], t.fr) + (t.fr - 0.5) * 0.06;
        drawCover(t.seg.posterImg, focal, push, 1);
      }
    }
    updateChrome(t.bi);
  }

  function tick(now) {
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
    const sy = window.scrollY;
    const scrolled = sy !== lastScrollY;
    if (scrolled) lastScrollY = sy;

    if (scrolled || dirty || chasing) {
      const t = targetState();
      if (t.global != null) {
        if (pos == null) pos = t.global;
        const d = t.global - pos;
        if (Math.abs(d) > 0.015) {
          pos += d * (1 - Math.exp(-dt * SMOOTH_RATE));
          chasing = true;
        } else {
          pos = t.global;
          chasing = false;
        }
      } else {
        chasing = false;
      }
      dirty = false;
      render(t);
    }
    requestAnimationFrame(tick);
  }

  /* ================================================================ CHROME */
  const dotsWrap = document.getElementById("dots");
  const fill = document.querySelector("#progress .fill");
  const dots = BEATS.map((b, i) => {
    const bt = document.createElement("button");
    bt.setAttribute("aria-label", b.el.dataset.label || b.sel);
    bt.innerHTML = `<span>${b.el.dataset.label || ""}</span>`;
    bt.addEventListener("click", () => scrollToBeat(i));
    dotsWrap.appendChild(bt);
    return bt;
  });

  let lastBi = -1, lastProg = -1;
  function updateChrome(bi) {
    if (bi !== lastBi) {
      dots.forEach((d, i) => d.setAttribute("aria-current", i === bi ? "true" : "false"));
      lastBi = bi;
    }
    const doc = document.documentElement;
    const p = Math.round(clamp(window.scrollY / (doc.scrollHeight - window.innerHeight), 0, 1) * 1000);
    if (p !== lastProg) {
      fill.style.transform = `scaleX(${p / 1000})`;
      lastProg = p;
    }
  }

  function scrollToBeat(i) {
    const el = BEATS[i].el;
    const y = el.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  /* ================================================================ SMOOTH SCROLL */
  let lenis = null;
  function initSmooth() {
    if (REDUCED || typeof Lenis === "undefined") {
      window.addEventListener("scroll", () => (dirty = true), { passive: true });
      return;
    }
    /* Single, responsive smoothing layer. Short momentum tail so the scene
       tracks the pointer and settles the instant you stop (no floaty drift);
       the engine's SMOOTH_RATE chase above then tracks this tightly. */
    lenis = new Lenis({
      duration: 0.8,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
    });
    lenis.on("scroll", () => (dirty = true));
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ================================================================ RESIZE */
  let resizeT = null;
  window.addEventListener("resize", () => {
    /* Mobile URL-bar show/hide fires height-only resizes on every scroll
       direction change — reallocating the canvas there blanks it mid-scroll.
       Only resize on width change or a large height jump (rotation, window). */
    if (window.innerWidth !== lastW || Math.abs(window.innerHeight - lastH) > 160) {
      sizeCanvas();
    }
    dirty = true;
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (isMobile() !== mobileMode) {
        mobileMode = isMobile();
        generation++;
        timelineReady = false;
        totalFrames = 0;
        frames = [];
        hotQueue = [];
        ladderQueue = [];
        pos = null;
        SEGMENTS.forEach(s => { s.mode = undefined; s.count = 0; s.dirResolved = undefined; });
        sizeCanvas();
        bootFrames();
      }
    }, 300);
  }, { passive: true });

  /* ================================================================ REVEALS */
  function initReveals() {
    const items = Array.from(document.querySelectorAll(".reveal"));
    if (REDUCED || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      items.forEach(el => { el.style.opacity = 1; el.style.transform = "none"; });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    BEATS.forEach(b => {
      const kids = b.el.querySelectorAll(".reveal");
      if (!kids.length) return;
      gsap.to(kids, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09,
        scrollTrigger: { trigger: b.el, start: "top 72%", once: true }
      });
    });
    ScrollTrigger.addEventListener("refresh", () => (dirty = true));
  }

  /* ================================================================ CONTACT */
  function initForm() {
    const form = document.getElementById("contact");
    const note = document.getElementById("c-note");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      note.className = "form-note";
      note.textContent = "";
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
        note.className = "form-note err";
        note.textContent = "Please add your name, a valid email and a message.";
        return;
      }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Sending…";
      try {
        const r = await fetch("send-email.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message })
        });
        let ok = r.ok;
        try { const j = await r.json(); ok = j && j.ok !== false; } catch (_) {}
        succeed(ok);
      } catch (_) {
        succeed(true); // static preview / no PHP host — matches Lion Cage behaviour
      }
      function succeed(ok) {
        if (ok) {
          note.className = "form-note ok";
          note.textContent = "Thank you — we'll be in touch shortly.";
          form.reset();
        } else {
          note.className = "form-note err";
          note.textContent = "Something went wrong. Email hello@zeropoint.africa instead.";
        }
        btn.disabled = false; btn.textContent = "Talk to an expert";
      }
    });
  }

  /* ================================================================ BOOT */
  async function bootFrames() {
    const gen = generation;
    await Promise.all(SEGMENTS.map(resolveSegment));
    if (gen !== generation) return;
    buildTimeline();
    dirty = true;
    pump();
  }

  async function boot() {
    const veil = document.getElementById("veil");
    bootFrames();

    /* reveal as soon as we have anything to show: first frame or first poster */
    await new Promise(res => {
      const check = () => {
        const s0 = SEGMENTS[0];
        if ((timelineReady && frames[s0.start]) || s0.posterImg || s0.mode === "poster") res();
        else setTimeout(check, 60);
      };
      check();
      setTimeout(res, 4000); // never hold the veil hostage
    });

    render(targetState());

    /* Veil comes down BEFORE the fallible inits — a CDN hiccup in GSAP or
       Lenis must never strand the visitor behind the spinner. */
    requestAnimationFrame(() => veil.classList.add("hide"));
    setTimeout(() => veil.remove(), 900);

    try { initReveals(); } catch (e) { /* reveals are progressive enhancement */ }
    try { initForm(); } catch (e) {}
    try { initSmooth(); } catch (e) {}
    requestAnimationFrame(tick);

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => (dirty = true));
    window.addEventListener("load", () => (dirty = true));
  }
  boot();
})();
