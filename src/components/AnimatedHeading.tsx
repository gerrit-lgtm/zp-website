import { useEffect, useState, type CSSProperties } from 'react';

type AnimatedHeadingProps = {
  /** Newline-separated copy; each line animates as its own wrapped row. */
  text: string;
  className?: string;
  style?: CSSProperties;
  /** ms before the first character starts moving */
  delay?: number;
  /** ms between consecutive characters */
  charDelay?: number;
  /** CI headlines are left-aligned; centre exists for standalone statements */
  align?: 'left' | 'center';
};

type Char = { ch: string; index: number };

/**
 * Group a line into words, each carrying its trailing space.
 *
 * Characters are the animated units, but they cannot also be the *layout* units:
 * a flex row wraps between its items, so one item per character lets a break
 * land mid-word ("Infrastructu / re.") once the line no longer fits. Wrapping
 * each word in a nowrap inline-block keeps the break opportunities at spaces.
 * `index` is the character's position in the original line, so the stagger is
 * unaffected by the grouping.
 */
function toWords(line: string): Char[][] {
  const words: Char[][] = [];
  let word: Char[] = [];
  Array.from(line).forEach((ch, index) => {
    word.push({ ch, index });
    if (ch === ' ') {
      words.push(word);
      word = [];
    }
  });
  if (word.length) words.push(word);
  return words;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Wipes a heading in character by character from the left, on the CI's standard
 * ease — a fast start into a long settle. The split happens at render time, so
 * the accessible name comes from `text` rather than from a few dozen
 * single-letter spans.
 *
 * The last character is tagged `.zp-stop` when it is a full stop, which is the
 * CI's one typographic flourish: a single Dazzling Blue stop after the final
 * word of a brand statement.
 */
export default function AnimatedHeading({
  text,
  className = '',
  style,
  delay = 0,
  charDelay = 30,
  align = 'left',
}: AnimatedHeadingProps) {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const id = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);

  const lines = text.split('\n');
  const justify = align === 'center' ? 'justify-center' : 'justify-start';
  const lastLine = lines.length - 1;

  return (
    <h1 className={className} style={style} aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} className={`flex flex-wrap ${justify}`} aria-hidden="true">
          {toWords(line).map((word, wordIndex) => (
            <span key={wordIndex} className="inline-block whitespace-nowrap">
              {word.map(({ ch, index }) => {
                const isStop = ch === '.';
                const isBrandStop = isStop && lineIndex === lastLine && index === line.length - 1;
                return (
                  <span
                    key={index}
                    className={`inline-block transition-all duration-500 ease-standard${
                      isStop ? ' zp-kern-stop' : ''
                    }${isBrandStop ? ' zp-stop' : ''}`}
                    style={{
                      opacity: shown ? 1 : 0,
                      transform: shown || reduced ? 'translateX(0)' : 'translateX(-18px)',
                      transitionDelay: reduced
                        ? '0ms'
                        : `${lineIndex * line.length * charDelay + index * charDelay}ms`,
                    }}
                  >
                    {/* an inline-block holding a plain space would collapse away */}
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
      ))}
    </h1>
  );
}
