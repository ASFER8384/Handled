'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api, showFailure } from '@/lib/client-fetch';
import {
  INVOICE_COLOURS,
  INVOICE_FONTS,
  type ColourKey,
  type FontKey,
} from '@/lib/invoice-theme';

type Values = {
  name: string;
  trade: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  currency: string;
};

/**
 * The business as a client meets it: the name, the way to reach you, and what
 * your files look like before you touch them.
 *
 * These are not decoration. The block at the top of every invoice is built
 * from exactly these fields, which is why they are worth filling in once.
 */
export function CompanyForm({
  company,
  themeColor,
  themeFont,
}: {
  company: Values;
  themeColor: ColourKey;
  themeFont: FontKey;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [colour, setColour] = useState<ColourKey>(themeColor);
  const [font, setFont] = useState<FontKey>(themeFont);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: company });

  async function onSubmit(values: Values) {
    setFormError(null);
    setSaved(false);
    const { error } = await api('/api/settings/company', {
      method: 'PATCH',
      body: { ...values, themeColor: colour, themeFont: font },
    });
    if (error) {
      showFailure(error, setError, setFormError);
      return;
    }
    reset(values);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <section className="card p-6">
        <h2 className="font-medium">Build up your professional presence</h2>
        <p className="text-muted mt-1 text-sm">
          This is the block at the top of every invoice you send.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="company-name">
              Business name
            </label>
            <input id="company-name" className="input" maxLength={80} {...register('name')} />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="company-trade">
              What you do
            </label>
            <input
              id="company-trade"
              className="input"
              maxLength={60}
              placeholder="Photography, catering, design…"
              {...register('trade')}
            />
          </div>

          <div>
            <label className="label" htmlFor="company-email">
              Business email
            </label>
            <input id="company-email" className="input" type="email" {...register('email')} />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="company-phone">
              Phone
            </label>
            <input id="company-phone" className="input" maxLength={40} {...register('phone')} />
          </div>

          <div>
            <label className="label" htmlFor="company-website">
              Website
            </label>
            <input
              id="company-website"
              className="input"
              maxLength={120}
              placeholder="handled.example"
              {...register('website')}
            />
          </div>

          <div>
            <label className="label" htmlFor="company-currency">
              Currency
            </label>
            <input
              id="company-currency"
              className="input uppercase"
              maxLength={3}
              {...register('currency')}
            />
            {errors.currency ? (
              <p className="field-error">{errors.currency.message}</p>
            ) : (
              <p className="text-muted mt-1.5 text-xs">Every total in Handled is read in this.</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="company-address">
              Address
            </label>
            <textarea
              id="company-address"
              rows={2}
              className="input"
              maxLength={300}
              {...register('address')}
            />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-medium">Default file theme</h2>
        <p className="text-muted mt-1 text-sm">
          What a file looks like before you change it on the file itself.
        </p>

        <div className="mt-6 grid gap-8 sm:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="text-muted text-xs tracking-widest uppercase">Colour</p>
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
            <div className="mt-2.5 flex flex-wrap gap-2">
              {INVOICE_FONTS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setFont(entry.key)}
                  aria-pressed={font === entry.key}
                  style={{ fontFamily: entry.stack }}
                  className={`border-line flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    font === entry.key ? 'border-accent bg-accent-soft/40' : 'hover:border-accent'
                  }`}
                >
                  {entry.label}
                  <span className="text-lg">Aa</span>
                </button>
              ))}
            </div>
          </div>

          <ThemePreview colour={colour} font={font} />
        </div>
      </section>

      {formError && <p className="field-error">{formError}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        {saved && <p className="text-muted text-sm">Saved.</p>}
      </div>
    </form>
  );
}

/** A few centimetres of the thing itself, rather than a description of it. */
function ThemePreview({ colour, font }: { colour: ColourKey; font: FontKey }) {
  const hex = INVOICE_COLOURS.find((entry) => entry.key === colour)!.hex;
  const stack = INVOICE_FONTS.find((entry) => entry.key === font)!.stack;

  return (
    <div className="border-line rounded-xl border p-4" style={{ fontFamily: stack }}>
      <p className="text-muted text-xs tracking-widest uppercase">Preview</p>
      <p
        className="mt-3 px-3 py-2 text-lg font-bold tracking-tight"
        style={{ backgroundColor: `${hex}14`, color: hex }}
      >
        INVOICE
      </p>
      <div className="mt-3 flex justify-between text-sm">
        <span className="text-muted">Balance due</span>
        <span className="font-semibold tabular-nums" style={{ color: hex }}>
          1,500.00
        </span>
      </div>
    </div>
  );
}
