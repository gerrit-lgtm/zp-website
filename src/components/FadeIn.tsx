import { useEffect, useState, type ReactNode } from 'react';

type FadeInProps = {
  children: ReactNode;
  /** ms before the fade starts */
  delay?: number;
  /** ms the fade itself takes */
  duration?: number;
  className?: string;
};

export default function FadeIn({
  children,
  delay = 0,
  duration = 800,
  className = '',
}: FadeInProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{ opacity: shown ? 1 : 0, transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
