import type { ReactNode } from 'react';
import type { InvoiceStatus } from '@/generated/prisma/enums';
import { FloatingTip } from './floating-tip';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-muted mx-auto mt-1 max-w-sm text-sm">{body}</p>
    </div>
  );
}

/**
 * The ⓘ beside a figure, explaining what it counts. CSS-only: hover and
 * keyboard focus both reveal it, so it needs no client bundle.
 */
export function InfoHint({ text }: { text: string }) {
  return (
    <span className="group/hint relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="text-muted/60 hover:text-foreground focus-visible:text-foreground flex h-4 w-4 items-center justify-center rounded-full transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" strokeLinecap="round" />
          <circle cx="12" cy="7.75" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="bg-brand-ink pointer-events-none absolute bottom-full left-1/2 z-30 mb-2.5 w-56 -translate-x-1/2 rounded-lg px-3.5 py-2.5 text-sm leading-snug text-white opacity-0 transition-opacity duration-150 group-focus-within/hint:opacity-100 group-hover/hint:opacity-100"
      >
        {text}
        <span
          aria-hidden
          className="bg-brand-ink absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45"
        />
      </span>
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-muted text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_PAID: 'Part paid',
  PAID: 'Paid',
  VOID: 'Void',
};

const STATUS_TONES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700',
  SENT: 'bg-blue-50 text-blue-800',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-800',
  PAID: 'bg-emerald-50 text-emerald-800',
  VOID: 'bg-neutral-100 text-neutral-500 line-through',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

/**
 * A dark label on hover, with a notch pointing back at what it names. Use this
 * rather than the `title` attribute: the browser's own tooltip is a pale system
 * box that arrives a second late and cannot be styled to match anything here.
 *
 * Pass `floating` inside anything that scrolls. A box that scrolls clips what
 * grows out of it — a table that scrolls sideways clips upwards too, because
 * overflow in one axis forces it in the other — and a tooltip drawn inside one
 * comes out sliced. The floating one is drawn on the page instead and told
 * where to sit, at the cost of following the hover in JavaScript.
 */
export function Tip({
  label,
  side = 'top',
  floating,
  className = '',
  children,
}: {
  label: string;
  side?: 'top' | 'right';
  floating?: boolean;
  /** For the wrapper, which is inline-flex and so sizes to what it holds. */
  className?: string;
  children: React.ReactNode;
}) {
  if (floating) {
    return (
      <FloatingTip label={label} side={side} className={className}>
        {children}
      </FloatingTip>
    );
  }

  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`bg-brand-ink pointer-events-none absolute z-40 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-opacity group-hover/tip:opacity-100 group-has-[:focus-visible]/tip:opacity-100 ${
          side === 'right'
            ? 'top-1/2 left-full ml-2 -translate-y-1/2'
            : 'bottom-full left-1/2 mb-2 -translate-x-1/2'
        }`}
      >
        {label}
        <span
          aria-hidden
          className={`bg-brand-ink absolute h-2 w-2 rotate-45 rounded-[1px] ${
            side === 'right'
              ? 'top-1/2 right-full translate-x-1 -translate-y-1/2'
              : 'top-full left-1/2 -translate-x-1/2 -translate-y-1'
          }`}
        />
      </span>
    </span>
  );
}
