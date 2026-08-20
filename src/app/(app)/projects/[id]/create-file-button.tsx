'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/dialog';
import { Tip } from '@/components/ui';

/**
 * Making an invoice for a project starts with how you want to start it.
 *
 * Straight to a blank form is the fastest way to retype something you have
 * already written once. Asking first costs one click and saves that, so the
 * ways of not starting from nothing are the ones with the weight here and
 * blank is the quiet line underneath.
 */
export function CreateFileButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-5 py-2.5">
        Create file
      </button>

      {open && (
        <Dialog title="Create a new invoice" onClose={() => setOpen(false)} width={560} fit>
          <p className="text-[17px]">How would you like to start?</p>

          <div className="mt-5 space-y-3">
            <Choice
              title="Use a template"
              body="Use one of your templates to start your file."
              soon
              icon={
                <>
                  <rect x="3.5" y="4" width="17" height="16" rx="2" />
                  <path d="M7 8.5h6M7 12h10M7 15.5h10" />
                </>
              }
            />

            <Choice
              title="Start from a recent file"
              body="Use one of the files you recently sent as a starting point."
              soon
              icon={
                <>
                  <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
                  <path d="M3.5 4.5V10h5.5" />
                  <path d="M12 8v4.5l3 1.8" />
                </>
              }
            />
          </div>

          <button
            type="button"
            onClick={() => router.push(`/invoices/new?project=${projectId}`)}
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

/** One way to start, as a row you press. */
function Choice({
  title,
  body,
  icon,
  soon,
  onClick,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  /** Listed, but there is nothing behind it yet. */
  soon?: boolean;
  onClick?: () => void;
}) {
  const row = (
    <button
      type="button"
      disabled={soon}
      onClick={onClick}
      className={`border-line flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors ${
        soon ? 'cursor-default opacity-45' : 'hover:border-accent hover:bg-accent-soft/30'
      }`}
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
          {icon}
        </svg>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="text-muted block text-sm">{body}</span>
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
  );

  return soon ? (
    <Tip label="Not built yet" floating className="w-full">
      {row}
    </Tip>
  ) : (
    row
  );
}
