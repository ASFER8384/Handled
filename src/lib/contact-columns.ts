/**
 * What the Contacts table can show, in the order it shows it. These are the
 * fields a contact dialog asks for, and nothing invented beyond them.
 *
 * Only the ones marked `onByDefault` start out visible: who someone is, the
 * work they are on, and how to reach them. The rest are a tick away in table
 * preferences, so the table stays narrow until someone asks for more.
 *
 * `sortable` is false where ordering would be meaningless — a contact can be
 * on several projects or carry several tags, so there is no one value to sort
 * a row by.
 */
export const CONTACT_COLUMNS = [
  { key: 'projects', label: 'Projects', onByDefault: true, sortable: false },
  { key: 'jobTitle', label: 'Job title', onByDefault: false, sortable: true },
  { key: 'email', label: 'Email', onByDefault: true, sortable: true },
  { key: 'phone', label: 'Phone', onByDefault: true, sortable: true },
  { key: 'website', label: 'Website', onByDefault: false, sortable: true },
  { key: 'address', label: 'Mailing address', onByDefault: false, sortable: true },
  { key: 'lastInteraction', label: 'Last interaction', onByDefault: true, sortable: true },
  { key: 'tags', label: 'Tags', onByDefault: false, sortable: false },
] as const;

export type ContactColumn = (typeof CONTACT_COLUMNS)[number]['key'];

/**
 * What a workspace starts with switched off. Visibility is stored as the list
 * of columns hidden, so anything that starts off has to be named here — and
 * where a workspace is made, or it would come back on.
 */
export const DEFAULT_HIDDEN_CONTACT_COLUMNS: string[] = CONTACT_COLUMNS.filter(
  (column) => !column.onByDefault,
).map((column) => column.key);

/** How the table is ordered. Name is the fallback, so a list is never arbitrary. */
export type ContactSort = { field: string | null; dir: 'asc' | 'desc' };
