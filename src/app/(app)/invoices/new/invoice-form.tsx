'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { FormSelect } from '@/components/form-select';
import { formatMoney, formatRate, parseMoneyToCents } from '@/lib/money';
import { Dialog } from '@/components/dialog';
import { api } from '@/lib/client-fetch';
import { InvoiceSheet } from '@/components/invoice-sheet';
import { scheduleRows, splitByShares, splitCents } from '@/lib/invoice-schedule';
import { BOLD_INK, INVOICE_DESIGNS, invoiceDesign, type InvoiceDesign } from '@/lib/invoice-design';
import { INVOICE_PARTS, shows, type InvoicePart } from '@/lib/invoice-parts';
import {
  DEFAULT_COLOUR,
  DEFAULT_FONT,
  INVOICE_COLOURS,
  INVOICE_FONTS,
  invoiceTheme,
  type ColourKey,
  type FontKey,
} from '@/lib/invoice-theme';

type ClientOption = {
  id: string;
  name: string;
  email: string | null;
  projects: { id: string; name: string }[];
};

type Values = {
  /** Typed over when the workspace's own sequence is not what you number by. */
  number: string;
  clientId: string;
  projectId: string;
  dueAt: string;
  notes: string;
  items: { description: string; quantity: number; unitPrice: string }[];
  /** Empty for the ordinary invoice: one due date, paid once. */
  schedule: { label: string; dueAt: string; amount: string; share?: number }[];
};

const BLANK_ITEM = { description: '', quantity: 1, unitPrice: '' };

/** How many steps a schedule starts with when you ask for one. */
const FIRST_STEPS = 3;

/** A template as the editor needs it, to write this draft again from. */
export type FormTemplate = {
  id: string;
  name: string;
  dueInDays: number;
  notes: string;
  items: { description: string; quantity: number }[];
};

/** What the form opens with, when it was opened from somewhere in particular. */
export type InvoiceStart = {
  clientId: string | null;
  projectId: string | null;
  dueAt: string;
  notes: string;
  /** The template's lines, priced by whoever is filling this in. */
  items: ({ description: string; quantity: number } & { unitPrice?: string })[] | null;
  themeColor?: string | null;
  themeFont?: string | null;
  /** Parts of the letterhead this invoice was written without. */
  hidden?: string[];
  /** The steps it is paid in, if it is paid in steps. */
  schedule?: { label: string; dueAt: string; amount: string; share?: number }[];
  /** Which sheet design it is written on. */
  design?: string | null;
  /** The number it already carries, when one is being rewritten. */
  number?: string;
};

/**
 * The invoice, written on the invoice.
 *
 * Every field sits where the thing it says will be printed, so what you are
 * filling in and what the client will read are the same page. A form of
 * labelled boxes beside a preview asks you to hold two documents in your head
 * and trust that they match.
 */
