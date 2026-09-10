interface LogoMarkProps {
  size?: number;
  className?: string;
}

// The mark: a geometric "N" monogram (two verticals + a connecting
// diagonal), built on a 0-100 viewBox so it maps 1:1 to the generated
// favicon/PWA icon PNGs (scripts/generate-icons.py uses the same points).
export function LogoMark({ size = 36, className = '' }: LogoMarkProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size * 0.56} height={size * 0.56} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <polygon points="20,15 33,15 33,85 20,85" fill="currentColor" />
        <polygon points="67,15 80,15 80,85 67,85" fill="currentColor" />
        <polygon points="33,15 46,15 80,85 67,85" fill="currentColor" />
      </svg>
    </div>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  wordmarkClassName?: string;
  tagline?: string;
}

export default function Logo({ size = 36, className = '', wordmarkClassName = '', tagline }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <div className="min-w-0">
        <p className={`truncate text-sm font-semibold tracking-tight ${wordmarkClassName}`}>Nexora</p>
        {tagline && <p className="truncate text-[11px] text-neutral-400">{tagline}</p>}
      </div>
    </div>
  );
}
