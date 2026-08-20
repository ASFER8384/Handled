/**
 * What a card can show under its title: the fields the project dialog asks
 * for, and nothing invented beyond them. Only the few marked `onByDefault`
 * start out on a card — the rest are there to be ticked on when a workspace
 * wants them, so a card stays readable until someone asks for more.
 */
export const CARD_PROPERTIES = [
  { key: 'serviceDate', label: 'Service date', onByDefault: true },
  { key: 'endDate', label: 'End date', onByDefault: false },
  { key: 'type', label: 'Project type', onByDefault: true },
  { key: 'contact', label: 'Contacts', onByDefault: true },
  { key: 'leadSource', label: 'Lead source', onByDefault: false },
  { key: 'location', label: 'Location', onByDefault: false },
  { key: 'description', label: 'Description', onByDefault: false },
] as const;

/** The same idea for the table: Name is the row's handle, so it never hides. */
export const TABLE_COLUMNS = [
  { key: 'contact', label: 'Contacts' },
  { key: 'type', label: 'Type' },
  { key: 'date', label: 'Date' },
  { key: 'location', label: 'Location' },
  { key: 'description', label: 'Description' },
] as const;

/**
 * What a brand new view leaves off. Visibility is stored as the list of keys
 * a view hides, so a property that starts off has to be named here — and at
 * every place a view is made, or it would come back on.
 */
export const DEFAULT_HIDDEN_PROPS: string[] = CARD_PROPERTIES.filter(
  (property) => !property.onByDefault,
).map((property) => property.key);

export type CardProperty = (typeof CARD_PROPERTIES)[number]['key'];
export type TableColumnKey = (typeof TABLE_COLUMNS)[number]['key'];

export type ViewPrefs = {
  id: string;
  layout: 'BOARD' | 'LIST';
  showGroups: boolean;
  hiddenProps: string[];
  /** Sort and filters belong to the view, so every tab is its own lens. */
  sortField: string | null;
  sortDir: 'asc' | 'desc';
  filters: ViewFilter[];
};

/** One narrowing rule. A view's filters all have to match. */
export type ViewFilter = { field: string; value: string };
