/* The camera rig.
 *
 * The wireframe specifies the whole ride as eight rects in a flat "figure-space"
 * 1000 x 2200 units wide, head top at y=110 and ground at y=2090. This module is the
 * bridge between that 2D spec and the real model, and it is deliberately the only
 * place the two coordinate systems meet.
 *
 * Two facts about the model do the conversion (both measured off the mesh itself,
 * see tools/landmarks.mjs): it stands 1.85 units tall, and its hands sit at z = ±0.353.
 * The wireframe puts the same hands 360 fig-units either side of centre, which gives
 * the horizontal scale; head-top to ground gives the vertical one.
 *
 * The model is not proportioned like the wireframe sketch — its hands hang at 46% of
 * its height, the sketch's at 56% — so rects are NOT mapped straight into world space.
 * Instead each stop keeps the *composition* the storyboard drew: we take the offset
 * from the spec's anchor to its rect centre, and apply that offset to the real
 * landmark. The hand still lands where the storyboard put it in frame; it just lands
 * there on the body the model actually has.
 */

/** Model faces +X. Screen-right is -Z, screen-left is +Z, up is +Y. */
export const FIGURE = {
  height: 1.85,
  groundY: -0.9245,
  topY: 0.9255,
  kV: 1.85 / 1980,      // world units per fig unit, vertical (head top 110 → ground 2090)
  kH: 0.353 / 360,      // world units per fig unit, horizontal (hands at fig x 140/860)
};

/** Landmarks measured from the mesh, used as the stops' real anchors. */
export const ANCHORS = {
  face:    [0, 0.788, 0],
  sternum: [0, 0.520, 0],
  chest:   [0, 0.410, 0],      // plate centre — what the WP3 camera frames
  // The painted disc, measured off the mesh by tools/disc.mjs (4,189 white-trim
  // triangles on the chest front, area-weighted): centre [0.1589, 0.4616, 0.0002],
  // 0.1288 wide x 0.1221 tall. Its 0.126 diameter is the logo's own width, so the mark
  // was authored to sit on it 1:1.
  chestDisc: [0.1706, 0.4616, 0],
  chestDiscSize: 0.1288,
  handR:   [0.01, -0.020, -0.348],
  handL:   [0.01, -0.020, 0.348],
  feet:    [0.01, -0.855, 0],
  centre:  [0, 0.000, 0],
};

/* rect and anchor are verbatim from wireframe 1c; orbit is what phase 2 adds — the
 * spec's flat elevation says nothing about where the camera stands in the round, so
 * each stop gets an azimuth (negative swings toward screen-right) and an elevation
 * (positive looks down). The hand stops swing wide enough to read the palm.
 *
 * `zoom` widens a rect where the sketch and the model disagree about bulk. The
 * sketch's feet are thin ellipses; the real boots are armoured and chunky, so the
 * literal rect puts one boot across half the frame. Widening keeps the shot the
 * storyboard actually drew — the figure standing on solid ground.
 *
 * `nudge` slides a rect in fig units where the model puts something bright exactly
 * where the copy goes. WP3 is the case: the chest disc landed under the eyebrow, and
 * blue caps on a near-white plate is not a contrast ratio worth defending. */
export const WAYPOINTS = [
  { id: 'wp0',  label: 'Face',      rect: [180, 89, 640, 360],       anchor: 'face',    spec: [500, 240],  az: -14, el: 5, zoom: 1.06 },
  { id: 'wp1',  label: 'Descent',   rect: [100, 404, 800, 450],      anchor: 'sternum', spec: [500, 620],  az: -8,  el: 12 },
  { id: 'wp2a', label: 'Studio',    rect: [358, 752, 760, 428],      anchor: 'handR',   spec: [860, 972],  az: -34, el: 9 },
  { id: 'wp2b', label: 'Enterprise',rect: [488, 813, 600, 338],      anchor: 'handR',   spec: [860, 972],  az: -46, el: 5, zoom: 1.15 },
  { id: 'wp3',  label: 'Core',      rect: [160, 576, 680, 383],      anchor: 'chest',   spec: [500, 760],  az: -3,  el: 1, zoom: 1.45, nudge: [0, -70] },
  { id: 'wp4',  label: 'Advisory',  rect: [-118, 752, 760, 428],     anchor: 'handL',   spec: [140, 972],  az: 34,  el: 9 },
  { id: 'wp5',  label: 'Team',      rect: [50, 1771, 900, 506],      anchor: 'feet',    spec: [500, 2062], az: 16,  el: 15, zoom: 1.65 },
  { id: 'wp6',  label: 'Close',     rect: [-1550, 20, 4100, 2306],   anchor: 'centre',  spec: [500, 1150], az: -9,  el: 3 },
];

