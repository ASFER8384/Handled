/**
 * What a project shows beside its name — on a card, and as a table column.
 * These are the fields the project dialog asks for, and nothing invented
 * beyond them. Only the few marked `onByDefault` start out visible; the rest
 * are there to be ticked on when a workspace wants them, so a card stays
 * readable and a table stays narrow until someone asks for more.
 *
 * One list for both layouts: a view is a lens on the same work, so what it
 * shows should not depend on whether you are looking at it as cards or rows.
 */
export const PROJECT_PROPERTIES = [
  { key: 'serviceDate', label: 'Service date', onByDefault: true },
  { key: 'endDate', label: 'End date', onByDefault: false },
  { key: 'type', label: 'Project type', onByDefault: true },
  { key: 'contact', label: 'Contacts', onByDefault: true },
  { key: 'leadSource', label: 'Lead source', onByDefault: false },
  { key: 'location', label: 'Location', onByDefault: false },
  { key: 'description', label: 'Description', onByDefault: false },
] as const;

/**
 * What a brand new view leaves off. Visibility is stored as the list of keys
 * a view hides, so a property that starts off has to be named here — and at
 * every place a view is made, or it would come back on.
 */
export const DEFAULT_HIDDEN_PROPS: string[] = PROJECT_PROPERTIES.filter(
  (property) => !property.onByDefault,
).map((property) => property.key);

export type ProjectProperty = (typeof PROJECT_PROPERTIES)[number]['key'];

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
