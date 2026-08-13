/**
 * Icons to the CI specification in section 04: outline only, 2px stroke, 24×24
 * grid, rounded corners and joins, no fill, currentColor. Sizes are 16 / 20 / 24
 * only — 24 is the default.
 *
 * The guide defines the specification but ships no distributable set, so these
 * are drawn to it rather than pulled from a library. They match the named system
 * icons on p.20 (security, ai engine, platform, insights, user, analytics).
 */

export type IconName =
  | 'security'
  | 'ai-engine'
  | 'platform'
  | 'insights'
  | 'user'
  | 'analytics'
  | 'global'
  | 'complete';

const PATHS: Record<IconName, string> = {
  // shield-check — sovereign by design
  security: 'M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3zM9 12l2 2 4-4',
  // cpu — the AI factory
  'ai-engine': 'M8 8h8v8H8zM4 10V8a2 2 0 012-2h2M4 14v2a2 2 0 002 2h2M20 10V8a2 2 0 00-2-2h-2M20 14v2a2 2 0 01-2 2h-2M2 12h2M20 12h2M12 2v2M12 20v2',
  // layers — scalable infrastructure
  platform: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  // crosshair — clarity, the precision motif
  insights: 'M12 4a8 8 0 100 16 8 8 0 000-16zM12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3',
  // users — engineers, strategists and builders
  user: 'M16 20v-1.5a4 4 0 00-4-4H7a4 4 0 00-4 4V20M9.5 10.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7M17 4.2a3.5 3.5 0 010 6.6M21 20v-1.5a4 4 0 00-3-3.9',
  // trending-up — measurable outcomes
  analytics: 'M3 17l5.5-5.5 3.5 3.5L21 6M21 6h-5M21 6v5',
  // globe — regulated institutions across markets
  global: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3.6 9h16.8M3.6 15h16.8M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3z',
  // check-circle — complete
  complete: 'M12 3a9 9 0 100 18 9 9 0 000-18zM8 12.5l2.5 2.5L16 9.5',
};

export default function Icon({
  name,
  size = 24,
  className = '',
}: {
  name: IconName;
  size?: 16 | 20 | 24;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * The CI puts card icons inside a chip: a 40–48px circle filled with the chip
 * surface, which on dark is a 16% wash of Dazzling Blue.
 */
export function IconChip({ name }: { name: IconName }) {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(43,87,154,0.16)] text-[#7FA8F0]">
      <Icon name={name} size={24} />
    </span>
  );
}
