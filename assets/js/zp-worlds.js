/* ZeroPoint — Worlds engine v1.0
   Gerrit's "The Core" scene, ported out of its React/DCLogic bundle into a
   plain script and rebranded to the ZeroPoint CI.

   The scene: one dark core (the zero point, a black hole) at the summit of a
   braided stellar stream; four procedurally-shaded worlds strung along four
   turns of the helix — one per ZeroPoint business world; a ring of starlight
   at the base that resolves into the actual CI mark; a final pull-back that
   reveals the whole formation. The camera falls BACKWARDS down the outside
   of the coil, gazing back up the stream at where it came from — HELIX-V2's
   descent, running in real time.

   Deliberate changes from the standalone (everything else ports verbatim —
   diff against scratchpad/original-core-engine.js if in doubt):
   1. React wrapper -> plain IIFE; refs -> getElementById.
   2. 7 sections -> 8: the manifesto ("departure") is spliced between the
      hero and the first world. Everything keyed to section count shifts
      from 6 to 7 intervals: f = p*7, camera keys grow one entry, the aim
      table gains a second core entry, the finale boundary moves to f > 6.
   3. Inner scroll container -> the page scroll, so anchors, keyboard and
      mobile browser chrome behave; the URL-bar resize guard from site.js
      replaces the ResizeObserver.
   4. The origin ring resolves into assets/logo/mark.svg, billboarded at the
      ring's projected centre — the journey ends on the logo.
   5. Damped pointer parallax on the eye — the scene answers a head move.
   6. Background lifted off pure black onto the peacoat family (CI rule);
      portrait centres the composition (cx 0.5, cy 0.40) so copy owns the
      lower third, and phones run a 0.55 star density (rebuilt if the
      viewport crosses the width class).
   7. Reduced motion: scroll smoothing snaps, scene time freezes, grain
      holds still, parallax off.
   8. The mark billboard draws ABOVE the field on purpose — at the finale
      the logo is chrome, not scenery. */
