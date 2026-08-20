import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { DEFAULT_COLOUR, DEFAULT_FONT, type ColourKey, type FontKey } from '@/lib/invoice-theme';
import { CompanyForm } from './company-form';

/**
 * What the Company tab is made of, in the order a business fills it in.
 *
 * Only the brand is built. The rest are listed with what they will hold, and
 * get written one at a time — a section that is named and empty is honest; one
 * that is missing sends you looking for it.
 */
const SECTIONS = [
  { key: 'brand', label: 'Company brand', body: null },
  {
    key: 'preferences',
    label: 'Preferences',
    body: 'How dates, numbers and the working week read across Handled.',
  },
  {
    key: 'portal',
    label: 'Client portal',
    body: 'One address where a client finds everything you have sent them.',
  },
  {
    key: 'integrations',
    label: 'Integrations',
    body: 'Calendars, mail and anything else worth not typing twice.',
  },
  { key: 'team', label: 'Team', body: 'Who else is in this workspace, and what they may do.' },
  { key: 'bank', label: 'Bank details', body: 'Where the money lands, printed on what you send.' },
  {
    key: 'payments',
    label: 'Client payment methods',
    body: 'How a client is allowed to pay: transfer, card, cash.',
  },
];

export default async function CompanySettingsPage(props: PageProps<'/settings/company'>) {
  const ctx = await requireWorkspace();
  const params = await props.searchParams;
  const asked = typeof params.section === 'string' ? params.section : 'brand';
  const section = SECTIONS.find((entry) => entry.key === asked) ?? SECTIONS[0];

  const workspace = await prisma.workspace.findUnique({
    where: { id: ctx.workspaceId },
    select: {
      name: true,
      trade: true,
      email: true,
      phone: true,
      website: true,
      address: true,
      currency: true,
      themeColor: true,
      themeFont: true,
    },
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav className="space-y-0.5">
        {SECTIONS.map((entry) => (
          <Link
            key={entry.key}
            href={`/settings/company?section=${entry.key}`}
            aria-current={entry.key === section.key ? 'page' : undefined}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              entry.key === section.key
                ? 'bg-accent-soft/60 font-medium'
                : 'text-muted hover:bg-accent-soft/30'
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <div className="min-w-0">
        {section.key === 'brand' ? (
          <CompanyForm
            company={{
              name: workspace?.name ?? ctx.workspaceName,
              trade: workspace?.trade ?? '',
              email: workspace?.email ?? '',
              phone: workspace?.phone ?? '',
              website: workspace?.website ?? '',
              address: workspace?.address ?? '',
              currency: workspace?.currency ?? ctx.currency,
            }}
            themeColor={(workspace?.themeColor as ColourKey) ?? DEFAULT_COLOUR}
            themeFont={(workspace?.themeFont as FontKey) ?? DEFAULT_FONT}
          />
        ) : (
          <div className="border-line rounded-xl border border-dashed p-8">
            <h2 className="font-medium">{section.label}</h2>
            <p className="text-muted mt-1.5 text-sm">{section.body}</p>
            <p className="text-muted mt-4 text-xs">Not built yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
