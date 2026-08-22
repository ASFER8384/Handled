import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { DEFAULT_COLOUR, DEFAULT_FONT, type ColourKey, type FontKey } from '@/lib/invoice-theme';
import type { Socials } from '@/lib/company-fields';
import { LEAD_SOURCES, PROJECT_TYPES, listOrDefault } from '@/lib/stages';
import { CompanyForm } from './company-form';
import { BankForm } from './bank-form';
import { ListEditor } from './list-editor';

/**
 * What the Company tab is made of, in the order a business fills it in.
 *
 * Two, both of them real. The rest of what a page like this usually carries —
 * teams, integrations, a client portal — is not listed, because none of it
 * exists to configure and a menu of dead ends is worse than a short menu.
 */
const SECTIONS = [
  { key: 'brand', label: 'Company brand' },
  { key: 'bank', label: 'Bank details & tax' },
  { key: 'lists', label: 'Types & sources' },
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
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankIban: true,
      bankSwift: true,
      bankNotes: true,
      taxLabel: true,
      taxNumber: true,
      taxRateBp: true,
      themeColor: true,
      themeFont: true,
      phoneCode: true,
      street: true,
      city: true,
      postcode: true,
      region: true,
      country: true,
      timezone: true,
      oneLiner: true,
      about: true,
      socials: true,
      brandColor: true,
      logoKey: true,
      logoAltKey: true,
      projectTypes: true,
      leadSources: true,
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
              phoneCode: workspace?.phoneCode ?? '',
              phone: workspace?.phone ?? '',
              website: workspace?.website ?? '',
              oneLiner: workspace?.oneLiner ?? '',
              about: workspace?.about ?? '',
              street: workspace?.street ?? '',
              city: workspace?.city ?? '',
              postcode: workspace?.postcode ?? '',
              region: workspace?.region ?? '',
              country: workspace?.country ?? '',
              timezone: workspace?.timezone ?? '',
              currency: workspace?.currency ?? ctx.currency,
            }}
            socials={(workspace?.socials as Socials) ?? {}}
            brandColor={workspace?.brandColor ?? '#c25a3a'}
            hasLogo={Boolean(workspace?.logoKey)}
            hasAltLogo={Boolean(workspace?.logoAltKey)}
            themeColor={(workspace?.themeColor as ColourKey) ?? DEFAULT_COLOUR}
            themeFont={(workspace?.themeFont as FontKey) ?? DEFAULT_FONT}
          />
        ) : section.key === 'lists' ? (
          <div className="space-y-6">
            <section className="card p-6">
              <ListEditor
                label="Project types"
                hint="The kinds of work you do. They fill the Project type dropdown when a project is created."
                field="projectTypes"
                initial={listOrDefault(workspace?.projectTypes ?? [], PROJECT_TYPES)}
                placeholder="Elopement, Corporate retreat…"
              />
            </section>

            <section className="card p-6">
              <ListEditor
                label="Lead sources"
                hint="Where work comes from. Worth keeping short: it is only useful if you can tell at a glance which one earns its keep."
                field="leadSources"
                initial={listOrDefault(workspace?.leadSources ?? [], LEAD_SOURCES)}
                placeholder="Wedding fair, Old client…"
              />
            </section>
          </div>
        ) : (
          <BankForm
            currency={workspace?.currency ?? ctx.currency}
            values={{
              bankName: workspace?.bankName ?? '',
              bankAccountName: workspace?.bankAccountName ?? '',
              bankAccountNumber: workspace?.bankAccountNumber ?? '',
              bankIban: workspace?.bankIban ?? '',
              bankSwift: workspace?.bankSwift ?? '',
              bankNotes: workspace?.bankNotes ?? '',
              taxLabel: workspace?.taxLabel ?? 'VAT',
              taxNumber: workspace?.taxNumber ?? '',
              taxRate: workspace?.taxRateBp ? String(workspace.taxRateBp / 100) : '',
            }}
          />
        )}
      </div>
    </div>
  );
}
