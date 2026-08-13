import { Container } from '../components/primitives';

const COLUMNS: { heading: string; links: string[] }[] = [
  { heading: 'Worlds', links: ['Enterprise Technology', 'Consulting & Media', 'The AI Factory', 'The Team'] },
  { heading: 'Company', links: ['About', 'Careers', 'Press', 'Contact'] },
  { heading: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/[0.08] bg-void py-14">
      <Container>
        <div className="flex flex-col gap-12 zpTablet:flex-row zpTablet:justify-between">
          <div className="max-w-[24rem]">
            <span className="flex items-center gap-3">
              <img src="/brand/zeropoint-icon-white.svg" alt="" width={28} height={28} />
              <img
                src="/brand/zeropoint-wordmark-white.svg"
                alt="ZeroPoint"
                width={114}
                height={10}
              />
            </span>
            <p className="mt-5 font-display text-lg font-medium leading-[1.4] tracking-[-0.01em] text-bright/80">
              The point where value begins<span className="zp-stop">.</span>
            </p>
            <p className="mt-3 font-body text-sm leading-[1.43] text-cool">
              Sovereign AI infrastructure, advisory and venture building.
            </p>
          </div>

          <div className="grid gap-10 zpTablet:grid-cols-3 zpTablet:gap-14">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="mb-4 font-body text-[11px] font-semibold uppercase tracking-eyebrow text-stormy">
                  {col.heading}
                </p>
                <ul className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="font-body text-sm text-bright/65 transition-colors duration-150 ease-standard hover:text-bright"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.08] pt-7 font-body text-[13px] text-cool zpTablet:flex-row zpTablet:items-center zpTablet:justify-between">
          <span>© 2026 ZeroPoint · Sovereign AI Solution</span>
          <a
            href="mailto:gerrit@zeropoint.africa"
            className="transition-colors duration-150 ease-standard hover:text-bright"
          >
            gerrit@zeropoint.africa
          </a>
        </div>
      </Container>
    </footer>
  );
}
