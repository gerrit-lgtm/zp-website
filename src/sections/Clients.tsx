import Icon, { type IconName } from '../components/Icon';
import Reveal from '../components/Reveal';
import { Container, Eyebrow, SectionHeading } from '../components/primitives';

/** Who ZeroPoint is built for — the three profiles from the business model. */
const PROFILES: { icon: IconName; who: string; need: string }[] = [
  {
    icon: 'global',
    who: 'Tier-1 enterprises and regulated institutions',
    need: 'Private, sovereign AI deployment inside the perimeter.',
  },
  {
    icon: 'user',
    who: 'C-suite and boards',
    need: 'Strategy, governance, executive enablement and positioning.',
  },
  {
    icon: 'platform',
    who: 'Founders and enterprise spin-outs',
    need: 'An established engineering engine to co-build scalable products on.',
  },
];

export default function Clients() {
  return (
    <section className="py-24 zpTablet:py-32" id="industries">
      <Container>
        <Reveal>
          <Eyebrow className="mb-6">Who we work with</Eyebrow>
          <SectionHeading className="mb-14 max-w-[26ch]">
            A single identity. Every experience.
          </SectionHeading>
        </Reveal>

        <ul className="flex flex-col">
          {PROFILES.map((p, i) => (
            <Reveal as="li" key={p.who} delay={i * 80}>
              <div className="flex flex-col gap-2 border-t border-white/[0.10] py-7 zpTablet:flex-row zpTablet:items-baseline zpTablet:gap-10">
                <span className="flex items-center gap-3 zpTablet:w-[22rem] zpTablet:shrink-0">
                  <span className="text-[#7FA8F0]">
                    <Icon name={p.icon} size={20} />
                  </span>
                  <span className="font-display text-lg font-semibold leading-[1.3] tracking-[-0.01em] text-bright">
                    {p.who}
                  </span>
                </span>
                <span className="font-body text-[15px] leading-[1.5] text-bright/60">{p.need}</span>
              </div>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