/** Resolve a waypoint into the raw values the camera interpolates. */
function resolve(wp) {
  const [rx0, ry0, rw, rh] = wp.rect;
  const [nx, ny] = wp.nudge ?? [0, 0];
  const rx = rx0 + nx, ry = ry0 + ny;
  const [ax, ay] = wp.spec;
  const a = ANCHORS[wp.anchor];
  const z = wp.zoom ?? 1;
  // Where the spec's anchor sits relative to its own frame, carried into world space.
  const dy = -((ry + rh / 2) - ay) * FIGURE.kV;
  const dz = -((rx + rw / 2) - ax) * FIGURE.kH;
  return {
    tx: a[0], ty: a[1] + dy, tz: a[2] + dz,
    fw: rw * FIGURE.kH * z,   // intended frame width in world units
    fh: rh * FIGURE.kV * z,   // intended frame height
    az: wp.az * Math.PI / 180,
    el: wp.el * Math.PI / 180,
  };
}

export const STOPS = WAYPOINTS.map(wp => ({ ...wp, ...resolve(wp) }));

const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;

/**
 * Build the scroll → stop timeline.
 * Each beat arrives at its stop 55% of the way through its own scroll range, then
 * holds to the end of the range. The hold is what lets you actually read the panel;
 * the spec calls it "keying each rect at the section's enter and exit edge".
 */
export function buildTimeline(ranges) {
  return STOPS.map((stop, i) => {
    const r = ranges[i];
    return { stop, arrive: i === 0 ? 0 : r.start + (r.end - r.start) * 0.55, hold: r.end };
  });
}

/** Sample the timeline at scroll progress t (0–1). Returns interpolated raw values. */
export function sample(timeline, t) {
  let i = 0;
  while (i < timeline.length - 1 && t >= timeline[i + 1].arrive) i++;
  const a = timeline[i];
  const b = timeline[i + 1];
  if (!b || t <= a.arrive) return { ...a.stop, index: i, blend: 0 };
  if (t <= a.hold) return { ...a.stop, index: i, blend: 0 };
  const k = smootherstep(Math.min(1, (t - a.hold) / Math.max(1e-6, b.arrive - a.hold)));
  return {
    tx: mix(a.stop.tx, b.stop.tx, k), ty: mix(a.stop.ty, b.stop.ty, k), tz: mix(a.stop.tz, b.stop.tz, k),
    fw: mix(a.stop.fw, b.stop.fw, k), fh: mix(a.stop.fh, b.stop.fh, k),
    az: mix(a.stop.az, b.stop.az, k), el: mix(a.stop.el, b.stop.el, k),
    index: k < 0.5 ? i : i + 1,
    blend: k,
  };
}

/**
 * Turn sampled values into a camera placement.
 * Landscape honours the rect: whichever of width or height is the binding constraint
 * decides the framing. Portrait can't honour it — obeying the rect width would push
 * the camera so far back the subject disappears — so it fits height, widens a little,
 * and lifts the subject above the panel that sits along the bottom edge.
 */
export function place(s, aspect, fovDeg) {
  const portrait = aspect < 1;
  let frame = portrait
    ? s.fh * (1 + (1 / aspect - 1) * 0.28)
    : Math.max(s.fh, s.fw / aspect);
  const dist = (frame / 2) / Math.tan(fovDeg * Math.PI / 360);
  // Lift is capped in absolute world units, not left proportional to the frame: on the
  // wide closing shot a proportional lift is half a metre and decapitates the figure.
  const lift = portrait ? Math.min(frame * 0.17, 0.18) : 0;
  const target = [s.tx, s.ty - lift, s.tz];
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
