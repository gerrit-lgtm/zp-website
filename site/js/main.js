/* Boot, and the one loop that drives everything.
 *
 * The reference's whole feel comes from a single idea: scroll drives a continuous
 * background, and every foreground element arrives and leaves by dissolving — opacity, a
 * short translate, and a blur, all written per frame. Nothing slides in as a solid block,
 * and none of it is a CSS transition, because a transition would fight the scroll.
 *
 * Four phases over the scroll length: the hero card, three solution cards, three
 * statements, then the contact form. The camera (js/rig.js) runs underneath as one
 * unbroken move, so the background never stops while the phases hand over.
 *
 * The page is progressive: the flat fallback in <main> is what you get without WebGL or
 * without JS, and .rig-on is only added once the stage is actually up.
 */

import { Film } from './film.js';

const root = document.documentElement;
const bg = document.getElementById('bg');
const loader = document.getElementById('loader');
const scroll = document.getElementById('scroll');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const el = id => document.getElementById(id);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
/** 0 before `a`, 1 after `b`, linear between. */
const ramp = (t, a, b) => clamp01((t - a) / (b - a));

/* The ride length. The reference uses 500vh; a little more gives the three statements
   room to hold without hurrying. */
scroll.style.height = '520vh';

/* ---------------------------------------------------------------- elements */

const cue = el('cue');
const phases = {
  hero: el('hero'), nav: el('nav'), brand: el('brand'),
  cards: el('cards'), say: el('say'), contact: el('contact'),
};
const cards = [el('card1'), el('card2'), el('card3')];
const says = [el('say1'), el('say2'), el('say3')];
const contactCard = el('contactCard');

/* Split the statements into words so they can resolve one at a time. Done in JS rather than
   the markup so the HTML stays readable and the copy stays editable as sentences. */
for (const node of says) {
  const html = node.innerHTML;
  node.innerHTML = html.replace(/(<span class="pill">.*?<\/span>)|([^\s<]+)/g,
    (m, pill, word) => pill ? `<w>${pill}</w>` : (word ? `<w>${word}</w>` : m));
}
const words = says.map(n => [...n.querySelectorAll('w')]);

/* The progress rail: four numbered stops that fill as each phase passes. */
const STOPS = [
  { n: '01', label: 'Sovereign AI', from: 0.00, to: 0.19 },
  { n: '02', label: 'What we stand for', from: 0.20, to: 0.62 },
  { n: '03', label: 'Solutions', from: 0.63, to: 0.89 },
  { n: '04', label: 'Talk to us', from: 0.90, to: 1.00 },
];
const rail = el('rail');
rail.innerHTML = STOPS.map(s => `<div class="rail__stop"><span class="rail__n">${s.n}</span><span class="rail__bar"><i></i></span></div>`).join('');
const railStops = [...rail.querySelectorAll('.rail__stop')];
const railFills = [...rail.querySelectorAll('.rail__bar i')];
const metaLabel = el('metaLabel'), metaPct = el('metaPct');

/**
 * Write one element's dissolve state. The blur is what makes this read as the reference
 * rather than as a plain fade: elements resolve out of, and back into, defocus.
 */
function dissolve(node, opacity, x, y, blur) {
  if (!node) return;
  node.style.opacity = opacity;
  node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  node.style.filter = blur > 0.02 ? `blur(${blur}px)` : 'none';
}

/** Show/hide a phase container, keeping keyboard focus out of what isn't on screen. */
function present(node, on) {
  if (!node) return;
  if (node.hidden === on) node.hidden = !on;
  node.style.pointerEvents = on ? 'auto' : 'none';
  if (node.inert !== !on) node.inert = !on;
}

/* Where each nav target sits on the ride, so an anchor lands on the phase holding it. */
const MARKS = { top: 0, solutions: 0.755, platform: 0.52, company: 0.905, contact: 0.99 };

const span = () => Math.max(1, root.scrollHeight - innerHeight);
const goTo = frac => scrollTo({ top: span() * frac, behavior: reduced ? 'auto' : 'smooth' });

/* -------------------------------------------------------------------- loop */

const film = new Film(bg, { reducedMotion: reduced });

