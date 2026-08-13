import { useEffect, useRef, useState } from 'react';

/**
 * Whole-document scroll progress, 0 → 1, read on rAF rather than on the scroll
 * event so the 3D scene and the DOM never disagree about where the page is.
 *
 * Returns a ref, not state: the scene reads it every frame, and re-rendering
 * React 60 times a second to move a camera would be wasteful.
 */
export function useScrollProgressRef() {
  const progress = useRef(0);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, []);

  return progress;
}

/** Motion is a preference, not a default — the CI ships the media query. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 0 outside [a,b], ramping 0→1 across it. */
export const band = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

/** Smoothstep — a fast start into a long settle, the CI's easing character. */
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** Frame-rate-independent exponential chase, so scroll steps become glides. */
export const chase = (current: number, target: number, dt: number, tau = 0.18) =>
  current + (target - current) * (1 - Math.exp(-dt / tau));
