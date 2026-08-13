import type { ReactNode } from 'react';

/** 1168px content width, and the CI's 96 / 64 / 16px outer margins. */
export function Container({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-content px-4 zpTablet:px-16 zpDesktop:px-0 ${className}`}>
      {children}
    </div>
  );
}

/**
 * The eyebrow: 12px, 0.18em tracking, sentence-cased source text set in caps.
 * The 28px rule before it is the CI's precision-line motif at label scale.
 */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`flex items-center gap-3 font-body text-xs font-semibold uppercase tracking-eyebrow text-stormy ${className}`}
    >
      <span className="h-px w-7 shrink-0 bg-dazzling" />
      {children}
    </p>
  );
}

/**
 * Section heading — H2 in the CI scale (Plus Jakarta Sans SemiBold, 40/120%,
 * −0.01em), fluid down to mobile. Never centred.
 */
export function SectionHeading({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-[clamp(26px,3.4vw,40px)] font-semibold leading-[1.2] tracking-[-0.01em] text-bright ${className}`}
    >
      {children}
    </h2>
  );
}

/** Body copy. Two to three lines, benefit first, and never centred. */
export function Lead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`max-w-[52ch] font-body text-base font-medium leading-[1.5] text-bright/70 zpTablet:text-lg ${className}`}
    >
      {children}
    </p>
  );
}

/**
 * A card: 16px radius, 24px padding, 1px border. On dark there is no shadow at
 * all — elevation is a lighter fill and a brighter border. Hover strengthens the
 * border and lifts the fill ~4%; cards never lift or scale.
 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-card border border-white/[0.10] bg-deep/80 p-6 transition-[background-color,border-color] duration-[220ms] ease-standard hover:border-white/[0.18] hover:bg-deep ${className}`}
    >
      {children}
    </div>
  );
}
