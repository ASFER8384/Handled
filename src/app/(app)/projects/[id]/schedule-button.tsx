'use client';

import { useState } from 'react';
import { EventDialog, blankEvent } from '../../calendar/event-dialog';

/**
 * Booking something in from the project it is about.
 *
 * The calendar is where you look at the week; this is where the week gets
 * written, because a call about a wedding is arranged while you are reading
 * the wedding. It opens on today with the project and the client already
 * filled in — the two things you would otherwise have to say again.
 */
export function ScheduleButton({
  project,
  people,
}: {
  project: { id: string; name: string };
  /** The client and anyone else on the project, to say who it is with. */
  people: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString('en-CA');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:text-accent flex items-center gap-2 font-medium transition-colors"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17M12 14v4M10 16h4" />
        </svg>
        Schedule
      </button>

      {open && (
        <EventDialog
          draft={{
            ...blankEvent(today),
            projectId: project.id,
            clientId: people[0]?.id ?? '',
          }}
          projects={[project]}
          clients={people}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
