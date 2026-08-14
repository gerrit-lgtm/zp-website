/* The background, as a film rather than a live 3D scene.
 *
 * The suit is pre-rendered in Cycles (render/scene.py) and this plays those frames back:
 * scroll position picks a frame, the frame is drawn cover-fit to a canvas. That is the same
 * mechanism the Bloom reference uses for its video, and it is why the picture can look as
 * good as Blender can make it — the browser is not rendering anything, only showing images.
 *
 * The one real constraint is memory, not bandwidth. 360 frames at 2560x1440 would be about
 * 5 GB if all were held decoded, so frames are kept as compressed <img> data (tens of MB in
 * total) and only a small window around the playhead is asked to decode.
 */

export class Film {
  constructor(mount, { reducedMotion = false } = {}) {
    this.mount = mount;
    this.reduced = reducedMotion;
    this.frames = [];
    this.index = -1;
    this.decoded = new Set();

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.resize();
  }

  /** Load the manifest, pick a size for this screen, then fetch every frame. */
  async load(onProgress) {
    const manifest = await (await fetch('assets/film/manifest.json')).json();
    this.count = manifest.count;

    // The narrow screen is also the metered connection and the slower decoder.
    const wide = Math.max(innerWidth, innerHeight) >= 1000
      && (navigator.deviceMemory ?? 8) > 4
      && navigator.connection?.saveData !== true;
    const size = manifest.sizes.find(s => s.tag === (wide ? 'hd' : 'sd')) ?? manifest.sizes[0];
    this.dir = `assets/film/${size.tag}`;

    let done = 0;
    const load = i => new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      img.src = `${this.dir}/f_${String(i).padStart(4, '0')}.webp`;
      const finish = () => { onProgress?.(++done / this.count); resolve(img); };
      img.onload = finish;
      img.onerror = finish;   // a missing frame must not stall the whole load
      this.frames[i] = img;
    });

    // Fetch the opening frame first so something can be shown immediately, then the rest in
    // small batches — a single burst of 360 requests just queues behind itself.
    await load(0);
    this.draw(0);
    const rest = [...Array(this.count - 1)].map((_, k) => k + 1);
    const BATCH = 12;
    for (let i = 0; i < rest.length; i += BATCH) {
      await Promise.all(rest.slice(i, i + BATCH).map(load));
    }
    return this;
  }

  resize() {
    const w = this.mount.clientWidth, h = this.mount.clientHeight;
    if (!w || !h) return;
    // The frames carry all the detail, so there is nothing to gain above 2x.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    if (this.index >= 0) this.draw(this.index, true);
  }

  /** Cover-fit, so the figure always bleeds off the edges however the window is shaped. */
  draw(i, force = false) {
    const img = this.frames[i];
    if (!img || !img.complete || !img.naturalWidth) return;
    if (i === this.index && !force) return;
    this.index = i;

    const cw = this.canvas.width, ch = this.canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    this.ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  /** Scroll progress 0–1 -> frame. */
  seek(p) {
    if (!this.count) return;
    const t = p < 0 ? 0 : p > 1 ? 1 : p;
    const i = Math.min(this.count - 1, Math.round(t * (this.count - 1)));
    this.draw(i);

    // Warm the frames just ahead of the playhead so a fast scroll does not hit an
    // undecoded image and stutter.
    if (!this.reduced) {
      for (let k = i + 1; k <= Math.min(this.count - 1, i + 8); k++) {
        if (this.decoded.has(k)) continue;
        this.decoded.add(k);
        this.frames[k]?.decode?.().catch(() => {});
      }
    }
  }
}
