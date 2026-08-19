'use client';

/** What a card shows under its title. Views store the ones they leave off. */
export const CARD_PROPERTIES = [
  { key: 'serviceDate', label: 'Service date' },
  { key: 'leadSource', label: 'Lead source' },
  { key: 'type', label: 'Project type' },
  { key: 'contact', label: 'Contacts' },
  { key: 'value', label: 'Value' },
] as const;

/** The same idea for the table: Name is the row's handle, so it never hides. */
export const TABLE_COLUMNS = [
  { key: 'contact', label: 'Contacts' },
  { key: 'type', label: 'Type' },
  { key: 'date', label: 'Date' },
  { key: 'location', label: 'Location' },
  { key: 'description', label: 'Description' },
] as const;

export type CardProperty = (typeof CARD_PROPERTIES)[number]['key'];
export type TableColumnKey = (typeof TABLE_COLUMNS)[number]['key'];

export type ViewPrefs = {
  id: string;
  layout: 'BOARD' | 'LIST';
  showGroups: boolean;
  hiddenProps: string[];
};
