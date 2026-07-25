/* ZeroPoint — Worlds, film build.

   The canvas engine (zp-worlds.js) renders the descent in real time. This
   build instead scrubs a pre-rendered HD film: the backdrop is generated
   footage, and the page carries only copy, chrome and the CI mark on top.
   Same story, same 8 beats, same scroll mapping — different renderer.

   Why a film at all: a procedural fbm shader has a hard ceiling below what a
   diffusion render reaches, and the brief is a premium, crisp backdrop. What
   the film gives up is real-time response (no pointer parallax, no per-frame
   camera) and responsive recomposition — a fixed frame can only be cropped,
   not re-shot. See FALLBACKS below for what happens when it cannot play.

   Two rules this build must never break:
   1. The CI MARK IS NEVER IN THE FOOTAGE. Generated video mangles a logo.
      The mark is an SVG element composited over the film at the origin beat,
      so it stays vector-crisp and exactly on-brand.
   2. Copy stays DOM text. It must remain selectable, translatable and
      accessible; burning it into footage would lose all three. */
(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* The descent ends on the origin beat and holds — same contract as the
     canvas build, so both renderers tell the identical story. Past this the
     film is parked on its last frame and only the copy keeps scrolling. */
  const SCENE_END = 6 / 7;

  const film = document.getElementById('film');
  const veil = document.getElementById('veil');
  const dropVeil = () => {
    if (!veil || veil.classList.contains('hide')) return;
    veil.classList.add('hide'); setTimeout(() => veil.remove(), 900);
  };
  setTimeout(dropVeil, 6000); // never strand the visitor behind the spinner

  /* FALLBACKS — a film build has more ways to fail than a canvas one, and a
     blank page is not an acceptable outcome for any of them. If the video
     cannot play or cannot be scrubbed, the body keeps the still poster
     (the film's own first frame) and the copy layer carries the page. */
  const bail = (why) => {
    document.body.classList.add('film-static');
    console.warn('[zp-film] falling back to stills:', why);
    dropVeil();
  };
  if (!film) { bail('no video element'); return; }
  film.addEventListener('error', () => bail('video error'));

  const sections = Array.from(document.querySelectorAll('[data-sec]'));
  const railFill = document.querySelector('#rail .fill');
  const railNum = document.querySelector('#rail .num');
  const railEl = document.getElementById('rail');
  const mark = document.getElementById('mark-overlay');

  let dur = 0, ps = 0, wantTime = 0, shown = false;

  const onMeta = () => {
    dur = film.duration || 0;
    /* Scrubbing means the element is ALWAYS paused and driven by
       currentTime. Pause explicitly so nothing plays out from under us. */
    film.pause();
  };
  const onData = () => { if (!shown) { shown = true; dropVeil(); } };

  film.addEventListener('loadedmetadata', onMeta);
  film.addEventListener('loadeddata', onData);
  /* preload="auto" means the browser may already have metadata — and in
     practice usually does — before this script parses. Registering a
     listener then waits forever for an event that has ALREADY fired, which
     leaves dur at 0 and silently disables the entire scrub. Catch up to
     whatever state the element is already in. */
  if (film.readyState >= 1 /* HAVE_METADATA */) onMeta();
  if (film.readyState >= 2 /* HAVE_CURRENT_DATA */) onData();

  function frame() {
    requestAnimationFrame(frame);

    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const p = clamp(scrollY / max, 0, 1);
    ps += (p - ps) * (REDUCED ? 1 : 0.10);

    /* ---- copy overlay: driven by RAW p so text answers the wheel instantly,
       exactly as the canvas build does. Identical maths, so the two builds
       are visually interchangeable at the copy layer. ---- */
    const n = sections.length;
    for (let i = 0; i < n; i++) {
      const c = i / (n - 1);
      const dd = Math.abs(p - c) / (0.86 / (n - 1));
      let o = Math.max(0, 1 - dd * dd);
      const d7 = p * (n - 1) - i;
      if (d7 > 0) o *= clamp((0.40 - d7) / 0.20, 0, 1);
      const s = sections[i];
      s.style.opacity = o.toFixed(3);
      s.style.transform = 'translateY(' + ((p - c) * 90).toFixed(1) + 'px)';
    }
    if (railFill) railFill.style.height = (p * 100).toFixed(1) + '%';
    if (railNum) railNum.textContent = String(Math.round(p * 100)).padStart(2, '0');
    if (railEl) railEl.style.opacity = p > 0.92 ? '0' : '1';

    /* ---- the mark: fades in over the last stretch of the descent and holds,
       landing on the point of light the film converges to. Never in the
       footage — this is the real vector asset. ---- */
    if (mark) {
      const fRaw = clamp(p * 7, 0, 7);
      mark.style.opacity = clamp((fRaw - 5.5) / 0.5, 0, 1).toFixed(3);
    }

    /* ---- the film ---- */
    if (!dur) { dur = film.duration || 0; return; } // metadata may land late
    const t = clamp(ps / SCENE_END, 0, 1) * dur;
    wantTime = Math.min(dur - 0.02, t);
    /* Only seek on a real change, and never stack seeks — issuing a new
       currentTime while one is in flight is what makes scrub builds stutter
       and, on Safari, drop frames entirely. Gate on the element's OWN
       `seeking` property rather than a flag of our own: a local flag has to
       be cleared by a 'seeked' event that does not always arrive, and one
       missed event would wedge the scrub permanently. */
    if (!film.seeking && Math.abs(film.currentTime - wantTime) > 1 / 50) {
      try { film.currentTime = wantTime; } catch (_) { /* not seekable yet */ }
    }
  }
  requestAnimationFrame(frame);

  /* the contact form is shared with the canvas build */
  const form = document.getElementById('contact');
  const note = document.getElementById('c-note');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      note.className = 'form-note'; note.textContent = '';
      const d = new FormData(form);
      const name = (d.get('name') || '').toString().trim();
      const email = (d.get('email') || '').toString().trim();
      const message = (d.get('message') || '').toString().trim();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
        note.className = 'form-note err';
        note.textContent = 'Please add your name, a valid email and a message.';
        return;
      }
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Sending…';
      let ok = true;
      try {
        const r = await fetch('send-email.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message }),
        });
        ok = r.ok;
        try { const j = await r.json(); ok = j && j.ok !== false; } catch (_) {}
      } catch (_) { ok = false; }
      note.className = 'form-note ' + (ok ? 'ok' : 'err');
      note.textContent = ok
        ? "Thank you — we'll be in touch shortly."
        : 'Something went wrong. Email hello@zeropoint.africa instead.';
      if (ok) form.reset();
      btn.disabled = false; btn.textContent = 'Talk to an expert';
    });
  }
})();
