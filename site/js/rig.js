/* The camera.
 *
 * The reference (Bloom) runs a scroll-scrubbed video behind a fixed viewport: one
 * continuous background motion that never stops or holds, with the foreground phases
 * dissolving over it. Our background is the figure rather than footage, so the camera has
 * to behave like that scrub — a single unbroken move across the whole scroll, not the
 * eight discrete stops-and-holds the earlier build used.
 *
 * The path is five keys, smootherstep-interpolated, and it carries a small arc: open
 * tight on chest and head, pull back to reveal the whole figure while the feature cards
 * are up, orbit across during the mission statements, then push in to land on the
 * ZeroPoint mark behind the closing form.
 *
 * Landmarks are measured off the mesh, never guessed — tools/landmarks.mjs for the body,
 * tools/disc.mjs for the chest disc.
 */

/** Model faces +X. Screen-right is -Z, screen-left is +Z, up is +Y. */
export const FIGURE = {
  height: 1.85,
  groundY: -0.9245,
  topY: 0.9255,
};

export const ANCHORS = {
  face: [0, 0.788, 0],
  chest: [0, 0.410, 0],
  handR: [0.01, -0.020, -0.348],
  handL: [0.01, -0.020, 0.348],
  feet: [0.01, -0.855, 0],
  centre: [0, 0.000, 0],
  // The painted disc, measured by tools/disc.mjs: area-weighted centroid of the 4,189
  // white-trim triangles on the chest front. 0.1288 wide x 0.1221 tall, which is the
  // logo's own 0.1256 width — the mark was authored to sit on it 1:1.
  chestDisc: [0.1706, 0.4616, 0],
  chestDiscSize: 0.1288,
};

/* `frame` is the world-space height the camera should see. `az` swings the camera around
 * the figure (negative toward screen-right); `el` raises it (positive looks down). */
export const PATH = [
  { p: 0.00, target: [0, 0.600, 0],    frame: 0.86, az: -13, el: 4 },
  { p: 0.20, target: [0, 0.180, 0],    frame: 1.85, az: -17, el: 3 },
  { p: 0.46, target: [0, 0.010, 0],    frame: 2.35, az: -19, el: 3 },
  { p: 0.74, target: [0, 0.060, 0],    frame: 2.15, az:  15, el: 4 },
  { p: 1.00, target: [0, 0.060, 0],    frame: 2.10, az:  -6, el: 3 },
];

const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;

/** Sample the path at scroll progress p (0–1). */
export function sample(p) {
  const t = p < 0 ? 0 : p > 1 ? 1 : p;
  let i = 0;
  while (i < PATH.length - 2 && t >= PATH[i + 1].p) i++;
  const a = PATH[i], b = PATH[i + 1];
  const k = smootherstep(Math.min(1, Math.max(0, (t - a.p) / (b.p - a.p))));
  return {
    target: [
      mix(a.target[0], b.target[0], k),
      mix(a.target[1], b.target[1], k),
      mix(a.target[2], b.target[2], k),
    ],
    frame: mix(a.frame, b.frame, k),
    az: mix(a.az, b.az, k) * Math.PI / 180,
    el: mix(a.el, b.el, k) * Math.PI / 180,
  };
}

/**
 * Turn a sample into a camera placement. `frame` is a height, so a wider viewport simply
 * sees more to the sides — the reference's background is full-bleed cover and this is the
 * equivalent. Portrait widens a little and lifts the subject clear of the card along the
 * bottom edge; the lift is capped in absolute units because a proportional one
 * decapitates the figure on the wide keys.
 */
export function place(s, aspect, fovDeg) {
  const portrait = aspect < 1;
  const frame = portrait ? s.frame * (1 + (1 / aspect - 1) * 0.26) : s.frame;
  const dist = (frame / 2) / Math.tan(fovDeg * Math.PI / 360);
  const lift = portrait ? Math.min(frame * 0.14, 0.16) : 0;
  const target = [s.target[0], s.target[1] - lift, s.target[2]];
  const ce = Math.cos(s.el);
  return {
    target,
    position: [
      target[0] + ce * Math.cos(s.az) * dist,
      target[1] + Math.sin(s.el) * dist,
      target[2] + ce * Math.sin(s.az) * dist,
    ],
    dist,
  };
}
