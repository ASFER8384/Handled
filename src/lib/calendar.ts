/**
 * What the calendar draws, and the arithmetic for laying a month out.
 *
 * Everything here is the workspace's own data: projects, the extra dates they
 * carry, and tasks. Nothing is fetched from anywhere, so the calendar works
 * with no account connected to anything.
 */

/** The kinds of thing a day can hold, in the order they stack on it. */
export const CALENDAR_LAYERS = [
  {
    key: 'booked',
    label: 'Booked projects',
    /** The dot beside its name, and the bar on the day. */
    dot: 'bg-brand-sage',
    bar: 'bg-brand-sage/45 text-brand-ink',
  },
  {
    key: 'tentative',
    label: 'Tentative projects',
    dot: 'bg-brand-sky',
    bar: 'bg-brand-sky/40 text-brand-ink',
  },
  {
    key: 'date',
    label: 'Project dates',
    dot: 'bg-brand-clay',
    bar: 'bg-brand-clay/50 text-brand-ink',
  },
  { key: 'task', label: 'Tasks', dot: 'bg-accent', bar: 'bg-accent-soft text-accent' },
] as const;

export type LayerKey = (typeof CALENDAR_LAYERS)[number]['key'];

export type CalendarEvent = {
  id: string;
  layer: LayerKey;
  title: string;
  /** Local YYYY-MM-DD. The day it starts on. */
  from: string;
  /** Local YYYY-MM-DD, the last day it covers. Same as `from` for one day. */
  to: string;
  /** Shown after the title where there is a time to show. */
  time: string | null;
  /** Where clicking it goes, when there is somewhere to go. */
  href: string | null;
  /** Ticked-off tasks are drawn struck through rather than hidden. */
  done?: boolean;
};

/** A day in the grid, and everything known about it. */
export type CalendarDay = {
  /** Local YYYY-MM-DD. */
  key: string;
  day: number;
  /** False for the days either side that fill the first and last rows. */
  inMonth: boolean;
  isToday: boolean;
};

/** The local YYYY-MM-DD for a date, which is not what toISOString gives. */
export function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

/**
 * Six weeks starting on the Sunday on or before the first of the month. Always
 * six, so the grid does not change height as you page through the year.
 */
export function monthGrid(year: number, month: number, today = new Date()): CalendarDay[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());

  const todayKey = dayKey(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: dayKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: dayKey(date) === todayKey,
    };
  });
}

/** Whether an event covers a given day, inclusive at both ends. */
export function covers(event: CalendarEvent, key: string): boolean {
  return key >= event.from && key <= event.to;
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
