import Button from '../components/Button';
import Reveal from '../components/Reveal';
import { Container, SectionHeading } from '../components/primitives';

/**
 * The closing band, from the CI's website render: one intentional call to action,
 * on the elevated surface. Copy is the guide's own.
 */
export default function CTABand() {
  return (
    <section className="py-8" id="contact">
      <Container>
        <Reveal>
          <div className="flex flex-col gap-8 rounded-card border border-white/[0.10] bg-slate px-6 py-10 zpTablet:flex-row zpTablet:items-center zpTablet:justify-between zpTablet:px-12 zpTablet:py-14">
            <div>
              <SectionHeading className="mb-3">Ready to unlock value?</SectionHeading>
              <p className="max-w-[46ch] font-body text-base leading-[1.5] text-bright/65">
                Partner with ZeroPoint to build intelligent solutions that drive measurable
                outcomes.
              </p>
            </div>
            <div className="shrink-0">
              <Button variant="primary" arrow href="mailto:gerrit@zeropoint.africa?subject=ZeroPoint%20%E2%80%94%20talk%20to%20an%20expert" fullWidthOnMobile>
                Talk to an Expert
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
