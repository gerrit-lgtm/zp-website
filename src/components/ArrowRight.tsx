/**
 * The CI's most-used glyph — it terminates every primary CTA and every "Learn
 * more" link, and nudges 4px right on hover (the brand's signature hover).
 *
 * Drawn to the iconography spec in section 04: outline only, 2px stroke, 24×24
 * grid, rounded corners, currentColor, no fill.
 */
export default function ArrowRight({ size = 20 }: { size?: number }) {
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
      className="shrink-0 transition-transform duration-150 ease-standard group-hover:translate-x-1"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
