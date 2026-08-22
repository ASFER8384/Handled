/**
 * A date as it was typed, not as UTC would like it.
 *
 * '2026-08-01' is parsed by JavaScript as midnight UTC, which in Dubai is four
 * in the morning on the same day — so a project dated the first showed up on
 * the calendar as "04:00", a time nobody entered. A day with no time means
 * that day where the person typing it lives, so it is read as local midnight.
 * Anything carrying a time is left exactly as it came.
 */
export function readWhen(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? `${value.trim()}T00:00` : value);
}
