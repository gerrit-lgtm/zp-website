import type { ReactNode } from 'react';
import ArrowRight from './ArrowRight';

type ButtonProps = {
  children: ReactNode;
  /** primary = Dazzling Blue fill · secondary = 1px outline · tertiary = text */
  variant?: 'primary' | 'secondary' | 'tertiary';
  /** trailing arrow — the CI's standing affordance on primary and tertiary CTAs */
  arrow?: boolean;
  /** 40px instead of the standard 48px control height, for the navigation bar */
  compact?: boolean;
  /** mobile stacks content and runs CTAs full width (CI p.28) */
  fullWidthOnMobile?: boolean;
  href?: string;
};

/**
 * The CI's button, to the component standards on p.25: 48px control height, 12px
 * radius, 24px padding, 1px borders, Plus Jakarta Sans, 150ms feedback.
 *
 * Interaction follows section 03: hover lightens the fill one step with no scale
 * and no shadow lift; press darkens and takes translateY(1px) with no ripple.
 */
export default function Button({
  children,
  variant = 'primary',
  arrow = false,
  compact = false,
  fullWidthOnMobile = false,
  href = '#',
}: ButtonProps) {
  const height = compact ? 'h-10 px-4 text-[13px]' : 'h-12 px-6 text-sm';

  const look = {
    primary:
      'bg-dazzling text-bright border border-transparent hover:bg-[#3163AE] active:bg-[#254B85]',
    secondary:
      'border border-white/[0.18] text-bright hover:border-white/[0.32] hover:bg-white/[0.04] active:bg-white/[0.08]',
    tertiary: 'border border-transparent text-bright hover:text-[#7FA8F0]',
  }[variant];

  return (
    <a
      href={href}
      className={[
        'group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-display font-semibold',
        'transition-[background-color,border-color,color,transform] duration-150 ease-standard',
        'active:translate-y-px',
        variant === 'tertiary' ? 'px-0' : height,
        variant === 'tertiary' ? 'h-12 text-sm' : '',
        look,
        fullWidthOnMobile ? 'w-full zpTablet:w-auto' : '',
      ].join(' ')}
    >
      {children}
      {arrow && <ArrowRight size={compact ? 16 : 20} />}
    </a>
  );
}
