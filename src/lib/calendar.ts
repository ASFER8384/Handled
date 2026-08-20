/**
 * What the calendar draws, and the arithmetic for laying a month out.
 *
 * Everything here is the workspace's own data: projects, the extra dates they
 * carry, invoices that fall due, and tasks. Nothing is fetched from anywhere,
 * so the calendar works with no account connected to anything.
 */

/**
 * The kinds of thing a day can hold, in the order they are listed.
 *
 * Each carries how it is drawn three times over: the swatch beside its name
 * when its layer is on, the same swatch hollow when it is off, and the bar on
 * the day itself. The swatch is the switch — filled means you are looking at
 * it — and the shapes differ as well as the colours, so the list still reads
 * to someone who cannot tell one colour from another.
 */
export const CALENDAR_LAYERS = [
  {
    key: 'booked',
    label: 'Booked projects',
    swatchOn: 'h-3 w-3 rounded-full bg-blue-600',
    swatchOff: 'h-3 w-3 rounded-full border-2 border-blue-600',
    bar: 'bg-blue-600/15 text-blue-900',
  },
  {
    key: 'meeting',
    label: 'Meetings',
    swatchOn: 'h-3 w-3 rounded-full bg-orange-500',
    swatchOff: 'h-3 w-3 rounded-full border-2 border-orange-500',
    bar: 'bg-orange-500/15 text-orange-900',
    /** Nothing books meetings yet, so the row is listed but cannot be used. */
    comingSoon: 'Waiting on a scheduler',
  },
  {
    key: 'payment',
    label: 'Payments',
    swatchOn: 'h-3.5 w-3.5 rounded-[3px] bg-emerald-500',
    swatchOff: 'h-3.5 w-3.5 rounded-[3px] border-2 border-emerald-500',
    bar: 'bg-emerald-500/15 text-emerald-900',
  },
  {
    key: 'tentative',
    label: 'Tentative projects',
    swatchOn:
      'h-3.5 w-3.5 rounded-[3px] ring-1 ring-inset ring-blue-500/60 bg-[repeating-linear-gradient(45deg,#3b82f6_0_2px,transparent_2px_5px)]',
    swatchOff: 'h-3.5 w-3.5 rounded-[3px] border-2 border-blue-500',
    bar: 'bg-blue-500/[0.08] text-blue-900 ring-1 ring-inset ring-blue-500/30',
  },
  {
    key: 'archived',
    label: 'Archived projects',
    swatchOn: 'h-3.5 w-3.5 rounded-[3px] bg-neutral-400',
    swatchOff: 'h-3.5 w-3.5 rounded-[3px] border-2 border-neutral-400',
    bar: 'bg-black/[0.05] text-muted ring-1 ring-inset ring-black/10',
  },
  {
    key: 'date',
    label: 'Project dates',
    swatchOn: 'h-3 w-3 rounded-full bg-violet-600',
    swatchOff: 'h-3 w-3 rounded-full border-2 border-violet-600',
    bar: 'bg-violet-600/15 text-violet-900',
  },
  {
    key: 'task',
    label: 'Tasks',
    swatchOn: 'h-3.5 w-3.5 rounded-[3px] bg-accent',
    swatchOff: 'h-3.5 w-3.5 rounded-[3px] border-accent border-2',
    bar: 'bg-accent-soft text-accent',
  },
] as const;

export type LayerKey = (typeof CALENDAR_LAYERS)[number]['key'];

/** How much of the month is on screen at once. */
export const CALENDAR_SPANS = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
] as const;

export type SpanKey = (typeof CALENDAR_SPANS)[number]['key'];

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

/** A run of days starting from `start`, described the same way as a month's. */
function run(start: Date, length: number, month: number, today: Date): CalendarDay[] {
  const todayKey = dayKey(today);

  return Array.from({ length }, (_, index) => {
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

/**
 * Six weeks starting on the Sunday on or before the first of the month. Always
 * six, so the grid does not change height as you page through the year.
 */
export function monthGrid(year: number, month: number, today = new Date()): CalendarDay[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return run(start, 42, month, today);
}

/** The seven days of the week that `date` falls in, Sunday first. */
export function weekGrid(date: Date, today = new Date()): CalendarDay[] {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return run(start, 7, date.getMonth(), today);
}

/** Midnight to eleven at night, the rows of the week and day views. */
export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** "12 AM", "1 AM", … — how the hour column reads. */
export function hourLabel(hour: number): string {
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

/**
 * Whether a day shows this event in its all-day strip rather than at an hour.
 *
 * Anything without a time of its own belongs there, and so does every day of a
 * timed run after the first: the thing did not start again at that hour.
 */
export function inAllDayStrip(event: CalendarEvent, key: string): boolean {
  return !event.time || key !== event.from;
}

/** Whether a timed event starts in this hour of this day. */
export function startsAtHour(event: CalendarEvent, key: string, hour: number): boolean {
  return Boolean(event.time) && key === event.from && Number(event.time!.slice(0, 2)) === hour;
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
