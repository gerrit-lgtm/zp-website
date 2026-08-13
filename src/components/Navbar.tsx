import { useEffect, useState } from 'react';
import Button from './Button';

/** The nav model drawn in the CI's website render (p.23). */
const NAV_LINKS = [
  { label: 'Solutions', hasMenu: true },
  { label: 'Platform', hasMenu: false },
  { label: 'Industries', hasMenu: false },
  { label: 'Resources', hasMenu: false },
  { label: 'Company', hasMenu: false },
];

/**
 * Minimal, persistent navigation — 72px tall, transparent over the hero, and a
 * blurred dark bar once the page scrolls (CI section 05, layout rules).
 *
 * Navigation transforms per breakpoint (p.28): full links on desktop (1440+),
 * CTA plus menu control on tablet, menu control alone on mobile.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-40 transition-colors duration-[400ms] ease-standard',
        scrolled ? 'bg-[rgba(6,11,20,0.72)] backdrop-blur-md' : 'bg-transparent',
      ].join(' ')}
      style={scrolled ? { boxShadow: '0 1px 0 rgba(244,244,240,0.08)' } : undefined}
    >
      <div className="mx-auto flex h-[72px] max-w-content items-center gap-8 px-4 zpTablet:px-16 zpDesktop:px-0">
        {/* logo with slogan — the CI composes this lockup from the icon and
            wordmark plus the typeset descriptor */}
        <a href="#" className="flex shrink-0 items-center gap-3" aria-label="ZeroPoint — home">
          <img src="/brand/zeropoint-icon-white.svg" alt="" width={30} height={30} />
          <span className="flex flex-col gap-[3px]">
            <img
              src="/brand/zeropoint-wordmark-white.svg"
              alt="ZeroPoint"
              width={122}
              height={11}
              className="block"
            />
            <span className="font-body text-[8px] font-semibold uppercase leading-none tracking-[0.155em] text-bright/70">
              Sovereign AI Solution
            </span>
          </span>
        </a>

        <nav
          className="ml-auto hidden items-center gap-7 zpDesktop:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map(({ label, hasMenu }) => (
            <a
              key={label}
              href="#"
              className="group flex items-center gap-1.5 font-body text-sm text-bright/80 transition-colors duration-150 ease-standard hover:text-bright"
            >
              {label}
              {hasMenu && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 zpDesktop:ml-0">
          {/* mobile carries the menu control alone — the CTA returns at tablet (p.28) */}
          <div className="hidden zpTablet:block">
            <Button variant="secondary" arrow compact>
              Contact Us
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[6px] zpDesktop:hidden"
          >
            <span
              className={`block h-px w-5 bg-bright transition-transform duration-200 ease-standard ${
                menuOpen ? 'translate-y-[3.5px] rotate-45' : ''
              }`}
            />
            <span
              className={`block h-px w-5 bg-bright transition-transform duration-200 ease-standard ${
                menuOpen ? '-translate-y-[3.5px] -rotate-45' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* content stacks on the small breakpoints, so the menu is a panel */}
      {menuOpen && (
        <div className="border-t border-white/[0.08] bg-[rgba(6,11,20,0.94)] px-4 pb-8 pt-2 backdrop-blur-md zpTablet:px-16 zpDesktop:hidden">
          <nav className="flex flex-col" aria-label="Primary">
            {NAV_LINKS.map(({ label }) => (
              <a
                key={label}
                href="#"
                className="border-b border-white/[0.06] py-4 font-display text-xl font-semibold text-bright"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
