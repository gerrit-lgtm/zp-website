import { lazy, Suspense, useMemo } from 'react';
import HeroBackground from './components/HeroBackground';
import Navbar from './components/Navbar';
import CTABand from './sections/CTABand';
import Clients from './sections/Clients';
import Differentiators from './sections/Differentiators';
import Footer from './sections/Footer';
import Hero from './sections/Hero';
import Worlds from './sections/Worlds';

/**
 * three.js is ~600kB of the bundle, and none of it is needed to paint the hero.
 * Splitting it out lets the type and layout arrive first, and means a device
 * without WebGL never downloads it at all.
 */
const Scene = lazy(() => import('./three/Scene'));

/** One probe, cached — never assume a visitor's device will give us a context. */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function App() {
  const webgl = useMemo(hasWebGL, []);

  return (
    <div className="relative bg-void text-bright">
      {/*
        The scene is fixed, so it persists across the hero and the four Worlds
        and changes state as the reader descends. Sections further down carry
        their own opaque surface and close it out — the immersion is the top of
        the page, not a texture behind everything.
      */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        {webgl ? (
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        ) : (
          <HeroBackground />
        )}

        {/* protection is a gradient, never a capsule: a directional wash that
            keeps the left columns legible over the moving scene */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(96deg, rgba(6,11,20,0.95) 10%, rgba(6,11,20,0.78) 34%, rgba(6,11,20,0.30) 60%, rgba(6,11,20,0) 82%)',
          }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <Worlds />
          <Differentiators />
          <Clients />
          <CTABand />
        </main>
        <Footer />
      </div>
    </div>
  );
}
