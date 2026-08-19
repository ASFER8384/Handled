/** Empty-state spot illustrations. Drawn inline so they stay crisp and themed. */

export function BoltMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <path d="M27 4 10 27h11L19 44 38 20H26Z" fill="#F5C842" />
    </svg>
  );
}

export function LeadsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 80" className={className} aria-hidden fill="none">
      <g className="text-brand-clay-soft" stroke="currentColor">
        <rect
          x="12"
          y="10"
          width="58"
          height="26"
          rx="4"
          transform="rotate(-8 12 10)"
          className="fill-brand-cream"
          strokeWidth="1.5"
        />
        <rect
          x="18"
          y="44"
          width="58"
          height="26"
          rx="4"
          transform="rotate(6 18 44)"
          className="fill-brand-cream"
          strokeWidth="1.5"
        />
      </g>

      <circle cx="27" cy="24" r="6" className="fill-brand-clay" />
      <path d="M41 20h22M41 27h14" className="stroke-brand-ink/70" strokeWidth="2.5" strokeLinecap="round" />

      <circle cx="34" cy="58" r="6" className="fill-brand-sage" />
      <path d="M48 54h22M48 61h14" className="stroke-brand-ink/70" strokeWidth="2.5" strokeLinecap="round" />

      <ellipse cx="92" cy="40" rx="14" ry="30" className="fill-brand-ink" />
      <ellipse cx="88" cy="40" rx="10" ry="26" className="fill-brand-sky" />
    </svg>
  );
}
