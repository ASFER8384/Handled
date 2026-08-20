'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { INVOICE_TEMPLATES } from '@/lib/invoice-templates';

/**
 * Making an invoice for a project starts by asking how you want to start it.
 *
 * A blank form is the fastest way to retype what you wrote last time, so the
 * three usual shapes — a deposit, a balance, the whole job — are offered
 * first. Blank is still there, one line down, for the invoice that is nothing
 * like the last one.
 */
export function CreateFileButton({
  projectId,
  label = 'Create file',
  className = 'btn-primary px-5 py-2.5',
}: {
  /** Left out on the Invoices page: the invoice is filed later, or never. */
  projectId?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function start(template?: string) {
    const query = new URLSearchParams();
    if (projectId) query.set('project', projectId);
    if (template) query.set('start', template);
    const asked = query.toString();
    router.push(`/invoices/new${asked ? `?${asked}` : ''}`);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {open && (
        <Dialog title="Create a new invoice" onClose={() => setOpen(false)} width={560} fit>
          <p className="text-[17px]">How would you like to start?</p>

          <div className="mt-5 space-y-3">
            {INVOICE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => start(template.id)}
                className="border-line hover:border-accent hover:bg-accent-soft/30 flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors"
              >
                <span className="border-line text-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-[22px] w-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="3.5" width="16" height="17" rx="2" />
                    <path d="M8 8h8M8 12h8M8 16h4" />
                  </svg>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{template.name}</span>
                  <span className="text-muted block text-sm">{template.blurb}</span>
                </span>

                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="text-muted h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m10 6 6 6-6 6" />
                </svg>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => start()}
            className="hover:text-accent mt-5 -ml-1 flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-[15px] font-medium transition-colors"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Start from blank
          </button>
        </Dialog>
      )}
    </>
  );
}
