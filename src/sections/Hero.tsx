import AnimatedHeading from '../components/AnimatedHeading';
import Button from '../components/Button';
import FadeIn from '../components/FadeIn';
import { Container, Eyebrow } from '../components/primitives';

/**
 * The hero, to the website system on p.23 of the CI: full-bleed, immersive, and
 * left-aligned on the 12-column grid. The two-clause headline whose second
 * clause is the payoff, and the CI's two-tier CTA hierarchy.
 */
export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center" id="top">
      <Container className="pb-24 pt-[72px]">
        <FadeIn delay={100} duration={800}>
          <Eyebrow className="mb-6">The point where value begins</Eyebrow>
        </FadeIn>

        <AnimatedHeading
          text={'Sovereign AI Infrastructure.\nReal Business Value.'}
          className="mb-6 font-display text-[clamp(30px,5.2vw,58px)] font-bold leading-[1.15] tracking-[-0.02em]"
          delay={200}
          charDelay={30}
        />

        <FadeIn delay={800} duration={1000}>
          <p className="mb-9 max-w-[46ch] font-body text-base font-medium leading-[1.5] text-bright/70 zpTablet:text-lg">
            Secure. Sovereign. Scalable. AI solutions engineered to transform business
            value.
          </p>
        </FadeIn>

        <FadeIn delay={1200} duration={1000}>
          <div className="flex flex-col gap-4 zpTablet:flex-row zpTablet:flex-wrap">
            <Button variant="primary" arrow href="#worlds" fullWidthOnMobile>
              Explore Solutions
            </Button>
            <Button variant="secondary" href="#contact" fullWidthOnMobile>
              Book a Demo
            </Button>
          </div>
        </FadeIn>
      </Container>

      {/* the scroll affordance — a precision line, not a bouncing chevron */}
      <FadeIn delay={1600} duration={1000}>
        <div className="pointer-events-none absolute bottom-8 left-0 right-0">
          <Container>
            <span className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-eyebrow text-cool">
              <span className="h-5 w-px bg-white/[0.18]" />
              Scroll to enter
            </span>
          </Container>
        </div>
      </FadeIn>
    </section>
  );
}
