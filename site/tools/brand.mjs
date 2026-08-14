import { readFileSync, writeFileSync } from 'node:fs';

// The three brand marks are one artwork cropped three ways — keep a single copy of the
// path data and re-window it, so a CI update never has to be applied in three places.
// The artwork paints through one full-canvas rect, which an <img>-embedded SVG will
// happily draw outside the viewBox if the box aspect doesn't match exactly (the icon
// bleeds in above a wordmark). Clamping the paint rect to the crop window makes each
// mark self-contained regardless of how it is boxed.
const src = readFileSync('assets/brand/zeropoint-lockup-white.svg', 'utf8');
const crop = (vb, w, h) => {
  const [x, y] = vb.split(' ');
  return src
    .replace(/viewBox="[^"]*"/, `viewBox="${vb}"`)
    .replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)
    .replace(
      /<rect x="0" y="0" width="2048" height="2048"/,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}"`,
    );
};

writeFileSync('assets/brand/zeropoint-icon-white.svg', crop('620 455 810 800', 810, 800));
writeFileSync('assets/brand/zeropoint-wordmark-white.svg', crop('205 1370 1660 150', 1660, 150));

// The chest mark is real geometry now (assets/zp-logo.glb), so no raster is needed.
console.log('brand marks written');
