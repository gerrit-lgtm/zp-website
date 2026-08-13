import AnimatedHeading from './components/AnimatedHeading';
import Button from './components/Button';
import FadeIn from './components/FadeIn';
import HeroBackground from './components/HeroBackground';
import Navbar from './components/Navbar';

/**
 * The ZeroPoint hero, built to the website system in the CI (p.23), on the CI's
 * 12-column layout (p.26): 1168px content width, 96px desktop margins.
 *
 * Copy is verbatim from the guide — the two-clause headline whose second clause
 * is the payoff, the eyebrow that carries the positioning line, and the CI's own
 * two-tier CTA hierarchy (Explore Solutions primary, Book a Demo secondary).
 */
export default function App() {
  return (
    <div className="relative min-h-screen bg-[color:var(--zp-void)] text-bright">
      <HeroBackground />
      <Navbar />

      <main className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-content px-4 pb-16 pt-[72px] zpTablet:px-16 zpDesktop:px-0">
          {/* the eyebrow: 12px, 0.18em tracking, the positioning line itself */}
          <FadeIn delay={100} duration={800}>
            <p className="mb-6 flex items-center gap-3 font-body text-xs font-semibold uppercase tracking-eyebrow text-stormy">
              <span className="h-px w-7 shrink-0 bg-dazzling" />
              The point where value begins
            </p>
          </FadeIn>

          <AnimatedHeading
            text={'Sovereign AI Infrastructure.\nReal Business Value.'}
            className="mb-6 font-display text-[clamp(29px,5.4vw,64px)] font-bold leading-[1.15] tracking-[-0.02em]"
            delay={200}
            charDelay={30}
          />

          {/* body large: Inter 500, 18/150%, never centred, two to three lines */}
          <FadeIn delay={800} duration={1000}>
            <p className="mb-9 max-w-[46ch] font-body text-base font-medium leading-[1.5] text-bright/70 zpTablet:text-lg">
              Secure. Sovereign. Scalable. AI solutions engineered to transform business
              value.
            </p>
          </FadeIn>

          <FadeIn delay={1200} duration={1000}>
            <div className="flex flex-col gap-4 zpTablet:flex-row zpTablet:flex-wrap">
              <Button variant="primary" arrow fullWidthOnMobile>
                Explore Solutions
              </Button>
              <Button variant="secondary" fullWidthOnMobile>
                Book a Demo
              </Button>
            </div>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}
