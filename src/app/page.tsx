import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { MarketingHeader } from '@/components/marketing/header';
import { HeroTabs } from '@/components/marketing/hero-tabs';
import { FeatureSection } from '@/components/marketing/feature-section';

const NUMBERS = [
  { value: 'One', label: 'Pipeline, from first enquiry to final payment' },
  { value: 'Zero', label: 'Spreadsheets needed to know where you stand' },
  { value: 'Auto', label: 'Invoice status, derived from real payments' },
  { value: 'AED', label: 'Multi-currency totals in exact minor units' },
];

export default async function LandingPage() {
  if (await getSession()) redirect('/dashboard');

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-brand-ink">
      <MarketingHeader />

      {/* ---- Hero ---------------------------------------------------- */}
      <section className="relative overflow-hidden bg-brand-yellow">
        {/* Tilted photo cards bleeding off each edge, as on the real site. */}
        <div
          aria-hidden
          className="absolute top-40 -left-24 hidden h-56 w-64 -rotate-6 rounded-2xl bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 shadow-xl lg:block"
        />
        <div
          aria-hidden
          className="absolute top-28 -right-20 hidden h-56 w-72 rotate-6 rounded-2xl bg-gradient-to-br from-slate-300 via-slate-200 to-stone-300 shadow-xl lg:block"
        />

        <div className="relative mx-auto w-full max-w-6xl px-6 pt-20 pb-10 text-center">
          <p className="eyebrow text-brand-ink/70">Clientflow · Built in Dubai</p>

          <h1 className="display mx-auto mt-6 max-w-4xl text-5xl leading-[1.05] sm:text-6xl lg:text-[64px]">
            Every client, project and payment. One thread.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed">
            The clientflow platform for independent studios and freelancers — from the first
            enquiry to the money landing.
          </p>

          <div className="mt-10 flex flex-col items-center">
            <Link href="/sign-up" className="pill-dark">
              Get started for free
            </Link>
            <p className="mt-3 text-sm font-medium">No credit card required</p>
          </div>
        </div>

        <HeroTabs />
      </section>

      {/* ---- Product shot straddling the hero edge -------------------- */}
      <section className="relative bg-brand-yellow pb-px">
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white" />
        <div className="relative mx-auto w-full max-w-6xl px-6">
          <AppMockup />
        </div>
      </section>

      {/* ---- Feature sections ---------------------------------------- */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <h2 className="display mx-auto max-w-3xl text-center text-4xl leading-tight sm:text-5xl">
          Everything between the first hello and the final payment
        </h2>

        <div className="mt-20 space-y-28">
          <FeatureSection
            eyebrow="Capture leads"
            title="No enquiry slips through"
            body="Every enquiry lands in one pipeline and stays there — visible, sorted, and impossible to forget about."
            chips={['Lead form', 'Scheduler', 'Automations', 'Questionnaires']}
            tint="bg-brand-blue"
          >
            <LeadPanel />
          </FeatureSection>

          <FeatureSection
            eyebrow="Get paid"
            title="Invoices that reconcile themselves"
            body="Send an invoice, record what lands, and let the balance keep itself current. Status is derived from real payments — never typed in by hand."
            chips={['Invoices', 'Payments', 'Reminders', 'Reporting']}
            tint="bg-brand-green"
            flip
          >
            <InvoicePanel />
          </FeatureSection>

          <FeatureSection
            eyebrow="Stay on top"
            title="One place your whole business lives"
            body="Contact details, projects and money history together, instead of scattered across four apps and a spreadsheet."
            chips={['Clients', 'Projects', 'Tasks', 'Pipeline']}
            tint="bg-brand-cream"
          >
            <PipelinePanel />
          </FeatureSection>
        </div>
      </section>

      {/* ---- Numbers -------------------------------------------------- */}
      <section className="border-y border-brand-ink/10 bg-brand-cream/50">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {NUMBERS.map((n) => (
            <div key={n.label}>
              <p className="display text-4xl">{n.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-ink/70">{n.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Closing CTA ---------------------------------------------- */}
      <section className="bg-brand-yellow">
        <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="display text-4xl leading-tight sm:text-5xl">
            Ready to run your business from one desk?
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg">
            Set up your workspace in a couple of minutes. Bring your clients over whenever you are
            ready.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up" className="pill-dark">
              Get started for free
            </Link>
            <Link href="/sign-in" className="pill-light">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product panels — the real app's own UI, drawn statically.           */
/* ------------------------------------------------------------------ */

function AppMockup() {
  const rows = [
    { name: 'Autumn gala film', client: 'Marina Events', stage: 'Booked', value: 'AED 12,000.00' },
    {
      name: 'Spring lookbook',
      client: 'Orchard & Vine',
      stage: 'Proposal sent',
      value: 'AED 4,800.00',
    },
    { name: 'Harbour brand shoot', client: 'Nadia Rahman', stage: 'Enquiry', value: 'AED 7,200.00' },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-ink/10 bg-white shadow-2xl">
      <div className="flex">
        <div className="hidden w-14 shrink-0 flex-col items-center gap-5 bg-brand-ink py-5 sm:flex">
          <span className="font-mono text-[10px] leading-3 font-bold text-white">
            HD
            <br />
            LD
          </span>
          {['◇', '▤', '◷', '✉'].map((glyph, i) => (
            <span key={glyph} className={i === 0 ? 'text-white' : 'text-white/40'}>
              {glyph}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-brand-ink/10 px-5 py-3">
            <div className="h-7 w-48 rounded-full bg-brand-ink/5" />
            <span className="rounded-md bg-brand-blue/30 px-3 py-1 text-sm font-medium">+ New</span>
          </div>

          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <h3 className="display text-3xl">Projects</h3>
              <span className="rounded-md bg-brand-ink px-4 py-2 text-xs font-semibold tracking-wide text-white uppercase">
                Create new
              </span>
            </div>

            <table className="mt-6 w-full text-left text-sm">
              <thead className="text-brand-ink/50">
                <tr className="border-b border-brand-ink/10">
                  <th className="pb-2 font-medium">Project</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-brand-ink/5 last:border-0">
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3 text-brand-ink/70">{r.client}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-brand-yellow-soft px-2.5 py-1 text-xs font-medium">
                        {r.stage}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadPanel() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-xl">
      <div className="flex divide-x divide-brand-ink/10">
        <div className="pr-8">
          <p className="text-sm text-brand-ink/60">New leads</p>
          <p className="display mt-1 text-4xl">7</p>
        </div>
        <div className="pl-8">
          <p className="text-sm text-brand-ink/60">Unread messages</p>
          <p className="display mt-1 text-4xl">8</p>
        </div>
      </div>

      <div className="mt-6 border-t border-brand-ink/10 pt-6">
        <p className="display text-center text-xl">Let&apos;s connect</p>
        <p className="mt-1 text-center text-xs text-brand-ink/60">
          Fill in your details and let us know what services you are interested in.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {['First name', 'Last name', 'Email', 'Phone number'].map((f) => (
            <div key={f}>
              <p className="text-[11px] text-brand-ink/60">{f} *</p>
              <div className="mt-1 h-8 rounded-md bg-brand-ink/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvoicePanel() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-xl">
      <div className="flex items-baseline justify-between">
        <p className="display text-2xl">INV-0001</p>
        <span className="rounded-full bg-brand-yellow-soft px-3 py-1 text-xs font-medium">
          Part paid
        </span>
      </div>
      <p className="mt-1 text-sm text-brand-ink/60">Marina Events · due 1 Sept 2026</p>

      <dl className="mt-6 space-y-3 text-sm">
        {[
          ['Total', 'AED 12,000.00'],
          ['Paid', 'AED 6,000.00'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-brand-ink/5 pb-3">
            <dt className="text-brand-ink/60">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between pt-1">
          <dt className="font-medium">Balance</dt>
          <dd className="display text-2xl">AED 6,000.00</dd>
        </div>
      </dl>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-brand-ink/10">
        <div className="h-full w-1/2 rounded-full bg-brand-ink" />
      </div>
      <p className="mt-2 text-xs text-brand-ink/60">50% collected</p>
    </div>
  );
}

function PipelinePanel() {
  const columns = [
    { stage: 'Enquiry', items: ['Harbour brand shoot'] },
    { stage: 'Proposal sent', items: ['Spring lookbook'] },
    { stage: 'Booked', items: ['Autumn gala film', 'Rooftop launch'] },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {columns.map((c) => (
        <div key={c.stage} className="rounded-xl bg-white p-3 shadow-xl">
          <p className="eyebrow text-brand-ink/50">{c.stage}</p>
          <div className="mt-3 space-y-2">
            {c.items.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-brand-ink/10 px-3 py-2 text-xs font-medium"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketingFooter() {
  const groups = [
    { title: 'Product', links: ['Pipeline', 'Clients', 'Invoices', 'Payments', 'Tasks'] },
    { title: 'Business types', links: ['Photographers', 'Planners', 'Designers', 'Consultants'] },
    { title: 'Resources', links: ['Guides', 'Templates', 'Blog', 'Help centre'] },
    { title: 'Company', links: ['About', 'Careers', 'Contact', 'Privacy'] },
  ];

  return (
    <footer className="border-t border-brand-ink/10 bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-lg font-extrabold tracking-tight">HANDLED</p>
            <p className="mt-3 text-sm text-brand-ink/60">
              Clientflow for independent businesses.
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <p className="text-sm font-semibold">{g.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-brand-ink/60">
                {g.links.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 border-t border-brand-ink/10 pt-6 text-xs text-brand-ink/50">
          © Handled &amp; Helm — clientflow for independent businesses.
        </p>
      </div>
    </footer>
  );
}
