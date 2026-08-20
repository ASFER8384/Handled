'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Select } from '@/components/select';
import { api, showFailure } from '@/lib/client-fetch';
import { COMPANY_TYPES, COUNTRIES, PHONE_CODES, SOCIALS, type Socials } from '@/lib/company-fields';
import { INVOICE_COLOURS, INVOICE_FONTS, type ColourKey, type FontKey } from '@/lib/invoice-theme';

export type CompanyValues = {
  name: string;
  trade: string;
  email: string;
  phoneCode: string;
  phone: string;
  website: string;
  oneLiner: string;
  about: string;
  street: string;
  city: string;
  postcode: string;
  region: string;
  country: string;
  timezone: string;
  currency: string;
};

/**
 * The business as a client meets it.
 *
 * Nothing here is decoration: the block at the top of every invoice is built
 * from these fields, so they are worth filling in once and never again.
 */
export function CompanyForm({
  company,
  socials,
  brandColor,
  themeColor,
  themeFont,
  hasLogo,
  hasAltLogo,
}: {
  company: CompanyValues;
  socials: Socials;
  brandColor: string;
  themeColor: ColourKey;
  themeFont: FontKey;
  hasLogo: boolean;
  hasAltLogo: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [colour, setColour] = useState<ColourKey>(themeColor);
  const [font, setFont] = useState<FontKey>(themeFont);
  const [brand, setBrand] = useState(brandColor);
  const [links, setLinks] = useState<Socials>(socials);
  const [trade, setTrade] = useState(company.trade);
  const [code, setCode] = useState(company.phoneCode || '+971');
  const [country, setCountry] = useState(company.country);
  const [timezone, setTimezone] = useState(company.timezone);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyValues>({ defaultValues: company });

  async function onSubmit(values: CompanyValues) {
    setFormError(null);
    setSaved(false);
    const { error } = await api('/api/settings/company', {
      method: 'PATCH',
      body: {
        ...values,
        trade,
        phoneCode: code,
        country,
        timezone,
        brandColor: brand,
        socials: links,
        themeColor: colour,
        themeFont: font,
      },
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
      {/* --- presence ------------------------------------------------- */}
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
              Company type
            </label>
            <Select
              id="company-trade"
              ariaLabel="Company type"
              placeholder="What kind of work"
              value={trade || null}
              options={COMPANY_TYPES.map((entry) => ({ value: entry, label: entry }))}
              onChange={setTrade}
            />
          </div>

          <div>
            <label className="label" htmlFor="company-email">
              Company email
            </label>
            <input id="company-email" className="input" type="email" {...register('email')} />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="company-phone">
              Phone number
            </label>
            <div className="flex gap-2">
              <Select
                ariaLabel="Dialling code"
                className="w-[116px] shrink-0"
                value={code}
                options={PHONE_CODES.map((entry) => ({ value: entry.code, label: entry.label }))}
                onChange={setCode}
              />
              <input id="company-phone" className="input" maxLength={40} {...register('phone')} />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="company-website">
              Company website
            </label>
            <input
              id="company-website"
              className="input"
              maxLength={120}
              placeholder="www.yourstudio.com"
              {...register('website')}
            />
          </div>
        </div>
      </section>

      {/* --- default theme -------------------------------------------- */}
      <section className="card p-6">
        <h2 className="font-medium">Company file theme</h2>
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

      {/* --- marks ---------------------------------------------------- */}
      <section className="card p-6">
        <h2 className="font-medium">Brand elements</h2>
        <p className="text-muted mt-1 text-sm">
          Your logo sits at the top of what you send. The colour is used wherever a client sees you.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-[auto_auto_minmax(0,1fr)]">
          <LogoSlot slot="main" label="Main logo" has={hasLogo} wide={false} />
          <LogoSlot slot="alt" label="Secondary logo" has={hasAltLogo} wide />

          <div>
            <p className="text-sm font-medium">Brand colour</p>
            <p className="text-muted mt-1 text-sm">
              Used on buttons and headings wherever a client sees you.
            </p>
            <div className="border-line mt-3 flex w-fit items-center gap-3 rounded-lg border px-3 py-2">
              <input
                type="color"
                aria-label="Brand colour"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
              />
              <input
                aria-label="Brand colour hex"
                value={brand}
                maxLength={7}
                onChange={(event) => setBrand(event.target.value)}
                className="w-24 bg-transparent text-sm tracking-wide uppercase outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- words ---------------------------------------------------- */}
      <section className="card p-6">
        <h2 className="font-medium">About your company</h2>

        <div className="mt-5 space-y-5">
          <div>
            <label className="label" htmlFor="company-oneliner">
              One line
            </label>
            <input
              id="company-oneliner"
              className="input"
              maxLength={160}
              placeholder="Describe your company"
              {...register('oneLiner')}
            />
          </div>

          <div>
            <label className="label" htmlFor="company-about">
              Paragraph
            </label>
            <textarea
              id="company-about"
              rows={4}
              className="input"
              maxLength={2000}
              placeholder="Tell a client about your company"
              {...register('about')}
            />
          </div>
        </div>
      </section>

      {/* --- elsewhere ------------------------------------------------ */}
      <section className="card p-6">
        <h2 className="font-medium">Spread the word</h2>
        <p className="text-muted mt-1 text-sm">
          Where else the work can be seen. Only what you fill in is kept.
        </p>

        <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {SOCIALS.map((social) => (
            <div key={social.key}>
              <label className="label" htmlFor={`social-${social.key}`}>
                {social.label}
              </label>
              <input
                id={`social-${social.key}`}
                className="input"
                maxLength={200}
                placeholder={social.hint}
                value={links[social.key] ?? ''}
                onChange={(event) =>
                  setLinks((current) => ({ ...current, [social.key]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* --- where it stands ------------------------------------------ */}
      <section className="card p-6">
        <h2 className="font-medium">More info</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <label className="label" htmlFor="company-street">
              Street address
            </label>
            <input
              id="company-street"
              className="input"
              maxLength={160}
              placeholder="Office address"
              {...register('street')}
            />
          </div>

          <div>
            <label className="label" htmlFor="company-city">
              City
            </label>
            <input id="company-city" className="input" maxLength={80} {...register('city')} />
          </div>

          <div>
            <label className="label" htmlFor="company-postcode">
              Post code
            </label>
            <input
              id="company-postcode"
              className="input"
              maxLength={24}
              {...register('postcode')}
            />
          </div>

          <div>
            <label className="label" htmlFor="company-country">
              Country
            </label>
            <Select
              id="company-country"
              ariaLabel="Country"
              searchable
              placeholder="Pick a country"
              value={country || null}
              options={COUNTRIES.map((entry) => ({ value: entry, label: entry }))}
              onChange={setCountry}
            />
          </div>

          <div>
            <label className="label" htmlFor="company-region">
              State or emirate
            </label>
            <input id="company-region" className="input" maxLength={80} {...register('region')} />
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

          <div className="xl:col-span-2">
            <label className="label" htmlFor="company-timezone">
              Timezone
            </label>
            <TimezoneSelect value={timezone} onChange={setTimezone} />
          </div>
        </div>
      </section>

      {formError && <p className="field-error">{formError}</p>}

      <div className="bg-background/90 sticky bottom-0 flex items-center gap-4 py-4 backdrop-blur">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        {saved && <p className="text-muted text-sm">Saved.</p>}
      </div>
    </form>
  );
}

/** Every zone the browser knows, which is more current than any list here. */
function TimezoneSelect({ value, onChange }: { value: string; onChange: (zone: string) => void }) {
  const zones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : ['Asia/Dubai', 'Europe/London', 'America/New_York'];

  return (
    <Select
      id="company-timezone"
      ariaLabel="Timezone"
      searchable
      placeholder="Pick a timezone"
      value={value || null}
      options={zones.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))}
      onChange={onChange}
    />
  );
}

/** One logo: what is there now, replace it, or take it away. */
function LogoSlot({
  slot,
  label,
  has,
  wide,
}: {
  slot: 'main' | 'alt';
  label: string;
  has: boolean;
  wide: boolean;
}) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped after a change so the browser fetches the new one, not the cached.
  const [version, setVersion] = useState(0);
  const [there, setThere] = useState(has);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`/api/settings/company/logo/${slot}`, { method: 'POST', body });
    setBusy(false);
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      setError(failure?.error ?? 'That did not upload');
      return;
    }
    setThere(true);
    setVersion((count) => count + 1);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/settings/company/logo/${slot}`, { method: 'DELETE' });
    setBusy(false);
    setThere(false);
    setVersion((count) => count + 1);
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>

      <button
        type="button"
        onClick={() => picker.current?.click()}
        className={`border-line hover:border-accent mt-3 flex items-center justify-center rounded-lg border border-dashed p-2 transition-colors ${
          wide ? 'h-[104px] w-[280px]' : 'h-[104px] w-[104px]'
        }`}
      >
        {there ? (
          // Plain img: the file is served by a route, not a static asset, and
          // next/image would only put a resizer in front of it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/settings/company/logo/${slot}?v=${version}`}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-muted text-xs">{busy ? 'Uploading…' : 'Your logo here'}</span>
        )}
      </button>

      <input
        ref={picker}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.target.value = '';
        }}
      />

      {there && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="text-muted mt-2 text-xs hover:text-red-700"
        >
          Remove
        </button>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
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