export function InvoiceForm({
  clients,
  currency,
  from,
  fromEmail,
  fromAddress,
  logo,
  tax,
  start,
  invoiceId,
  number,
  nextNumber,
  title,
  subtitle,
}: {
  clients: ClientOption[];
  currency: string;
  /** The workspace, as it will appear at the top of the invoice. */
  from: string;
  fromEmail: string;
  fromAddress?: string | null;
  logo?: string | null;
  /** What this invoice charges on top, and where the money goes. */
  tax: {
    rateBp: number;
    label: string;
    number: string | null;
    pay: [string, string][];
    payNotes: string | null;
  };
  start?: InvoiceStart;
  /** Set when an invoice that already exists is being rewritten. */
  invoiceId?: string;
  number?: string;
  /** What the sequence would give this one, shown as the field's placeholder. */
  nextNumber?: string;
  /** The page's own heading, so saving can sit in the same row as the title. */
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [colour, setColour] = useState<ColourKey>(
    (start?.themeColor as ColourKey) ?? DEFAULT_COLOUR,
  );
  const [font, setFont] = useState<FontKey>((start?.themeFont as FontKey) ?? DEFAULT_FONT);
  // The design comes from the template and stays with the invoice: it is the
  // shape of the document, not a preference to be re-applied later.
  const [design, setDesign] = useState<InvoiceDesign>(invoiceDesign(start?.design));
  const bold = design === 'bold';
  const modern = design === 'modern';
  const [preview, setPreview] = useState(false);
  // What this one invoice shows of your letterhead. Settings say what your
  // business is; this says what belongs on this document.
  const [hidden, setHidden] = useState<InvoicePart[]>((start?.hidden ?? []) as InvoicePart[]);

  function toggle(part: InvoicePart) {
    setHidden((current) =>
      current.includes(part) ? current.filter((entry) => entry !== part) : [...current, part],
    );
  }
  const theme = invoiceTheme(colour, font);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      number: start?.number ?? '',
      clientId: start?.clientId ?? clients[0]?.id ?? '',
      projectId: start?.projectId ?? '',
      dueAt: start?.dueAt ?? '',
      notes: start?.notes ?? '',
      items: start?.items?.length
        ? start.items.map((item) => ({ ...BLANK_ITEM, ...item }))
        : [{ ...BLANK_ITEM }],
      schedule: start?.schedule ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const steps = useFieldArray({ control, name: 'schedule' });

  const watched = useWatch({ control, name: 'items' }) ?? [];
  const selectedClientId = useWatch({ control, name: 'clientId' });
  const client = clients.find((entry) => entry.id === selectedClientId);
  const projects = client?.projects ?? [];

  const lineTotal = (index: number) =>
    (parseMoneyToCents(watched[index]?.unitPrice ?? '') ?? 0) *
    Number(watched[index]?.quantity || 0);

  const subtotal = watched.reduce((sum, _item, index) => sum + lineTotal(index), 0);
  const taxDue = Math.round((subtotal * tax.rateBp) / 10000);
  const total = subtotal + taxDue;

  const watchedSteps = useWatch({ control, name: 'schedule' }) ?? [];
  const stepCents = (index: number) => parseMoneyToCents(watchedSteps[index]?.amount ?? '') ?? 0;
  const scheduled = watchedSteps.reduce((sum, _step, index) => sum + stepCents(index), 0);
  // The gap between the schedule and the invoice. Shown rather than enforced:
  // a deposit that is deliberately not the whole job is a normal thing to
  // write, and the arithmetic is the client's to check either way.
  const unscheduled = total - scheduled;

  // A template can say how the job is usually split — half up front, the rest
  // on delivery — and while every step still carries its share, the button
  // honours it. Once a step is added or the shares are gone, even it is.
  const shares = watchedSteps.map((step) => step?.share ?? 0);
  const byShares = shares.length > 0 && shares.every((share) => share > 0);

  /** The invoice divided across the steps, keeping the names and dates typed. */
  function splitEvenly(parts: number) {
    const amounts =
      byShares && parts === shares.length ? splitByShares(total, shares) : splitCents(total, parts);
    steps.replace(
      amounts.map((amount, index) => ({
        label: watchedSteps[index]?.label || `Milestone ${index + 1}`,
        dueAt: watchedSteps[index]?.dueAt ?? '',
        share: watchedSteps[index]?.share,
        amount: (amount / 100).toFixed(2),
      })),
    );
  }

  async function onSubmit(values: Values) {
    setFormError(null);

    const items = [];
    for (const item of values.items) {
      const unitPriceCents = parseMoneyToCents(item.unitPrice);
      if (unitPriceCents === null || unitPriceCents < 0) {
        setFormError(`Enter a valid price for "${item.description || 'a line item'}"`);
        return;
      }
      items.push({
        description: item.description,
        quantity: Number(item.quantity),
        unitPriceCents,
      });
    }

    const schedule = [];
    for (const step of values.schedule) {
      const amountCents = parseMoneyToCents(step.amount);
      if (amountCents === null || amountCents < 0) {
        setFormError(`Enter a valid amount for "${step.label || 'a payment step'}"`);
        return;
      }
      schedule.push({ label: step.label, amountCents, dueAt: step.dueAt || undefined });
    }

    const { data, error } = await api<{ invoice: { id: string } }>(
      invoiceId ? `/api/invoices/${invoiceId}` : '/api/invoices',
      {
        method: invoiceId ? 'PUT' : 'POST',
        body: {
          number: values.number.trim() || undefined,
          clientId: values.clientId,
          projectId: values.projectId || undefined,
          dueAt: values.dueAt,
          notes: values.notes,
          design,
          themeColor: colour,
          hidden,
          themeFont: font,
          taxRateBp: tax.rateBp,
          taxLabel: tax.label,
          items,
          schedule,
        },
      },
    );
    if (error) {
      setFormError(error.error);
      return;
    }
    router.push(`/invoices/${data.invoice.id}`);
    router.refresh();
  }

  const dueDate = useWatch({ control, name: 'dueAt' });
  // What the sheet says at the top, which is the typed number until there is
  // a saved one to fall back to.
  const typedNumber = useWatch({ control, name: 'number' });
  const shownNumber = typedNumber?.trim() || number || nextNumber || 'Given when saved';
  const chosenProjectId = useWatch({ control, name: 'projectId' });
  const chosenProject = projects.find((entry) => entry.id === chosenProjectId) ?? null;
  // Who it is for and when it falls due are settings on the invoice rather
  // than words in it, so they are asked for once, in a dialog, instead of
  // sitting as three dropdowns in the middle of the document.
  const [filing, setFiling] = useState(false);
  const notes = useWatch({ control, name: 'notes' });

  return (
    <form id="invoice-form" className="-mr-2" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Stays put while a long invoice scrolls under it: saving is the one
          thing you reach for from anywhere on the page. */}
      <div className="bg-background sticky top-14 z-30 -mt-8 mr-0 mb-6 -ml-8 flex flex-wrap items-start justify-between gap-4 py-5 pr-0 pl-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFiling(true)}
            className="border-line hover:border-accent bg-surface rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Select project and save
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : invoiceId ? 'Save changes' : 'Save as draft'}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-end gap-2">
            <PartsMenu hidden={hidden} onToggle={toggle} />
            <button
              type="button"
              onClick={() => setPreview((on) => !on)}
              className="border-line hover:border-accent bg-surface rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>

          {preview ? (
            <InvoiceSheet
              number={shownNumber}
              from={from}
              fromEmail={shows(hidden, 'contact') ? fromEmail : ''}
              fromAddress={shows(hidden, 'address') ? fromAddress : null}
              logo={shows(hidden, 'logo') ? logo : null}
              billTo={{
                name: client?.name ?? 'Nobody yet',
                company: null,
                address: null,
                email: client?.email ?? null,
              }}
              issuedAt={null}
              dueAt={dueDate ? new Date(`${dueDate}T00:00`) : null}
              items={watched.map((item, index) => ({
                id: String(index),
                description: item?.description || 'Untitled line',
                quantity: Number(item?.quantity || 0),
                unitPriceCents: parseMoneyToCents(item?.unitPrice ?? '') ?? 0,
              }))}
              subtotal={subtotal}
              tax={taxDue}
              taxLabel={tax.label}
              taxRateBp={tax.rateBp}
              taxNumber={shows(hidden, 'taxNumber') ? tax.number : null}
              pay={shows(hidden, 'pay') ? tax.pay : []}
              payNotes={shows(hidden, 'pay') ? tax.payNotes : null}
              paid={0}
              balance={total}
              currency={currency}
              notes={shows(hidden, 'notes') ? notes || null : null}
              design={design}
              schedule={scheduleRows(
                watchedSteps.map((step, index) => ({
                  label: step?.label || `Step ${index + 1}`,
                  amountCents: stepCents(index),
                  dueAt: step?.dueAt ? new Date(`${step.dueAt}T00:00`) : null,
                })),
                0,
              )}
              themeColor={colour}
              themeFont={font}
            />
          ) : (
            <article
              className="invoice-sheet card min-h-[calc(100dvh-16rem)] p-8 sm:p-12"
              style={{ fontFamily: theme.stack }}
            >
              {/* who it is from */}
              {modern ? (
                <header
                  className="-mx-8 -mt-8 mb-8 flex flex-wrap items-start justify-between gap-6 px-8 py-7 sm:-mx-12 sm:-mt-12 sm:px-12"
                  style={{ backgroundColor: theme.hex, color: '#ffffff' }}
                >
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {logo && shows(hidden, 'logo') && (
                      <span className="mb-3 inline-block rounded bg-white p-1.5">
                        <img src={logo} alt="" className="max-h-10 max-w-[160px] object-contain" />
                      </span>
                    )}
                    <p className="text-lg font-semibold">{from}</p>
                    {shows(hidden, 'contact') && (
                      <p className="mt-0.5 text-sm text-white/75">{fromEmail}</p>
                    )}
                    {fromAddress && shows(hidden, 'address') && (
                      <p className="mt-0.5 text-sm whitespace-pre-line text-white/75">
                        {fromAddress}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tracking-tight">INVOICE</p>
                    <p className="mt-1 text-sm text-white/75 tabular-nums">{shownNumber}</p>
                  </div>
                </header>
              ) : (
                <header>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {logo && shows(hidden, 'logo') && (
                    <img src={logo} alt="" className="mb-3 max-h-16 max-w-[220px] object-contain" />
                  )}
                  <p
                    className={bold ? 'text-sm font-semibold' : 'text-lg font-semibold'}
                    style={bold ? { color: theme.hex } : undefined}
                  >
                    {from}
                  </p>
                  {shows(hidden, 'contact') && (
                    <p
                      className={bold ? 'mt-0.5 text-xs' : 'text-muted mt-0.5 text-sm'}
                      style={bold ? { color: theme.hex } : undefined}
                    >
                      {fromEmail}
                    </p>
                  )}
                  {fromAddress && shows(hidden, 'address') && (
                    <p className="text-muted mt-0.5 text-sm whitespace-pre-line">{fromAddress}</p>
                  )}
                </header>
              )}

              {modern ? null : bold ? (
                <h2 className="mt-6 text-3xl font-bold tracking-tight">Invoice</h2>
              ) : (
                <h2
                  className="mt-8 px-4 py-3 text-2xl font-bold tracking-tight"
                  style={{ backgroundColor: `${theme.hex}14`, color: theme.hex }}
                >
                  INVOICE
                </h2>
              )}

              {/* who it is to, and when it falls due */}
              <div className="mt-8 grid gap-8 sm:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  {/* Printed on the invoice, so chosen on the invoice. The
                      project is not printed, and lives in the filing dialog. */}
                  <label className="text-muted text-sm" htmlFor="invoice-client">
                    Bill to
                  </label>
                  <FormSelect
                    id="invoice-client"
                    control={control}
                    name="clientId"
                    searchable
                    className="mt-1.5 max-w-[280px]"
                    placeholder="Pick a contact"
                    required="Pick a client"
                    options={clients.map((entry) => ({
                      value: entry.id,
                      label: entry.name,
                      hint: entry.email ?? undefined,
                    }))}
                  />
                  {errors.clientId && <p className="field-error">{errors.clientId.message}</p>}
                  {client?.email && <p className="text-muted mt-1.5 text-sm">{client.email}</p>}
                  {chosenProject && (
                    <p className="text-muted mt-2 text-sm">For {chosenProject.name}</p>
                  )}
                </div>

                <dl className="space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted">
                      <label htmlFor="invoice-number">Invoice #</label>
                    </dt>
                    <dd>
                      {/* Numbering runs across the workspace, so a client's
                          first invoice is rarely 0001. Type your own over it. */}
                      <input
                        id="invoice-number"
                        placeholder={nextNumber ?? 'Given when saved'}
                        className="input-plain w-[9.5rem] text-right tabular-nums"
                        {...register('number')}
                      />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted">Date issued</dt>
                    <dd className="text-muted">When you send it</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted">
                      <label htmlFor="invoice-due">
                        {steps.fields.length ? 'First due' : 'Payment due'}
                      </label>
                    </dt>
                    <dd>
                      <input
                        id="invoice-due"
                        type="date"
                        className="input-plain w-[9.5rem] text-right"
                        {...register('dueAt')}
                      />
                    </dd>
                  </div>
                  <div className="border-line flex items-center justify-between gap-4 border-t pt-4">
                    <dt className="font-medium">Balance due</dt>
                    <dd className="font-semibold tabular-nums" style={{ color: theme.hex }}>
                      {formatMoney(total, currency)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* what is being billed, typed straight into the table */}
              <table className="mt-10 w-full text-sm">
                <thead>
                  <tr
                    className={
                      bold
                        ? 'text-xs tracking-widest text-white uppercase'
                        : modern
                          ? 'text-xs tracking-widest uppercase'
                          : 'text-muted border-line border-b text-xs tracking-widest uppercase'
                    }
                    style={
                      bold
                        ? { backgroundColor: BOLD_INK }
                        : modern
                          ? { backgroundColor: `${theme.hex}14`, color: theme.hex }
                          : undefined
                    }
                  >
                    <th className="py-3 pl-2 text-left font-medium">Service info</th>
                    <th className="w-20 py-3 pr-2 text-right font-medium">Qty</th>
                    <th className="w-36 py-3 pr-2 text-right font-medium">Unit price</th>
                    <th className="w-32 py-3 pr-2 text-right font-medium">Total</th>
                    <th className={bold ? 'w-8 rounded-r' : 'w-8'} />
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="align-top">
                      <td className="py-2">
                        <input
                          aria-label={`Line ${index + 1} description`}
                          placeholder="What this line is for"
                          className="input-plain"
                          {...register(`items.${index}.description`, {
                            required: 'Describe this line',
                          })}
                        />
                        {errors.items?.[index]?.description && (
                          <p className="field-error">{errors.items[index]?.description?.message}</p>
                        )}
                      </td>
                      <td className="py-2 pl-3">
                        <input
                          aria-label={`Line ${index + 1} quantity`}
                          type="number"
                          min={1}
                          className="input-plain text-right"
                          {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                        />
                      </td>
                      <td className="py-2 pl-3">
                        <input
                          aria-label={`Line ${index + 1} unit price`}
                          inputMode="decimal"
                          placeholder="0.00"
                          className="input-plain text-right"
                          {...register(`items.${index}.unitPrice`)}
                        />
                      </td>
                      <td className="py-2 pr-2 pl-3 text-right tabular-nums">
                        <span className="block py-1.5">
                          {formatMoney(lineTotal(index), currency)}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove line ${index + 1}`}
                            className="text-muted block w-full py-1.5 text-sm hover:text-red-700"
                            onClick={() => remove(index)}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex items-start justify-between gap-6">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => append({ ...BLANK_ITEM })}
                >
                  Add line
                </button>

                <dl className="mr-8 w-full max-w-[280px] pr-2 text-sm">
                  <div className="flex justify-between py-1.5">
                    <dt className="text-muted">Subtotal</dt>
                    <dd className="tabular-nums">{formatMoney(subtotal, currency)}</dd>
                  </div>
                  {tax.rateBp > 0 && (
                    <div className="flex justify-between py-1.5">
                      <dt className="text-muted">
                        {tax.label} {formatRate(tax.rateBp)}
                      </dt>
                      <dd className="tabular-nums">{formatMoney(taxDue, currency)}</dd>
                    </div>
                  )}
                  <div className="border-line mt-1.5 flex justify-between border-t pt-3 text-base">
                    <dt className="font-medium">Balance due</dt>
                    <dd className="font-semibold tabular-nums" style={{ color: theme.hex }}>
                      {formatMoney(total, currency)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* how it is paid: nothing at all, or named steps with dates */}
              {steps.fields.length === 0 ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => splitEvenly(FIRST_STEPS)}
                    className="text-muted hover:text-foreground text-sm underline underline-offset-4"
                  >
                    Pay this in steps
                  </button>
                </div>
              ) : (
                <section className="border-line mt-10 border-t pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted text-xs tracking-widest uppercase">Payment schedule</p>
                    <div className="flex items-center gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => splitEvenly(steps.fields.length)}
                        className="text-muted hover:text-foreground underline underline-offset-4"
                      >
                        {byShares ? 'Fill in the amounts' : 'Split evenly'}
                      </button>
                      <button
                        type="button"
                        onClick={() => steps.replace([])}
                        className="text-muted underline underline-offset-4 hover:text-red-700"
                      >
                        Remove schedule
                      </button>
                    </div>
                  </div>

                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-muted border-line border-b text-xs tracking-widest uppercase">
                        <th className="w-40 py-3 pl-2 text-left font-medium">Amount</th>
                        <th className="py-3 pl-3 text-left font-medium">Step</th>
                        <th className="w-44 py-3 pl-3 text-left font-medium">Due date</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-line divide-y">
                      {steps.fields.map((step, index) => (
                        <tr key={step.id} className="align-top">
                          <td className="py-2 pl-0">
                            <input
                              aria-label={`Step ${index + 1} amount`}
                              inputMode="decimal"
                              placeholder="0.00"
                              className="input-plain text-right"
                              {...register(`schedule.${index}.amount`)}
                            />
                          </td>
                          <td className="py-2 pl-3">
                            <input
                              aria-label={`Step ${index + 1} name`}
                              placeholder="What this payment is"
                              className="input-plain"
                              {...register(`schedule.${index}.label`, {
                                required: 'Name this step',
                              })}
                            />
                          </td>
                          <td className="py-2 pl-3">
                            <input
                              aria-label={`Step ${index + 1} due date`}
                              type="date"
                              className="input-plain"
                              {...register(`schedule.${index}.dueAt`)}
                            />
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              aria-label={`Remove step ${index + 1}`}
                              className="text-muted block w-full py-1.5 text-sm hover:text-red-700"
                              onClick={() => steps.remove(index)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => steps.append({ label: '', dueAt: '', amount: '' })}
                    >
                      Add step
                    </button>
                    {/* Said, not enforced: a deposit that is not the whole job
                        is a normal thing to write. */}
                    <p className={`text-sm ${unscheduled === 0 ? 'text-muted' : 'text-red-700'}`}>
                      {unscheduled === 0
                        ? 'The steps add up to the invoice.'
                        : unscheduled > 0
                          ? `${formatMoney(unscheduled, currency)} of the invoice is not in the schedule`
                          : `The steps come to ${formatMoney(-unscheduled, currency)} more than the invoice`}
                    </p>
                  </div>
                </section>
              )}

              <footer
                className={`border-line mt-10 border-t pt-5 ${shows(hidden, 'notes') ? '' : 'hidden'}`}
              >
                <label
                  className="text-muted text-xs tracking-widest uppercase"
                  htmlFor="invoice-notes"
                >
                  Notes
                </label>
                <textarea
                  id="invoice-notes"
                  rows={2}
                  placeholder="Terms, or anything the client should read."
                  className="input-plain mt-2"
                  {...register('notes')}
                />
              </footer>
            </article>
          )}

          {formError && <p className="field-error mt-4">{formError}</p>}

          {filing && (
            <Dialog fit width={460} title="File it on a project" onClose={() => setFiling(false)}>
              {/* Everything the client reads is on the sheet itself. This is
                  the one thing that is not: which job it belongs to. */}
              <label className="label" htmlFor="invoice-project">
                Project
              </label>
              <FormSelect
                id="invoice-project"
                control={control}
                name="projectId"
                placeholder="No project"
                options={projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                }))}
              />
              <p className="text-muted mt-1.5 text-xs">
                {projects.length === 0
                  ? 'This client has no projects yet. It can be filed later from the invoices list.'
                  : 'Optional. An invoice can stand on its own and be filed later.'}
              </p>

              <div className="mt-6 flex items-center gap-3">
                {/* The dialog is mounted on the body, so it reaches the form
                  by name rather than by sitting inside it. */}
                <button
                  type="submit"
                  form="invoice-form"
                  disabled={isSubmitting}
                  onClick={() => setFiling(false)}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Saving...' : 'Save as draft'}
                </button>
                <button type="button" onClick={() => setFiling(false)} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </Dialog>
          )}
        </div>

        {/* --- how it will look ---------------------------------------- */}
        <aside className="card p-5 xl:sticky xl:top-32">
          <h2 className="text-[15px] font-semibold">Customise</h2>

          <p className="text-muted mt-6 text-xs tracking-widest uppercase">Design</p>
          <div className="mt-2.5 space-y-1.5">
            {(Object.keys(INVOICE_DESIGNS) as InvoiceDesign[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setDesign(key)}
                aria-pressed={design === key}
                className={`border-line block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  design === key ? 'border-accent bg-accent-soft/40' : 'hover:border-accent'
                }`}
              >
                <span className="font-medium">{INVOICE_DESIGNS[key].label}</span>
                <span className="text-muted mt-0.5 block text-xs">
                  {INVOICE_DESIGNS[key].blurb}
                </span>
              </button>
            ))}
          </div>

          <p className="text-muted mt-6 text-xs tracking-widest uppercase">Colour</p>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {INVOICE_COLOURS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setColour(entry.key)}
                aria-label={entry.label}
                aria-pressed={colour === entry.key}
                style={{ backgroundColor: entry.hex }}
                className={`h-7 w-7 rounded-full transition-transform ${
                  colour === entry.key
                    ? 'ring-foreground scale-110 ring-2 ring-offset-2'
                    : 'hover:scale-105'
                }`}
              />
            ))}
          </div>

          <p className="text-muted mt-6 text-xs tracking-widest uppercase">Typeface</p>
          <div className="mt-2.5 space-y-1.5">
            {INVOICE_FONTS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setFont(entry.key)}
                aria-pressed={font === entry.key}
                style={{ fontFamily: entry.stack }}
                className={`border-line flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                  font === entry.key ? 'border-accent bg-accent-soft/40' : 'hover:border-accent'
                }`}
              >
                {entry.label}
                <span className="text-lg">Aa</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </form>
  );
}

/**
 * What this invoice shows of your letterhead, behind one button.
 *
 * Six things you touch once and then leave alone, so they do not earn
 * permanent space beside a document you are writing. The panel opens where you
 * asked for it and closes when you look away.
 */
function PartsMenu({
  hidden,
  onToggle,
}: {
  hidden: InvoicePart[];
  onToggle: (part: InvoicePart) => void;
}) {
  const [open, setOpen] = useState(false);
  const off = hidden.length;

  useEffect(() => {
    if (!open) return;
    function away(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-parts]')) setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <span className="relative" data-parts>
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        className="border-line hover:border-accent bg-surface flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
        Shown on this invoice
        {off > 0 && (
          <span className="bg-accent-soft text-accent rounded-full px-1.5 text-xs">{off} off</span>
        )}
      </button>

      {open && (
        <div className="border-line bg-surface absolute top-full right-0 z-40 mt-2 w-[268px] rounded-xl border p-1.5 shadow-2xl">
          {INVOICE_PARTS.map((part) => (
            <label
              key={part.key}
              className="hover:bg-accent-soft/40 flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2"
            >
              <input
                type="checkbox"
                checked={shows(hidden, part.key)}
                onChange={() => onToggle(part.key)}
                className="accent-accent mt-0.5 h-4 w-4"
              />
              <span className="min-w-0">
                <span className="block text-sm">{part.label}</span>
                <span className="text-muted block text-xs">{part.hint}</span>
              </span>
            </label>
          ))}
          <p className="text-muted border-line mt-1 border-t px-2.5 py-2 text-xs leading-relaxed">
            This invoice only. Your company settings stay as they are.
          </p>
        </div>
      )}
    </span>
  );
}
