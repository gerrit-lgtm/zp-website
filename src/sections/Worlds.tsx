import { useEffect, useRef, useState } from 'react';
import Icon, { type IconName } from '../components/Icon';
import Reveal from '../components/Reveal';
import { Container, Eyebrow, Lead, SectionHeading } from '../components/primitives';

/**
 * The four operational pillars. Each gets its own full-height panel so the 3D
 * scene behind has room to change state as the reader arrives — the geometry and
 * the copy advance together rather than the scene decorating a wall of text.
 */

type World = {
  n: string;
  kicker: string;
  title: string;
  /** the brand-voice fragment: short, declarative, often in threes */
  lead: string;
  icon: IconName;
  offerings: string[];
  engagement: string;
};

const WORLDS: World[] = [
  {
    n: '01',
    kicker: 'Enterprise Technology',
    title: 'Sovereign by design.',
    lead: 'Sealed and self-contained. Nothing enters, nothing leaks.',
    icon: 'security',
    offerings: [
      'Sovereign AI architecture, inside your perimeter',
      'Air-gapped and secure enterprise deployment',
      'A scalable backend foundation for AI workloads',
    ],
    engagement: 'Enterprise licensing, infrastructure deployment, and maintenance.',
  },
  {
    n: '02',
    kicker: 'Consulting & Media',
    title: 'Clarity before code.',
    lead: 'Signal, separated from noise — before a line is written.',
    icon: 'insights',
    offerings: [
      'AI strategy and advisory that isolates high-ROI use cases',
      'Executive enablement for the C-suite and the board',
      'Media and narrative around the transformation',
    ],
    engagement: 'Retainers, advisory, project consulting, and executive workshops.',
  },
  {
    n: '03',
    kicker: 'The AI Factory',
    title: 'Build with us. Own what you build.',
    lead: 'A belt of ventures shares this orbit.',
    icon: 'ai-engine',
    offerings: [
      'Rapid prototyping through to shipped commercial product',
      'An enterprise joint-venture incubator',
      'Shared risk and shared reward with institutional partners',
    ],
    engagement: 'Equity in spun-off ventures, co-build models, and product licensing.',
  },
  {
    n: '04',
    kicker: 'The Team',
    title: 'Engineers, strategists and builders.',
    lead: 'Specialised execution, without the bloat.',
    icon: 'user',
    offerings: [
      'A lean, senior, multidisciplinary group',
      'Depth in sovereign infrastructure and applied AI',
      'Accountable for outcomes, not billable hours',
    ],
    engagement: 'Engaged directly — no layers, no handoffs.',
  },
];

/** A fixed index of the four worlds — the CI's precision motif as navigation. */
function WorldRail({ active }: { active: number | null }) {
  return (
    <ol
      className={`pointer-events-none fixed right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-4 transition-opacity duration-[220ms] ease-standard zpDesktop:flex ${
        active === null ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      {WORLDS.map((w, i) => (
        <li key={w.n} className="flex items-center justify-end gap-3">
          <span
            className={`font-body text-[10px] font-semibold uppercase tracking-eyebrow transition-opacity duration-[220ms] ease-standard ${
              i === active ? 'text-bright/70 opacity-100' : 'opacity-0'
            }`}
          >
            {w.kicker}
          </span>
          <span
            className={`block h-px transition-all duration-[220ms] ease-standard ${
              i === active ? 'w-6 bg-dazzling' : 'w-3 bg-white/25'
            }`}
          />
        </li>
      ))}
    </ol>
  );
}

export default function Worlds() {
  /** null = the reader is not inside the Worlds, so the rail stays hidden */
  const [active, setActive] = useState<number | null>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Track the whole intersecting set rather than reacting to single entries:
    // scrolling back above the first panel produces only a *leave*, so a
    // last-one-wins handler would strand the rail on whichever world was last
    // seen — which is how it ended up reading "The Team" over the hero.
    const live = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = panels.current.indexOf(e.target as HTMLElement);
          if (i < 0) continue;
          if (e.isIntersecting) live.add(i);
          else live.delete(i);
        }
        setActive(live.size ? Math.min(...live) : null);
      },
      // fire when a panel owns the middle of the viewport
      { rootMargin: '-45% 0px -45% 0px' },
    );
    panels.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div id="worlds">
      <WorldRail active={active} />

      <Container className="pb-4 pt-24 zpTablet:pt-32">
        <Reveal>
          <Eyebrow className="mb-6">Four worlds, one identity</Eyebrow>
          <SectionHeading className="mb-5">
            Built for impact. Designed for trust.
          </SectionHeading>
          <Lead>
            ZeroPoint runs a hybrid model: enterprise infrastructure, strategic advisory,
            and a venture factory that earns equity in what it builds.
          </Lead>
        </Reveal>
      </Container>

      {WORLDS.map((w, i) => (
        <section
          key={w.n}
          ref={(el) => {
            panels.current[i] = el;
          }}
          // the 3D scene measures these to align its phases with the copy
          data-world={w.n}
          className="flex min-h-[86vh] items-center py-16"
          aria-labelledby={`world-${w.n}`}
        >
          <Container>
            <div className="max-w-[46rem]">
              <Reveal>
                <p className="mb-6 flex items-baseline gap-4">
                  <span className="font-display text-[clamp(40px,6vw,72px)] font-extrabold leading-none tracking-[-0.02em] text-white/[0.07]">
                    {w.n}
                  </span>
                  <span className="font-body text-xs font-semibold uppercase tracking-eyebrow text-dazzling">
                    {w.kicker}
                  </span>
                </p>
              </Reveal>

              <Reveal delay={60}>
                <h3
                  id={`world-${w.n}`}
                  className="mb-5 font-display text-[clamp(26px,3.6vw,40px)] font-semibold leading-[1.2] tracking-[-0.01em] text-bright"
                >
                  {w.title}
                </h3>
              </Reveal>

              <Reveal delay={120}>
                <p className="mb-8 max-w-[40ch] font-display text-[clamp(17px,1.7vw,22px)] font-medium leading-[1.4] tracking-[-0.01em] text-[#7FA8F0]">
                  {w.lead}
                </p>
              </Reveal>

              <Reveal delay={180}>
                <ul className="mb-8 flex flex-col gap-3">
                  {w.offerings.map((o) => (
                    <li key={o} className="flex items-start gap-3">
                      <span className="mt-0.5 text-[#7FA8F0]">
                        <Icon name={w.icon} size={20} />
                      </span>
                      <span className="font-body text-base leading-[1.5] text-bright/80">{o}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={240}>
                <p className="border-t border-white/[0.10] pt-5 font-body text-sm leading-[1.43] text-cool">
                  <span className="font-semibold uppercase tracking-eyebrow text-stormy">
                    How we engage
                  </span>
                  <span className="mt-2 block text-bright/60">{w.engagement}</span>
                </p>
              </Reveal>
            </div>
          </Container>
        </section>
      ))}
    </div>
  );
}
