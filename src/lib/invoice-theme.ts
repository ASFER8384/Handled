/**
 * How an invoice looks when it lands: a colour and a typeface, kept with the
 * invoice itself so the one you send stays the one they see.
 *
 * Two choices, not a design tool. An invoice has to be read and paid, and
 * every extra knob is another way to make it harder to read.
 */
export const INVOICE_COLOURS = [
  { key: 'clay', label: 'Clay', hex: '#c25a3a' },
  { key: 'ink', label: 'Ink', hex: '#17110e' },
  { key: 'sea', label: 'Sea', hex: '#1f6f8b' },
  { key: 'moss', label: 'Moss', hex: '#4a6b47' },
  { key: 'plum', label: 'Plum', hex: '#6b4a6b' },
] as const;

export const INVOICE_FONTS = [
  {
    key: 'sans',
    label: 'Sans',
    stack: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  },
  { key: 'serif', label: 'Serif', stack: 'Georgia, "Times New Roman", serif' },
  {
    key: 'mono',
    label: 'Mono',
    stack: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", monospace',
  },
] as const;

export type ColourKey = (typeof INVOICE_COLOURS)[number]['key'];
export type FontKey = (typeof INVOICE_FONTS)[number]['key'];

export const DEFAULT_COLOUR: ColourKey = 'ink';
export const DEFAULT_FONT: FontKey = 'sans';

/** The colour and typeface a sheet paints with, whatever was stored. */
export function invoiceTheme(colour: string | null, font: string | null) {
  const chosen = INVOICE_COLOURS.find((entry) => entry.key === colour) ?? INVOICE_COLOURS[1];
  const face = INVOICE_FONTS.find((entry) => entry.key === font) ?? INVOICE_FONTS[0];
  return { hex: chosen.hex, stack: face.stack };
}
