'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NewProjectOnDay } from '@/components/create-new';
import { Tip } from '@/components/ui';
import {
  CALENDAR_LAYERS,
  MONTHS,
  WEEKDAYS,
  covers,
  dayKey,
  monthGrid,
  type CalendarEvent,
  type LayerKey,
} from '@/lib/calendar';

/**
 * The month, drawn from the workspace's own data. Nothing here is synced with
 * anything: what it shows is the work already in Handled, so it is right the
 * moment a project gets a date and costs nothing to keep that way.
 */
export function CalendarView({ events, timezone }: { events: CalendarEvent[]; timezone: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [off, setOff] = useState<LayerKey[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const days = monthGrid(year, month, today);
  const shown = events.filter((event) => !off.includes(event.layer));

  function step(by: number) {
    const date = new Date(year, month + by, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setPicked(null);
  }

  function toToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setPicked(null);
  }

  // A day's little menu closes on a click anywhere else.
  useEffect(() => {
    if (!picked) return;
    function away(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-day-menu]')) setPicked(null);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [picked]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toToday}
            className="border-line hover:border-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Today
          </button>

          <span className="flex items-center gap-2">
            <Step label="Previous month" onClick={() => step(-1)}>
              <path d="M14 6l-6 6 6 6" />
            </Step>
            <h1 className="min-w-[190px] text-center text-xl font-semibold tracking-tight">
              {MONTHS[month]} {year}
            </h1>
            <Step label="Next month" onClick={() => step(1)}>
              <path d="M10 6l6 6-6 6" />
            </Step>
          </span>
        </div>

        {/* Floating: this sits at the right-hand edge, and a tooltip drawn
            beside it is part of the page's width even while invisible, which
            is enough to push the whole page sideways. */}
        <Tip label="Every time on this page is read in this zone" floating>
          <span className="text-muted flex items-center gap-2 text-sm">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
            </svg>
            {timezone}
          </span>
        </Tip>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[190px_1fr]">
        {/* --- what is drawn ------------------------------------------- */}
        <aside>
          <h2 className="text-muted text-xs font-semibold tracking-widest uppercase">Showing</h2>
          <ul className="mt-3 space-y-1">
            {CALENDAR_LAYERS.map((layer) => {
              const on = !off.includes(layer.key);
              const count = events.filter((event) => event.layer === layer.key).length;

              return (
                <li key={layer.key}>
                  <label className="hover:bg-accent-soft/40 flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setOff((current) =>
                          on ? [...current, layer.key] : current.filter((key) => key !== layer.key),
                        )
                      }
                      className="accent-brand-ink h-4 w-4"
                    />
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${layer.dot} ${on ? '' : 'opacity-30'}`}
                    />
                    <span className={on ? '' : 'text-muted'}>{layer.label}</span>
                    <span className="text-muted ml-auto text-xs tabular-nums">{count}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="text-muted mt-6 px-2 text-xs leading-relaxed">
            Everything here is your own work. Nothing is synced with an outside calendar yet.
          </p>
        </aside>

        {/* --- the month ----------------------------------------------- */}
        <div className="card min-w-0 overflow-hidden">
          <div className="border-line text-muted grid grid-cols-7 border-b text-sm">
            {WEEKDAYS.map((name) => (
              <span key={name} className="px-3 py-2.5 text-center font-medium">
                {name}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const onDay = shown.filter((event) => covers(event, day.key));

              return (
                <div
                  key={day.key}
                  data-day-menu
                  className={`border-line relative min-h-[112px] overflow-hidden border-r border-b p-1.5 ${
                    index % 7 === 6 ? 'border-r-0' : ''
                  } ${index >= 35 ? 'border-b-0' : ''} ${day.inMonth ? '' : 'bg-black/[0.015]'}`}
                >
                  <button
                    type="button"
                    onClick={() => setPicked(picked === day.key ? null : day.key)}
                    aria-label={`Add something on ${day.key}`}
                    className="absolute inset-0 h-full w-full cursor-pointer"
                  />

                  <span
                    className={`relative flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      day.isToday
                        ? 'bg-brand-ink font-semibold text-white'
                        : day.inMonth
                          ? ''
                          : 'text-muted'
                    }`}
                  >
                    {day.day}
                  </span>

                  <ul className="relative mt-1 space-y-1">
                    {onDay.slice(0, 3).map((event) => {
                      const layer = CALENDAR_LAYERS.find((entry) => entry.key === event.layer)!;
                      const body = (
                        <span
                          className={`block truncate rounded px-1.5 py-0.5 text-xs ${layer.bar} ${
                            event.done ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {event.time && <span className="mr-1 tabular-nums">{event.time}</span>}
                          {event.title}
                        </span>
                      );

                      return (
                        <li key={event.id}>
                          {event.href ? (
                            <Link href={event.href} className="block hover:brightness-95">
                              {body}
                            </Link>
                          ) : (
                            body
                          )}
                        </li>
                      );
                    })}

                    {onDay.length > 3 && (
                      <li className="text-muted px-1.5 text-xs">+{onDay.length - 3} more</li>
                    )}
                  </ul>

                  {picked === day.key && (
                    <div className="bg-surface absolute top-9 left-2 z-30 w-[210px] rounded-xl py-1.5 shadow-2xl ring-1 ring-black/10">
                      <p className="border-line mb-1 border-b px-3.5 pb-2 text-sm font-medium">
                        {new Date(`${day.key}T00:00`).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCreating(day.key);
                          setPicked(null);
                        }}
                        className="hover:bg-accent-soft/60 flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors"
                      >
                        <svg
                          aria-hidden
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 7.5h18v12H3zM8 7.5V5.5h8v2" />
                        </svg>
                        Create a project
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {creating && <NewProjectOnDay startDate={creating} onClose={() => setCreating(null)} />}
    </div>
  );
}

function Step({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-muted hover:text-foreground hover:bg-accent-soft/60 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

/** Kept for the day view, once there is one. */
export const todayKey = () => dayKey(new Date());