function paint() {
  const p = clamp01(scrollY / span());
  film.seek(p);

  // Rail + readout: where you are, and how far in.
  STOPS.forEach((st, i) => {
    const f = ramp(p, st.from, st.to);
    railFills[i].style.setProperty('--fill', `${f * 100}%`);
    railStops[i].toggleAttribute('data-on', p >= st.from - 0.01 && p <= st.to + 0.02);
  });
  const active = STOPS.findLast(st => p >= st.from - 0.01) ?? STOPS[0];
  // Before he wakes, the readout says so — it is the same beat as the render.
  const label = p < 0.10 ? 'Dormant' : active.label;
  if (metaLabel.textContent !== label) metaLabel.textContent = label;
  metaPct.textContent = String(Math.round(p * 100)).padStart(2, '0');

  /* --- Phase 1: hero card, nav and brand peel away, staggered like the reference. */
  let f = ramp(p, 0.02, 0.15);
  dissolve(phases.hero, 1 - f, f * -35, f * 35, f * 16);
  present(phases.hero, f < 0.995);

  f = ramp(p, 0.05, 0.17);
  dissolve(phases.nav, 1 - f, 0, f * -35, f * 14);
  present(phases.nav, f < 0.995);

  f = ramp(p, 0.07, 0.19);
  dissolve(phases.brand, 1 - f, f * -25, f * -35, f * 12);
  present(phases.brand, f < 0.995);

  f = ramp(p, 0, 0.08);
  dissolve(cue, 1 - f, 0, f * 20, f * 8);

  /* --- Phase 2: three cards in, then out, each on its own clock. */
  const cardsOn = p > 0.63 && p < 0.89;
  present(phases.cards, cardsOn);
  if (cardsOn) {
    const IN = [[0.665, 0.715], [0.685, 0.735], [0.705, 0.755]];
    const OUT = [[0.845, 0.875], [0.845, 0.882], [0.845, 0.888]];
    const OFF = [[-35, 35], [0, 35], [35, 35]];
    cards.forEach((node, i) => {
      const v = Math.min(ramp(p, IN[i][0], IN[i][1]), 1 - ramp(p, OUT[i][0], OUT[i][1]));
      const away = 1 - v;
      dissolve(node, v, away * OFF[i][0], away * OFF[i][1], away * 16);
    });
  }

  /* --- Phase 3: statements, one at a time, rising out of blur and leaving upward. */
  // in-start, in-end, hold-end, out-end — one entry per statement, on the render's beats
  const T = [
    [0.225, 0.265, 0.350, 0.385],   // the chest, mark lit
    [0.450, 0.485, 0.565, 0.600],   // his right hand
    [0.875, 0.900, 0.925, 0.945],   // over the turn
  ];
  const sayOn = T.some(([a0, , , d0]) => p > a0 - 0.005 && p < d0 + 0.005);
  present(phases.say, sayOn);
  if (sayOn) {
    says.forEach((node, i) => {
      const [a, b, c, d] = T[i];
      const exit = ramp(p, c, d);
      // The block leaves as one, but arrives word by word: each word has its own slice of
      // the entrance, so the sentence resolves in reading order.
      node.style.opacity = 1;
      node.style.filter = 'none';
      node.style.transform = `translate3d(0, ${-exit * 120}px, 0)`;
      const ws = words[i];
      // The whole stagger has to finish well inside the phase. Spreading it over a fixed
      // 0.55 of scroll was longer than the phase itself, so the last words of a sentence
      // never arrived at all.
      const spread = (c - a) * 0.42;
      const slot = spread / Math.max(1, ws.length);
      const dwell = Math.max(0.02, (b - a) * 0.8);
      ws.forEach((w, k) => {
        const enter = ramp(p, a + k * slot, a + k * slot + dwell);
        const v = Math.min(enter, 1 - exit);
        w.style.opacity = v;
        w.style.transform = `translate3d(0, ${(1 - enter) * 26}px, 0)`;
        w.style.filter = v > 0.98 ? 'none' : `blur(${(1 - v) * 12}px)`;
      });
    });
  }

  /* --- Phase 4: the contact card, holding to the end. */
  const contactOn = p > 0.93;
  present(phases.contact, contactOn);
  if (contactOn) {
    const enter = ramp(p, 0.945, 0.98);
    dissolve(contactCard, enter, 0, (1 - enter) * 120, (1 - enter) * 20);
  }

}

let running = true;
function tick() { if (running) paint(); requestAnimationFrame(tick); }

/* ------------------------------------------------------------- interaction */

// Cursor parallax on the background — the reference's move, and cheap.
if (!reduced) {
  addEventListener('mousemove', e => {
    const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
    const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
    bg.style.transform = `translate3d(${x * -24}px, ${y * -24}px, 0)`;
  }, { passive: true });
}

function closeSheet() {
  sheet?.removeAttribute('data-open');
  burger?.setAttribute('aria-expanded', 'false');
  burger?.setAttribute('aria-label', 'Open menu');
}

// The phases are fixed, so in-page anchors have nowhere to land — scroll instead.
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || !root.classList.contains('rig-on')) return;
  const key = a.hash.slice(1);
  if (!(key in MARKS)) return;
  e.preventDefault();
  goTo(MARKS[key]);
  closeSheet();
});

el('cta')?.addEventListener('click', () => goTo(MARKS.solutions));

const burger = el('burger');
const sheet = el('sheet');
burger?.addEventListener('click', () => {
  if (sheet.hasAttribute('data-open')) return closeSheet();
  sheet.setAttribute('data-open', '');
  burger.setAttribute('aria-expanded', 'true');
  burger.setAttribute('aria-label', 'Close menu');
});
sheet?.querySelectorAll('[data-close]').forEach(a => a.addEventListener('click', closeSheet));
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// No backend yet, so this validates and acknowledges rather than pretending to send.
const form = el('form'), note = el('note'), submit = el('submit'), email = el('email');
form?.addEventListener('submit', e => {
  e.preventDefault();
  const value = email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    note.style.color = 'var(--zp-error-on-dark)';
    note.textContent = 'Enter a valid email address so we can reach you.';
    email.focus();
    return;
  }
  submit.textContent = 'Request sent';
  submit.setAttribute('data-sent', '');
  submit.disabled = true;
  note.style.color = '';
  note.textContent = 'Thank you — we will be in touch within one business day.';
});

addEventListener('resize', () => film.resize(), { passive: true });
document.addEventListener('visibilitychange', () => { running = !document.hidden; });

/* --------------------------------------------------------------------- start */

const setPct = v => {
  const n = Math.round(clamp01(v) * 100);
  loader.querySelector('.bar i').style.setProperty('--p', `${n}%`);
  loader.querySelector('[data-pct]').textContent = n;
};

try {
  await film.load(setPct);
  setPct(1);

  root.classList.add('rig-on');
  film.resize();
  paint();
  requestAnimationFrame(tick);

  loader.classList.add('is-done');
  setTimeout(() => { loader.hidden = true; }, 900);
  if (location.search.includes('debug')) window.__zp = { film };
} catch (err) {
  // Frames unavailable: the flat page underneath is the product.
  console.warn('[zeropoint] film unavailable, serving the flat page —', err);
  bg.remove();
  loader.hidden = true;
}
