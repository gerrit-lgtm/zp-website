import { IconChip, type IconName } from '../components/Icon';
import Reveal from '../components/Reveal';
import { Card, Container, Eyebrow, SectionHeading } from '../components/primitives';

/**
 * The three differentiators from the business model. Card titles run two to
 * three words and card bodies stay at a sentence, per the CI's microcopy rules.
 */
const ITEMS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'security',
    title: 'Total data sovereignty',
    body: 'Complete ownership and a secure architectural foundation, built for high-compliance sectors.',
  },
  {
    icon: 'insights',
    title: 'Strategy first',
    body: 'A clear business case and ROI before software — the step that prevents costly AI failures.',
  },
  {
    icon: 'analytics',
    title: 'Aligned incentives',
    body: 'We co-build and take equity rather than fees alone, so the upside is shared.',
  },
];

export default function Differentiators() {
  return (
    <section className="bg-abyss py-24 zpTablet:py-32" id="platform">
      <Container>
        <Reveal>
          <Eyebrow className="mb-6">Why ZeroPoint</Eyebrow>
          <SectionHeading className="mb-14 max-w-[24ch]">
            Technology is never the destination. Value is.
          </SectionHeading>
        </Reveal>

        <ul className="grid gap-6 zpTablet:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal as="li" key={item.title} delay={i * 80}>
              <Card className="h-full">
                <IconChip name={item.icon} />
                <h3 className="mb-3 mt-6 font-display text-xl font-semibold leading-[1.3] tracking-[-0.01em] text-bright">
                  {item.title}
                </h3>
                <p className="font-body text-[15px] leading-[1.5] text-bright/65">{item.body}</p>
              </Card>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
