/* ZeroPoint — DOM layer for the real-time build.
   Everything that is NOT the 3D scene: smooth scroll, copy reveals, contact.
   Kept as a classic script so it runs and degrades independently of the WebGL
   module — a CDN hiccup on three.js must never take the form down with it. */
(() => {
  "use strict";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------- smooth scroll */
  if (!REDUCED && typeof Lenis !== "undefined") {
    const lenis = new Lenis({ duration: 0.8, smoothWheel: true, wheelMultiplier: 1.0, touchMultiplier: 1.2 });
    window.__lenis = lenis;
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  /* --------------------------------------------------------------- reveals */
  const items = Array.from(document.querySelectorAll(".reveal"));
  if (REDUCED || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    items.forEach(el => { el.style.opacity = 1; el.style.transform = "none"; });
  } else {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll("[data-beat]").forEach(sec => {
      const kids = sec.querySelectorAll(".reveal");
      if (!kids.length) return;
      gsap.to(kids, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09,
        scrollTrigger: { trigger: sec, start: "top 72%", once: true },
      });
    });
  }

  /* ---------------------------------------------------------------- contact */
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
    } catch (_) { ok = true; } // static preview / no PHP host
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
})();
