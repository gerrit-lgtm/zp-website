/* Vendoring all of three/examples/jsm ships ~19 MB for the six addons this site
 * actually imports. Walk the real import graph from js/stage.js and keep only what it
 * reaches, so `vendor/` stays honest about what the page loads. */
import { readFileSync, existsSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';

const SRC = 'vendor/three', TMP = 'vendor/.three-keep';
const CORE = 'vendor/three/build/three.module.js';
const entries = ['js/stage.js'];
const keep = new Set();

function scan(file) {
  if (keep.has(file) || !existsSync(file)) return;
  keep.add(file);
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:^|[\s;])(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    let target;
    if (spec === 'three') target = CORE;
    else if (spec.startsWith('three/addons/')) target = join(SRC, 'jsm', spec.slice('three/addons/'.length));
    else if (spec.startsWith('.')) target = resolve(dirname(file), spec);
    else continue;
    scan(relative(process.cwd(), target));
  }
}
entries.forEach(scan);

const vendored = [...keep].filter(f => f.startsWith('vendor/'));
mkdirSync(TMP, { recursive: true });
for (const f of vendored) {
  const dest = join(TMP, relative(SRC, f));
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(f, dest);
}
rmSync(SRC, { recursive: true, force: true });
cpSync(TMP, SRC, { recursive: true });
rmSync(TMP, { recursive: true, force: true });

const bytes = p => readdirSync(p, { withFileTypes: true }).reduce((s, d) =>
  s + (d.isDirectory() ? bytes(join(p, d.name)) : statSync(join(p, d.name)).size), 0);
console.log(`kept ${vendored.length} modules, ${(bytes(SRC) / 1e6).toFixed(2)} MB:`);
for (const f of vendored.sort()) console.log('  ' + relative(SRC, f));
