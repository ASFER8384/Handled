'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { NewProjectOnDay } from '@/components/create-new';
import { Select } from '@/components/select';
import { Tip } from '@/components/ui';
import {
  CALENDAR_LAYERS,
  CALENDAR_SPANS,
  HOURS,
  MONTHS,
  WEEKDAYS,
  covers,
  dayKey,
  hourLabel,
  inAllDayStrip,
  monthGrid,
  startsAtHour,
  weekGrid,
  type CalendarDay,
  type CalendarEvent,
  type LayerKey,
  type SpanKey,
} from '@/lib/calendar';

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * The calendar, drawn from the workspace's own data. Nothing here is synced
 * with anything: what it shows is the work already in Handled, so it is right
 * the moment a project gets a date and costs nothing to keep that way.
 *
 * It takes the whole screen. A month read at a glance is the entire point of
 * the page, and a grid boxed inside a card with margins around it is a month
 * you have to lean in for.
 */
export function CalendarView({ events, timezone }: { events: CalendarEvent[]; timezone: string }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date());
  const [span, setSpan] = useState<SpanKey>('month');
  const [off, setOff] = useState<LayerKey[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);

  const shown = events.filter((event) => !off.includes(event.layer));

  const days: CalendarDay[] =
    span === 'month'
      ? monthGrid(cursor.getFullYear(), cursor.getMonth(), today)
      : span === 'week'
        ? weekGrid(cursor, today)
        : [
            {
              key: dayKey(cursor),
              day: cursor.getDate(),
              inMonth: true,
              isToday: dayKey(cursor) === dayKey(today),
            },
          ];

  /** One step back or forward means a different thing in each view. */
  function step(by: number) {
    const next = new Date(cursor);
    if (span === 'month') next.setMonth(cursor.getMonth() + by);
    else next.setDate(cursor.getDate() + by * (span === 'week' ? 7 : 1));
    setCursor(next);
    setPicked(null);
  }

  // The heading says exactly as much as the view covers: a month, a run of
  // days, or the one day you are looking at.
  const first = new Date(`${days[0].key}T00:00`);
  const last = new Date(`${days[days.length - 1].key}T00:00`);
  const short = (date: Date) => MONTHS[date.getMonth()].slice(0, 3);

  const title =
    span === 'month'
      ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : span === 'day'
        ? `${MONTHS[first.getMonth()]} ${first.getDate()}, ${first.getFullYear()}`
        : `${short(first)} ${first.getDate()} – ${
            first.getMonth() === last.getMonth() ? '' : `${short(last)} `
          }${last.getDate()}, ${last.getFullYear()}`;

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
    // The page's own padding is taken back so the grid runs to the edges, and
    // the height is the screen less the bar above it. The negative margins put
    // the padding back into play, so this fills the window without pushing it.
    <div className="-mx-8 -my-8 flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* --- Today, where you are, the zone, and how much to show ------- */}
      <div className="border-line flex flex-wrap items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex items-center gap-4">
          {!listOpen && <FoldList open={listOpen} onToggle={() => setListOpen(true)} />}

          <button
            type="button"
            onClick={() => {
              setCursor(new Date());
              setPicked(null);
            }}
            className="border-line hover:border-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Today
          </button>

          <span className="flex items-center gap-2">
            <Step label="Previous" onClick={() => step(-1)}>
              <path d="M14 6l-6 6 6 6" />
            </Step>
            <h1 className="min-w-[230px] text-center text-xl font-semibold tracking-tight">
              {title}
            </h1>
            <Step label="Next" onClick={() => step(1)}>
              <path d="M10 6l6 6-6 6" />
            </Step>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Floating: this sits at the right-hand edge, and a tooltip drawn
              beside it is part of the page's width even while invisible, which
              is enough to push the whole page sideways. */}
          <Tip label="Times shown in this zone" floating>
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

          <Select
            ariaLabel="How much to show"
            className="w-[128px]"
            value={span}
            options={CALENDAR_SPANS.map((entry) => ({ value: entry.key, label: entry.label }))}
            onChange={(value) => {
              setSpan(value as SpanKey);
              setPicked(null);
            }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* --- what is drawn ------------------------------------------- */}
        <aside hidden={!listOpen} className="w-[214px] shrink-0 overflow-y-auto px-5 py-5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConnectOpen((open) => !open)}
              className="text-accent text-[15px] font-medium hover:underline"
            >
              Connect calendar
            </button>
            <FoldList open={listOpen} onToggle={() => setListOpen(false)} />
          </div>
          {connectOpen && (
            <p className="text-muted mt-2 text-xs leading-relaxed">
              Nothing to connect yet. This month is drawn from your own projects, dates, invoices
              and tasks — outside calendars come later.
            </p>
          )}

          <h2 className="mt-6 text-[15px] font-semibold">Handled</h2>
          <ul className="mt-3 space-y-0.5">
            {CALENDAR_LAYERS.map((layer) => {
              const soon = 'comingSoon' in layer ? layer.comingSoon : null;
              const on = !off.includes(layer.key) && !soon;
              const count = events.filter((event) => event.layer === layer.key).length;

              // The swatch is the switch: filled is on, hollow is off. One
              // mark rather than a box beside a mark, which is the same
              // answer twice.
              const row = (
                <label
                  className={`-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                    soon ? 'cursor-default opacity-45' : 'hover:bg-accent-soft/40 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={Boolean(soon)}
                    onChange={() =>
                      setOff((current) =>
                        on ? [...current, layer.key] : current.filter((key) => key !== layer.key),
                      )
                    }
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`shrink-0 ${on || soon ? layer.swatchOn : layer.swatchOff}`}
                  />
                  {layer.label}
                  {!soon && count > 0 && (
                    <span className="text-muted ml-auto text-xs tabular-nums">{count}</span>
                  )}
                </label>
              );

              return (
                <li key={layer.key}>
                  {soon ? (
                    <Tip label={soon} floating>
                      {row}
                    </Tip>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>

          <p className="text-muted mt-6 text-xs leading-relaxed">
            Everything here is your own work. Nothing is synced with an outside calendar yet.
          </p>
        </aside>

        {/* --- the month, or the hours of a week or a day -------------- */}
        {/* The sidebar stays put and the grid scrolls inside its own pane —
            sideways when seven columns will not fit, and down when the weeks
            will not. A week squeezed to fit the window is a week with its
            evening cut off, which is worse than scrolling for it. The hour
            views bring their own vertical scroller, so only the month asks
            this pane for one. */}
        <div
          className={`border-line min-h-0 min-w-0 flex-1 border-l ${
            span === 'month' ? 'overflow-auto' : 'overflow-x-auto overflow-y-hidden'
          }`}
        >
          {span === 'month' ? (
            <div className="flex min-h-full min-w-[1040px] flex-col">
              <div className="border-line bg-surface text-muted sticky top-0 z-20 grid grid-cols-7 border-b text-sm">
                {WEEKDAYS.map((name) => (
                  <span key={name} className="px-3 py-2.5 text-center font-medium">
                    {name}
                  </span>
                ))}
              </div>

              <div className="grid flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(140px,1fr))]">
                {days.map((day, index) => (
                  <MonthCell
                    key={day.key}
                    day={day}
                    index={index}
                    events={shown.filter((event) => covers(event, day.key))}
                    picked={picked === day.key}
                    onPick={() => setPicked(picked === day.key ? null : day.key)}
                    onCreate={() => {
                      setCreating(day.key);
                      setPicked(null);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <TimeGrid days={days} events={shown} onCreate={(key) => setCreating(key)} />
          )}
        </div>
      </div>

      {creating && <NewProjectOnDay startDate={creating} onClose={() => setCreating(null)} />}
    </div>
  );
}

/**
 * The week and the day: an all-day strip over a column of hours.
 *
 * Anything without a time of its own sits in the strip rather than being
 * dropped at midnight, which is where a whole-day project would otherwise
 * appear and where nobody would look for it.
 */
function TimeGrid({
  days,
  events,
  onCreate,
}: {
  days: CalendarDay[];
  events: CalendarEvent[];
  onCreate: (key: string) => void;
}) {
  const hours = useRef<HTMLDivElement>(null);

  // Opens on the working day rather than at midnight, so the first thing on
  // screen is the part of the day anything actually happens in.
  useEffect(() => {
    if (hours.current) hours.current.scrollTop = 8 * 64;
  }, []);

  // Written out rather than built: Tailwind only ships classes it can see.
  const columns =
    days.length === 1
      ? 'grid-cols-[68px_minmax(0,1fr)]'
      : 'grid-cols-[68px_repeat(7,minmax(0,1fr))]';

  return (
    <div
      className={`flex h-full flex-col ${days.length === 1 ? 'min-w-[560px]' : 'min-w-[1040px]'}`}
    >
      {/* the days themselves */}
      <div className={`border-line grid border-b ${columns}`}>
        <span />
        {days.map((day) => (
          <span
            key={day.key}
            className={`px-3 py-2.5 text-center text-sm font-medium ${
              day.isToday ? 'text-accent' : 'text-muted'
            }`}
          >
            {days.length === 1
              ? `${WEEKDAY_NAMES[new Date(`${day.key}T00:00`).getDay()]} ${day.day}`
              : `${WEEKDAYS[new Date(`${day.key}T00:00`).getDay()]} ${day.day}`}
          </span>
        ))}
      </div>

      {/* all day */}
      <div className={`border-line grid border-b ${columns}`}>
        <span className="text-muted border-line border-r px-3 py-2 text-right text-xs">
          All day
        </span>
        {days.map((day) => (
          <div
            key={day.key}
            className="border-line min-h-[38px] space-y-1 border-r p-1 last:border-r-0"
          >
            {events
              .filter((event) => covers(event, day.key) && inAllDayStrip(event, day.key))
              .map((event) => (
                <Bar key={event.id} event={event} />
              ))}
          </div>
        ))}
      </div>

      {/* the hours */}
      <div ref={hours} className="min-h-0 flex-1 overflow-y-auto">
        <div className={`grid ${columns}`}>
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <span className="border-line text-muted h-16 border-r border-b px-3 pt-1 text-right text-xs">
                {hourLabel(hour)}
              </span>
              {days.map((day) => {
                const inHour = events.filter((event) => startsAtHour(event, day.key, hour));

                return (
                  <div
                    key={`${day.key}-${hour}`}
                    className="border-line h-16 space-y-1 border-r border-b p-1 last:border-r-0"
                  >
                    {inHour.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => onCreate(day.key)}
                        aria-label={`Start a project on ${day.key}`}
                        className="hover:bg-accent-soft/40 h-full w-full cursor-pointer rounded transition-colors"
                      />
                    ) : (
                      inHour.map((event) => <Bar key={event.id} event={event} />)
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One thing on one day, drawn the same in every view. */
function Bar({ event }: { event: CalendarEvent }) {
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

  return event.href ? (
    <Link href={event.href} className="block hover:brightness-95">
      {body}
    </Link>
  ) : (
    body
  );
}

/** One day of the month: the first few things on it, and a count of the rest. */
function MonthCell({
  day,
  index,
  events,
  picked,
  onPick,
  onCreate,
}: {
  day: CalendarDay;
  index: number;
  events: CalendarEvent[];
  picked: boolean;
  onPick: () => void;
  onCreate: () => void;
}) {
  return (
    <div
      data-day-menu
      className={`border-line relative min-h-0 overflow-hidden p-1.5 ${
        index % 7 === 6 ? '' : 'border-r'
      } ${index < 35 ? 'border-b' : ''} ${day.inMonth ? '' : 'bg-black/[0.015]'}`}
    >
      <button
        type="button"
        onClick={onPick}
        aria-label={`Add something on ${day.key}`}
        className="absolute inset-0 h-full w-full cursor-pointer"
      />

      <span
        className={`relative flex h-7 w-7 items-center justify-center rounded-full text-sm ${
          day.isToday ? 'bg-brand-ink font-semibold text-white' : day.inMonth ? '' : 'text-muted'
        }`}
      >
        {day.day}
      </span>

      <ul className="relative mt-1 space-y-1">
        {events.slice(0, 3).map((event) => (
          <li key={event.id}>
            <Bar event={event} />
          </li>
        ))}

        {events.length > 3 && (
          <li className="text-muted px-1.5 text-xs">+{events.length - 3} more</li>
        )}
      </ul>

      {picked && (
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
            onClick={onCreate}
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
}

/** Folds the list away, handing its width to the grid, and brings it back. */
function FoldList({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const label = open ? 'Hide list' : 'Show list';

  // Floating: sitting at the top of a pane, a tooltip drawn in place is cut
  // off by the row above it.
  return (
    <Tip label={label} floating>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={open}
        aria-label={label}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          open ? 'text-muted hover:bg-accent-soft/60' : 'bg-accent-soft/70 text-accent'
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        >
          <rect x="3" y="4.5" width="18" height="15" rx="2" />
          <path d="M9.5 4.5v15" />
        </svg>
      </button>
    </Tip>
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

/** The day the calendar opens on. */
export const todayKey = () => dayKey(new Date());