(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ================================================================ CONTACT */
  function initForm() {
    const form = document.getElementById("contact");
    const note = document.getElementById("c-note");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      note.className = "form-note"; note.textContent = "";
      const d = new FormData(form);
      const name = (d.get("name") || "").toString().trim();
      const email = (d.get("email") || "").toString().trim();
      const message = (d.get("message") || "").toString().trim();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
        note.className = "form-note err";
        note.textContent = "Please add your name, a valid email and a message.";
        return;
      }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Sending…";
      let ok = true;
      try {
        const r = await fetch("send-email.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message }),
        });
        ok = r.ok;
        try { const j = await r.json(); ok = j && j.ok !== false; } catch (_) {}
      } catch (_) { ok = false; } // network failure -> surface the fallback address
      if (ok) {
        note.className = "form-note ok";
        note.textContent = "Thank you — we'll be in touch shortly.";
        form.reset();
      } else {
        note.className = "form-note err";
        note.textContent = "Something went wrong. Email hello@zeropoint.africa instead.";
      }
      btn.disabled = false; btn.textContent = "Talk to an expert";
    });
  }
  try { initForm(); } catch (e) {}

  const veil = document.getElementById("veil");
  const dropVeil = () => {
    if (!veil || veil.classList.contains("hide")) return;
    veil.classList.add("hide"); setTimeout(() => veil.remove(), 900);
  };
  setTimeout(dropVeil, 5000); // never strand the visitor behind the spinner

  const cv = document.getElementById("scene");
  const ctx2d = cv && cv.getContext ? cv.getContext("2d") : null;
  if (!ctx2d) { document.body.classList.add("no-scene"); dropVeil(); return; }

  class Worlds {
    constructor() {
      this.ctx = ctx2d;
      this.p = 0; this.ps = 0;
      this.TOP = 8.6; this.BOT = -8.6; this.RAD = 4.0; this.TURNS = -4;
      /* phones get a thinner field — same look, half the per-frame work */
      this.starDensity = innerWidth < 768 ? 0.55 : 1;
      this.grainAmt = 1;
      this.ptx = 0; this.pty = 0; this.px = 0; this.py = 0; // pointer, damped
      this.shown = false;

      this.sections = Array.from(document.querySelectorAll("[data-sec]"));
      this.railFill = document.querySelector("#rail .fill");
      this.railNum = document.querySelector("#rail .num");

      /* the CI mark — the origin ring resolves into it at the base */
      this.markImg = new Image();
      this.markImg.src = "assets/logo/mark.svg";

      this.resize(true);
      this.buildScene();

      addEventListener("resize", () => this.resize(false), { passive: true });
      addEventListener("pointermove", (e) => {
        this.ptx = (e.clientX / innerWidth) * 2 - 1;
        this.pty = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
      document.addEventListener("pointerleave", () => { this.ptx = 0; this.pty = 0; }, { passive: true });

      this.t0 = performance.now();
      this.loopB = this.loop.bind(this);
      this.raf = requestAnimationFrame(this.loopB);
    }

    /* ---------- noise ---------- */
    h3(x, y, z) { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); }
    vnoise(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = x - xi, yf = y - yi, zf = z - zi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
      const H = this.h3.bind(this);
      const c = (a, b, t) => a + (b - a) * t;
      const x00 = c(H(xi, yi, zi), H(xi + 1, yi, zi), u), x10 = c(H(xi, yi + 1, zi), H(xi + 1, yi + 1, zi), u);
      const x01 = c(H(xi, yi, zi + 1), H(xi + 1, yi, zi + 1), u), x11 = c(H(xi, yi + 1, zi + 1), H(xi + 1, yi + 1, zi + 1), u);
      return c(c(x00, x10, v), c(x01, x11, v), w);
    }
    fbm(x, y, z, o) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * this.vnoise(x * f, y * f, z * f); f *= 2.03; a *= .5; } return s; }

    /* ---------- geometry ---------- */
    helix(u, r) {
      const a = u * this.TURNS * Math.PI * 2 + 0.6, R = r === undefined ? this.RAD : r;
      return [Math.cos(a) * R, this.TOP - u * (this.TOP - this.BOT), Math.sin(a) * R];
    }
    helixAng(u) { return u * this.TURNS * Math.PI * 2 + 0.6; }

    buildScene() {
      const dens = this.starDensity;
      const N = Math.round(9000 * dens);
      const st = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) {
        const u = Math.random();
        const p = this.helix(u);
        // braided: three strands offset around the tube
        const strand = i % 3, ph = strand * 2.094 + u * 46;
        const core = Math.pow(Math.random(), 2.4);
        const tube = 0.62 * core + 0.05;
        const ang = ph + (Math.random() - .5) * 2.6;
        const nrm = this.helixAng(u);
        const ox = Math.cos(nrm) * Math.cos(ang) * tube;
        const oz = Math.sin(nrm) * Math.cos(ang) * tube;
        const oy = Math.sin(ang) * tube;
        st[i * 4] = p[0] + ox + (Math.random() - .5) * .18;
        st[i * 4 + 1] = p[1] + oy + (Math.random() - .5) * .18;
        st[i * 4 + 2] = p[2] + oz + (Math.random() - .5) * .18;
        st[i * 4 + 3] = 0.32 + (1 - core) * 0.68 * Math.random() + 0.12;
      }
      this.stars = st; this.nStars = N;

      // sparse field stars
      const F = Math.round(1100 * dens), fs = new Float32Array(F * 4);
      for (let i = 0; i < F; i++) {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), R = 40 + Math.random() * 40;
        fs[i * 4] = Math.sin(ph) * Math.cos(th) * R; fs[i * 4 + 1] = Math.cos(ph) * R * 1.4; fs[i * 4 + 2] = Math.sin(ph) * Math.sin(th) * R;
        fs[i * 4 + 3] = 0.12 + Math.random() * 0.4;
      }
      this.field = fs; this.nField = F;

      // dust
      const D = Math.round(900 * dens), du = new Float32Array(D * 4);
      for (let i = 0; i < D; i++) {
        const u = Math.random(), p = this.helix(u, this.RAD * (0.3 + Math.random() * 1.5));
        du[i * 4] = p[0] + (Math.random() - .5) * 4; du[i * 4 + 1] = p[1] + (Math.random() - .5) * 4; du[i * 4 + 2] = p[2] + (Math.random() - .5) * 4;
        du[i * 4 + 3] = 0.03 + Math.random() * 0.07;
      }
      this.dust = du; this.nDust = D;

      /* the four worlds, one per turn of the stream:
         basalt  -> World 01 Enterprise Technology (dense, sealed, permanent)
         clouds  -> World 02 Consulting & Media    (banded signal, never still)
         fissure -> World 03 The AI Factory        (lit from inside — own light)
         ice     -> World 04 The Team              (thin atmosphere of people) */
      this.planets = [
        { u: .13, r: .42, kind: 'basalt' },
        { u: .36, r: .64, kind: 'clouds' },
        { u: .59, r: .57, kind: 'fissure' },
        { u: .82, r: .33, kind: 'ice' }
      ].map(o => { const p = this.helix(o.u, this.RAD * 1.02); return Object.assign(o, { x: p[0], y: p[1], z: p[2] }); });
      this.planets.forEach(p => { p.sprite = this.makeSprite(p.kind); });

      // asteroids, thickest around the fissured planet (the factory's ventures)
      const A = 138, ast = [];
      for (let i = 0; i < A; i++) {
        const belt = i < 112;
        const near = belt ? this.planets[2] : this.planets[0];
        const rr = belt ? (0.75 + Math.random() * 1.15) : (1.0 + Math.random() * 1.9);
        const th = Math.random() * Math.PI * 2, el = (Math.random() - .5) * (belt ? .24 : .8);
        const pts = []; const n = 7 + ((Math.random() * 4) | 0);
        for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; const rad = .6 + Math.random() * .55; pts.push([Math.cos(a) * rad, Math.sin(a) * rad]); }
        ast.push({ x: near.x + Math.cos(th) * rr, y: near.y + el, z: near.z + Math.sin(th) * rr, s: .009 + Math.random() * .026, pts, rot: Math.random() * 6.283 });
      }
      this.asteroids = ast;

      this.core = { x: 0, y: this.TOP + 2.6, z: 0, r: 2.15, kind: 'core' };
      this.core.sprite = this.makeSprite('core');
      this.ring = { y: this.BOT - 1.4, r: 2.15 };
      this.grain = this.makeGrain();
      this.buildKeys();
    }

    /* ---------- planet sprites ---------- */
    hexFacet(x, y) {
      const q = (Math.sqrt(3) / 3 * x - y / 3), r = (2 / 3 * y);
      let cx = q, cz = r, cy = -q - r;
      let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
      const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
      if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
      const px = Math.sqrt(3) * (rx + rz / 2), py = 1.5 * rz;
      const d = Math.hypot(x - px, y - py);
      return { d, id: rx * 73.1 + rz * 191.7 };
    }
    makeSprite(kind) {
      const S = 384, R = S * 0.34, C = S / 2;
      const scv = document.createElement('canvas'); scv.width = scv.height = S;
      const ct = scv.getContext('2d');
      const img = ct.createImageData(S, S), d = img.data;
      const Lx = -.52, Ly = .46, Lz = .72;
      const rl = 1 / Math.hypot(Lx, Ly, Lz);
      const lx = Lx * rl, ly = Ly * rl, lz = Lz * rl;
      // rim (back-left) light
      const bx = kind === 'core' ? -.50 : -.82, by = kind === 'core' ? .16 : .22, bz = kind === 'core' ? -.86 : -.52, bl = 1 / Math.hypot(bx, by, bz);
      const rx = bx * bl, ry = by * bl, rz2 = bz * bl;
      const keyMul = kind === 'ice' ? .5 : kind === 'core' ? .35 : 1;
      const rimK = kind === 'core' ? 8.5 : kind === 'clouds' ? 1.5 : 1.9;
      const rimP = kind === 'core' ? 3.4 : 5.0;
      for (let py = 0; py < S; py++) {
        for (let px = 0; px < S; px++) {
          const i = (py * S + px) * 4;
          const nx = (px + .5 - C) / R, nyS = (py + .5 - C) / R;
          const d2 = nx * nx + nyS * nyS;
          const ny = -nyS;
          if (d2 > 1) {
            if (kind === 'ice') {
              const dd = Math.sqrt(d2);
              const a = Math.max(0, 1 - (dd - 1) / 0.16);
              if (a > 0) {
                const lit = Math.max(0, (nx * lx + ny * ly) * .5 + .5);
                const g = Math.pow(a, 2.1) * (0.16 + lit * 0.72);
                d[i] = 150; d[i + 1] = 185; d[i + 2] = 255; d[i + 3] = Math.min(255, g * 200);
              }
            }
            continue;
          }
          const nz = Math.sqrt(Math.max(0, 1 - d2));
          let sx = nx, sy = ny, sz = nz;
          const lat = Math.asin(Math.max(-1, Math.min(1, sy)));
          const lon = Math.atan2(sx, sz);
          let alb = [.10, .12, .16], emR = 0, emG = 0, emB = 0, bump = 0, spec = 0;
          if (kind === 'basalt' || kind === 'core') {
            const sc = kind === 'core' ? 13 : 17;
            const hx = lon / Math.PI * sc, hy = lat / Math.PI * sc;
            const f = this.hexFacet(hx, hy);
            const seam = Math.min(1, Math.max(0, (f.d - .72) / .28));
            bump = (this.h3(f.id, 3.1, 7.7) - .5) * .30;
            const base = kind === 'core' ? .030 : .075;
            const g = base + this.h3(f.id, 1.7, 9.3) * (kind === 'core' ? .022 : .035);
            const shade = 1 - seam * .55;
            alb = [g * .82 * shade, g * .92 * shade, g * 1.30 * shade];
            spec = (1 - seam) * (kind === 'core' ? .05 : .10);
          } else if (kind === 'clouds') {
            const band = Math.sin(lat * 9.5 + this.fbm(sx * 2.2, sy * 5.5, sz * 2.2, 4) * 3.4);
            const g = .40 + band * .10 + this.fbm(sx * 4, sy * 4, sz * 4, 3) * .12;
            alb = [g * .95, g * 1.0, g * 1.1];
          } else if (kind === 'fissure') {
            const n = this.fbm(sx * 3.1, sy * 3.1, sz * 3.1, 5);
            const ridge = 1 - Math.abs(n * 2 - 1);
            const vein = Math.pow(Math.max(0, ridge - .34) / .66, 15);
            const n2 = this.fbm(sx * 8.1 + 11, sy * 8.1, sz * 8.1, 4);
            const vein2 = Math.pow(Math.max(0, (1 - Math.abs(n2 * 2 - 1)) - .42) / .58, 20);
            const v = Math.min(1, vein * .9 + vein2 * .45);
            const g = .050 + this.fbm(sx * 6, sy * 6, sz * 6, 4) * .045;
            alb = [g * .8, g * .9, g * 1.2];
            emR = v * .34; emG = v * .50; emB = v * .82;
          } else if (kind === 'ice') {
            const n = this.fbm(sx * 4.4, sy * 4.4, sz * 4.4, 5);
            const g = .34 + n * .30;
            alb = [g * .96, g * 1.0, g * 1.06];
            spec = .06;
          }
          let mx = sx + bump * .9, my = sy + bump * .5, mz = sz;
          const ml = 1 / Math.hypot(mx, my, mz); mx *= ml; my *= ml; mz *= ml;
          let lam = Math.max(0, mx * lx + my * ly + mz * lz);
          lam = Math.pow(lam, 1.15) * keyMul;
          const rim = Math.pow(1 - nz, rimP) * Math.max(0, sx * rx + sy * ry + sz * rz2) * rimK;
          const amb = 0.030;
          let r = alb[0] * (lam * 1.85 + amb) + emR + rim * 0.72 + spec * Math.pow(lam, 22) * .9;
          let g = alb[1] * (lam * 1.92 + amb * 1.15) + emG + rim * 0.85 + spec * Math.pow(lam, 22);
          let b = alb[2] * (lam * 2.05 + amb * 1.6) + emB + rim * 1.05 + spec * Math.pow(lam, 22) * 1.1;
          const dd = Math.sqrt(d2);
          const aa = Math.min(1, (1 - dd) * R);
          d[i] = Math.min(255, Math.pow(Math.max(0, r), .85) * 255);
          d[i + 1] = Math.min(255, Math.pow(Math.max(0, g), .85) * 255);
          d[i + 2] = Math.min(255, Math.pow(Math.max(0, b), .85) * 255);
          d[i + 3] = Math.max(0, aa) * 255;
        }
      }
      ct.putImageData(img, 0, 0);
      return scv;
    }

    makeGrain() {
      const S = 220, gcv = document.createElement('canvas'); gcv.width = gcv.height = S;
      const ct = gcv.getContext('2d'), img = ct.createImageData(S, S), d = img.data;
      for (let i = 0; i < S * S; i++) {
        const v = 128 + (Math.random() - .5) * 190;
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
      }
      ct.putImageData(img, 0, 0); return gcv;
    }

    resize(force) {
      /* Mobile URL-bar show/hide fires height-only resizes on every scroll
         direction change — reallocating the canvas there blanks it mid-scroll
         (same guard as site.js). Only resize on width change or a big jump. */
      const cw = innerWidth, chh = innerHeight;
      if (!force && this.cssW === cw && Math.abs(chh - (this.cssH || 0)) <= 160) {
        /* ...but a height change that PERSISTS (desktop window drag, split
           view) must eventually commit or the scene stays stretched */
        clearTimeout(this._hT);
        this._hT = setTimeout(() => { if (innerHeight !== this.cssH) this.resize(true); }, 400);
        return;
      }
      this.cssW = cw; this.cssH = chh;
      const dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(cw * dpr));
      cv.height = Math.max(1, Math.round(chh * dpr));
      this.W = cv.width; this.H = cv.height; this.dpr = dpr;
      const dens = cw < 768 ? 0.55 : 1;
      if (dens !== this.starDensity) {
        this.starDensity = dens;
        if (this.stars) this.buildScene(); // rotation across the width class
      }
    }

    /* ---------- camera ---------- */
    buildKeys() {
      /* One u per section, riding just outside the coil, falling downward.
         PORT: a departure key (u = 0.048, just under the core) is spliced in
         for the manifesto beat — 7 keys for 8 sections. */
      this.us = [-0.062, 0.048]
        .concat(this.planets.map(pl => pl.u + 0.020))
        .concat([1.115]);
      this.CR = this.RAD + 1.7;
    }
    camPath(u) {
      const a = this.helixAng(u);
      return [Math.cos(a) * this.CR, this.TOP - u * (this.TOP - this.BOT), Math.sin(a) * this.CR];
    }
    camera(p, time) {
      /* PORT: 8 sections -> f spans [0,7]; keys interpolate over [0,6];
         the finale swing-out runs on f in (6,7]. */
      const us = this.us, f = Math.max(0, Math.min(7, p * 7));
      const i = Math.min(us.length - 2, Math.floor(f)), t = Math.min(1, Math.max(0, f - i));
      const e = t * t * (3 - 2 * t);
      const u = f >= 6 ? us[6] : us[i] + (us[i + 1] - us[i]) * e;
      const eye = this.camPath(u);
      if (f < 1) { const o = (1 - e) * 1.9, a = this.helixAng(u); eye[0] += Math.cos(a) * o; eye[2] += Math.sin(a) * o; }
      eye[1] += Math.sin(time * 0.21) * 0.09;
      // look back along the trajectory, tilted in toward the column
      const bk = this.camPath(u - 0.030);
      const wb = 0.68, wa = 0.32, lift = 5.4;
      let tgt = [bk[0] * wb, bk[1] * wb + (eye[1] + lift) * wa, bk[2] * wb];
      /* ease the aim onto whatever body this section is about — the manifesto
         beat keeps half an eye on the core it is falling away from */
      const feats = [
        [0, this.core.y + 0.1, 0],
        [0, this.core.y + 0.1, 0],
      ].concat(this.planets.map(pl => [pl.x, pl.y, pl.z]))
       .concat([[0, this.ring.y + 0.1, 0]]);
      const si = Math.max(0, Math.min(6, Math.round(f)));
      const w = Math.max(0, 1 - Math.abs(f - si) * 1.7) * (si === 0 ? 1 : si === 1 ? 0.5 : 0.62);
      if (w > 0) tgt = tgt.map((x, j) => x + (feats[si][j] - x) * w);
      if (f > 6) { // the finale: swing out and see the whole formation
        const q = f - 6;
        const k = q * q * (3 - 2 * q);
        const av = this.helixAng(1.115) + 2.05;
        const v = [Math.cos(av) * 34, 1.2, Math.sin(av) * 34];
        for (let j = 0; j < 3; j++) { eye[j] += (v[j] - eye[j]) * k; }
        const vt = [0, 0.5, 0];
        tgt = tgt.map((x, j) => x + (vt[j] - x) * k);
      }
      tgt[1] += Math.sin(time * 0.17) * 0.05;
      return { eye, tgt };
    }

    loop() {
      this.raf = requestAnimationFrame(this.loopB);
      try {
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - innerHeight);
        this.p = clamp(scrollY / max, 0, 1);
        this.ps += (this.p - this.ps) * (REDUCED ? 1 : 0.085);
        const p = this.ps, t = REDUCED ? 0 : (performance.now() - this.t0) / 1000;

        // overlay copy — raw p so the text answers the wheel instantly
        const n = this.sections.length;
        for (let i = 0; i < n; i++) {
          const c = i / (n - 1);
          const dd = Math.abs(this.p - c) / (0.86 / (n - 1));
          let o = Math.max(0, 1 - dd * dd);
          /* PORT: outgoing copy scrolls up under the fixed chrome — kill it
             before it gets there (d7 > 0 = sections scrolled past rest) */
          const d7 = this.p * (n - 1) - i;
          if (d7 > 0) o *= clamp((0.40 - d7) / 0.20, 0, 1);
          const s = this.sections[i];
          s.style.opacity = o.toFixed(3);
          s.style.transform = 'translateY(' + ((this.p - c) * 90).toFixed(1) + 'px)';
        }
        if (this.railFill) this.railFill.style.height = (this.p * 100).toFixed(1) + '%';
        if (this.railNum) this.railNum.textContent = String(Math.round(this.p * 100)).padStart(2, '0');
        if (this.railEl === undefined) this.railEl = document.getElementById('rail');
        if (this.railEl) this.railEl.style.opacity = this.p > 0.92 ? '0' : '1';

        this.draw(p, t);
        if (!this.shown) { this.shown = true; dropVeil(); }
      } catch (e) {
        /* one bad frame must never freeze the descent — recover next frame */
        if (!this.warned) { this.warned = true; console.warn('[zp-worlds]', e); }
      }
    }

    draw(p, t) {
      const ctx = this.ctx, W = this.W, H = this.H;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; // a mid-frame throw must not leak a dimmed frame
      ctx.globalCompositeOperation = 'source-over';
      /* peacoat-family deep space — CI: space is never pure black */
      const bg = ctx.createLinearGradient(0, 0, W * .5, H);
      bg.addColorStop(0, '#0b1322'); bg.addColorStop(1, '#070a12');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const { eye, tgt } = this.camera(p, t);

      /* pointer parallax — a damped head move, never a snap (PORT) */
      if (!REDUCED) {
        this.px += (this.ptx - this.px) * 0.05;
        this.py += (this.pty - this.py) * 0.05;
        let dx0 = tgt[0] - eye[0], dz0 = tgt[2] - eye[2];
        const rl0 = 1 / (Math.hypot(dx0, dz0) || 1);
        const amp = 0.5;
        eye[0] += (-dz0 * rl0) * this.px * amp;
        eye[2] += (dx0 * rl0) * this.px * amp;
        eye[1] += -this.py * amp * 0.6;
      }

      let fx = tgt[0] - eye[0], fy = tgt[1] - eye[1], fz = tgt[2] - eye[2];
      let fl = 1 / Math.hypot(fx, fy, fz); fx *= fl; fy *= fl; fz *= fl;
      // right = normalize(cross(forward, worldUp))
      let rx = -fz, ry = 0, rz = fx;
      const rlen = Math.hypot(rx, rz) || 1; rx /= rlen; rz /= rlen;
      const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
      /* PORT: portrait screens centre the composition and widen the lens a
         touch; landscape keeps the original right-of-centre text bias */
      const portrait = this.cssH > this.cssW;
      const foc = ((portrait ? Math.min(H, W * 1.25) : H) / 2) / Math.tan(0.40);
      const open = Math.max(0, 1 - p * 7);
      const cx = W * (portrait ? 0.5 : 0.605 + 0.085 * open * open);
      const cy = H * (portrait ? 0.40 : 0.50); // portrait copy owns the lower third
      const ex = eye[0], ey = eye[1], ez = eye[2];
      this.eyeP = eye;

      const proj = (x, y, z) => {
        const dx = x - ex, dy = y - ey, dz = z - ez;
        const vz = dx * fx + dy * fy + dz * fz;
        if (vz < 0.06) return null;
        const vx = dx * rx + dy * ry + dz * rz;
        const vy = dx * ux + dy * uy + dz * uz;
        return [cx + foc * vx / vz, cy - foc * vy / vz, vz];
      };

      // big objects sorted far -> near
      const objs = [];
      this.planets.forEach(pl => { const s = proj(pl.x, pl.y, pl.z); if (s) objs.push({ t: 'p', o: pl, s }); });
      { const s = proj(this.core.x, this.core.y, this.core.z); if (s) objs.push({ t: 'core', s }); }
      { const s = proj(0, this.ring.y, 0); if (s) objs.push({ t: 'ring', s }); }
      objs.sort((a, b) => b.s[2] - a.s[2]);
      const depths = objs.map(o => o.s[2]);
      const buckets = []; for (let i = 0; i <= objs.length; i++) buckets.push([]);
      const bucketOf = vz => { let k = 0; while (k < depths.length && depths[k] > vz) k++; return k; };

      // field stars (always farthest)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.nField; i++) {
        const s = proj(this.field[i * 4], this.field[i * 4 + 1], this.field[i * 4 + 2]); if (!s) continue;
        if (s[0] < -20 || s[0] > W + 20 || s[1] < -20 || s[1] > H + 20) continue;
        ctx.fillStyle = 'rgba(190,212,255,' + (this.field[i * 4 + 3] * .5).toFixed(3) + ')';
        ctx.fillRect(s[0], s[1], this.dpr, this.dpr);
      }

      // coil stars into buckets
      for (let i = 0; i < this.nStars; i++) {
        const s = proj(this.stars[i * 4], this.stars[i * 4 + 1], this.stars[i * 4 + 2]); if (!s) continue;
        if (s[0] < -30 || s[0] > W + 30 || s[1] < -30 || s[1] > H + 30) continue;
        buckets[bucketOf(s[2])].push(i);
      }
      // dust bucketed too
      const dbk = []; for (let i = 0; i <= objs.length; i++) dbk.push([]);
      for (let i = 0; i < this.nDust; i++) {
        const s = proj(this.dust[i * 4], this.dust[i * 4 + 1], this.dust[i * 4 + 2]); if (!s) continue;
        if (s[0] < -60 || s[0] > W + 60 || s[1] < -60 || s[1] > H + 60) continue;
        dbk[bucketOf(s[2])].push([s, this.dust[i * 4 + 3]]);
      }
      const abk = []; for (let i = 0; i <= objs.length; i++) abk.push([]);
      for (const a of this.asteroids) {
        const s = proj(a.x, a.y, a.z); if (!s) continue;
        if (s[0] < -80 || s[0] > W + 80 || s[1] < -80 || s[1] > H + 80) continue;
        abk[bucketOf(s[2])].push([s, a]);
      }

      const drawStars = list => {
        ctx.globalCompositeOperation = 'lighter';
        for (const i of list) {
          const s = proj(this.stars[i * 4], this.stars[i * 4 + 1], this.stars[i * 4 + 2]); if (!s) continue;
          const br = this.stars[i * 4 + 3];
          const near = Math.min(1, 9 / s[2]);
          let a = br * near * 0.85;
          if (a < .012) continue;
          const sz = Math.max(this.dpr * .75, Math.min(3.4 * this.dpr, near * 1.5 * this.dpr));
          if (a > .55 && sz > this.dpr * 1.4) {
            const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], sz * 3.4);
            g.addColorStop(0, 'rgba(206,226,255,' + (a * .5).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(120,160,230,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], sz * 3.4, 0, 6.2832); ctx.fill();
          }
          ctx.fillStyle = 'rgba(224,236,255,' + Math.min(1, a).toFixed(3) + ')';
          ctx.fillRect(s[0] - sz / 2, s[1] - sz / 2, sz, sz);
        }
      };
      const drawDust = list => {
        ctx.globalCompositeOperation = 'lighter';
        for (const [s, a] of list) {
          const near = Math.min(1, 10 / s[2]);
          const r = Math.max(1, near * 9 * this.dpr);
          const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], r);
          g.addColorStop(0, 'rgba(120,150,205,' + (a * near).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(80,110,170,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, 6.2832); ctx.fill();
        }
      };
      const drawAst = list => {
        ctx.globalCompositeOperation = 'source-over';
        for (const [s, a] of list) {
          const r = foc * a.s / s[2]; if (r < .35) continue;
          ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(a.rot);
          ctx.beginPath();
          for (let k = 0; k < a.pts.length; k++) { const px = a.pts[k][0] * r, py = a.pts[k][1] * r; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.closePath();
          const g = ctx.createLinearGradient(-r, -r, r * .6, r);
          g.addColorStop(0, 'rgba(74,92,120,.95)'); g.addColorStop(.45, 'rgba(26,33,48,1)'); g.addColorStop(1, 'rgba(9,12,20,1)');
          ctx.fillStyle = g; ctx.fill();
          if (r > 2) { ctx.strokeStyle = 'rgba(150,180,230,.18)'; ctx.lineWidth = Math.max(.5, this.dpr * .5); ctx.stroke(); }
          ctx.restore();
        }
      };

      for (let b = 0; b <= objs.length; b++) {
        drawDust(dbk[b]); drawStars(buckets[b]); drawAst(abk[b]);
        if (b < objs.length) {
          const o = objs[b];
          if (o.t === 'p') this.drawPlanet(ctx, o.o, o.s, foc);
          else if (o.t === 'core') this.drawCore(ctx, o.s, foc);
          else this.drawRing(ctx, proj, foc);
        }
      }

      /* the origin resolves into the mark (PORT): billboarded at the ring's
         centre, scaled so its outer edge lands on the starlight ring itself —
         the logo the whole descent has been falling toward */
      if (this.markImg.complete && this.markImg.naturalWidth) {
        const fRaw = Math.max(0, Math.min(7, p * 7));
        const mA = clamp((fRaw - 5.5) / 0.5, 0, 1);
        if (mA > 0.01) {
          const s = proj(0, this.ring.y, 0);
          if (s) {
            /* capped so the close origin beat composes instead of flooding
               the frame — the finale's pull-back shrinks it naturally */
            const rpx = Math.min(foc * this.ring.r / s[2], H * 0.26, W * 0.40);
            /* portrait: clamp the centre so the whole mark stays on screen —
               a cropped logo is worse than a recomposed one */
            const mcx = portrait ? clamp(s[0], rpx + W * 0.05, W - rpx - W * 0.05) : s[0];
            const mw = rpx * 2, mh = mw * (830 / 1030);
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(mcx, s[1], 0, mcx, s[1], rpx * 1.7);
            g.addColorStop(0, 'rgba(150,186,248,' + (mA * 0.16).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(120,160,230,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mcx, s[1], rpx * 1.7, 0, 6.2832); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = mA;
            ctx.drawImage(this.markImg, mcx - mw / 2, s[1] - mh / 2, mw, mh);
            ctx.globalAlpha = 1;
          }
        }
      }

      // atmosphere wash — entering a world's orbit
      const tints = { basalt: '120,138,168', clouds: '178,196,226', fissure: '108,150,222', ice: '150,182,235' };
      for (const pl of this.planets) {
        const dd = Math.hypot(pl.x - ex, pl.y - ey, pl.z - ez) - pl.r;
        const w = Math.max(0, 1 - dd / (2.6 + pl.r * 3));
        if (w <= 0.001) continue;
        const s = proj(pl.x, pl.y, pl.z);
        const gx = s ? s[0] : cx, gy = s ? s[1] : cy;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 1.05);
        g.addColorStop(0, 'rgba(' + tints[pl.kind] + ',' + (w * w * 0.20).toFixed(3) + ')');
        g.addColorStop(.55, 'rgba(' + tints[pl.kind] + ',' + (w * w * 0.07).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + tints[pl.kind] + ',0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      // grain + vignette
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.055 * this.grainAmt;
      const gs = this.grain.width;
      const gox = REDUCED ? -37 : -Math.random() * gs, goy = REDUCED ? -59 : -Math.random() * gs;
      const pat = ctx.createPattern(this.grain, 'repeat');
      ctx.save(); ctx.translate(gox, goy); ctx.fillStyle = pat; ctx.fillRect(0, 0, W + gs, H + gs); ctx.restore();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    trueDist(o) { const e = this.eyeP; return Math.max(0.2, Math.hypot(o.x - e[0], o.y - e[1], o.z - e[2])); }
    drawPlanet(ctx, pl, s, foc) {
      const r = foc * pl.r / this.trueDist(pl);
      if (r < .4) return;
      ctx.globalCompositeOperation = 'lighter';
      const gr = r * (pl.kind === 'fissure' ? 3.6 : pl.kind === 'clouds' ? 3.0 : 2.4);
      const g = ctx.createRadialGradient(s[0] - r * .35, s[1] - r * .3, 0, s[0], s[1], gr);
      const tint = pl.kind === 'fissure' ? '110,155,235' : pl.kind === 'clouds' ? '150,180,235' : '120,155,215';
      g.addColorStop(0, 'rgba(' + tint + ',' + (pl.kind === 'clouds' ? .16 : .12) + ')');
      g.addColorStop(1, 'rgba(' + tint + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], gr, 0, 6.2832); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      const d = r / 0.68;
      ctx.drawImage(pl.sprite, s[0] - d, s[1] - d, d * 2, d * 2);
    }

    drawCore(ctx, s, foc) {
      const r = foc * this.core.r / this.trueDist(this.core);
      if (r < .5) return;
      ctx.globalCompositeOperation = 'lighter';
      // concentric shells behind the sphere, as in the reference plate
      ctx.lineWidth = Math.max(.5, r * .012);
      for (let k = 1; k <= 8; k++) {
        const rr = r * (1.0 + k * 0.135);
        ctx.strokeStyle = 'rgba(150,186,248,' + (0.085 / (1 + k * 0.55)).toFixed(4) + ')';
        ctx.beginPath(); ctx.arc(s[0], s[1], rr, 0, 6.2832); ctx.stroke();
      }
      const bx = s[0] - r * .34, by = s[1] - r * .10;
      const g = ctx.createRadialGradient(bx, by, r * .80, bx, by, r * 2.7);
      g.addColorStop(0, 'rgba(176,206,255,.40)');
      g.addColorStop(.20, 'rgba(124,166,242,.13)');
      g.addColorStop(1, 'rgba(80,120,210,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r * 2.7, 0, 6.2832); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      const d = r / 0.68;
      ctx.drawImage(this.core.sprite, s[0] - d, s[1] - d, d * 2, d * 2);
    }

    drawRing(ctx, proj, foc) {
      ctx.globalCompositeOperation = 'lighter';
      const N = 460, R = this.ring.r, y = this.ring.y;
      for (let i = 0; i < N; i++) {
        const a = i / N * 6.2832 + (i % 7) * .002;
        const jr = R + (Math.sin(i * 12.9) * .5) * .035;
        const s = proj(Math.cos(a) * jr, y + Math.sin(i * 7.3) * .02, Math.sin(a) * jr);
        if (!s) continue;
        const near = Math.min(1, 10 / s[2]);
        const sz = Math.max(this.dpr * .7, near * 1.5 * this.dpr);
        const al = .35 + .45 * Math.abs(Math.sin(i * 3.7));
        const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], sz * 4);
        g.addColorStop(0, 'rgba(214,232,255,' + (al * near * .38).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(120,160,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], sz * 4, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(232,242,255,' + (al * near).toFixed(3) + ')';
        ctx.fillRect(s[0] - sz / 2, s[1] - sz / 2, sz, sz);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  new Worlds();
})();
