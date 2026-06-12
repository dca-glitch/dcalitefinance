import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getCountryOptions } from '../../lib/country-options';
import type { IssuerProfileRecord, IssuerProfileUpsertInput } from '../../types/issuer-profile';
import { issuerProfileCurrencyOptions } from '../../types/issuer-profile';

interface IssuerProfileFormState {
  issuerDisplayName: string;
  issuerLegalName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  companyRegistrationNumber: string;
  currencyCode: string;
  defaultInvoiceTerms: string;
  defaultPaymentInstructions: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankSwift: string;
  invoiceFooter: string;
}

interface IssuerProfileFormProps {
  initialProfile: IssuerProfileRecord | null;
  error?: string | null;
  loading?: boolean;
  onSubmit: (input: IssuerProfileUpsertInput) => Promise<void> | void;
}

function buildInitialForm(profile: IssuerProfileRecord | null): IssuerProfileFormState {
  return {
    issuerDisplayName: profile?.issuerDisplayName ?? '',
    issuerLegalName: profile?.issuerLegalName ?? '',
    addressLine1: profile?.addressLine1 ?? '',
    addressLine2: profile?.addressLine2 ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
    postalCode: profile?.postalCode ?? '',
    country: profile?.country ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    website: profile?.website ?? '',
    taxId: profile?.taxId ?? '',
    companyRegistrationNumber: profile?.companyRegistrationNumber ?? '',
    currencyCode: profile?.currencyCode ?? 'USD',
    defaultInvoiceTerms: profile?.defaultInvoiceTerms ?? '',
    defaultPaymentInstructions: profile?.defaultPaymentInstructions ?? '',
    bankAccountName: profile?.bankAccountName ?? '',
    bankName: profile?.bankName ?? '',
    bankAccountNumber: profile?.bankAccountNumber ?? '',
    bankSwift: profile?.bankSwift ?? '',
    invoiceFooter: profile?.invoiceFooter ?? '',
  };
}

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function IssuerProfileForm({ initialProfile, error = null, loading = false, onSubmit }: IssuerProfileFormProps) {
  const [form, setForm] = useState<IssuerProfileFormState>(() => buildInitialForm(initialProfile));

  useEffect(() => {
    setForm(buildInitialForm(initialProfile));
  }, [initialProfile]);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();

        await onSubmit({
          issuerDisplayName: form.issuerDisplayName.trim(),
          issuerLegalName: normalizeOptionalValue(form.issuerLegalName),
          addressLine1: normalizeOptionalValue(form.addressLine1),
          addressLine2: normalizeOptionalValue(form.addressLine2),
          city: normalizeOptionalValue(form.city),
          state: normalizeOptionalValue(form.state),
          postalCode: normalizeOptionalValue(form.postalCode),
          country: normalizeOptionalValue(form.country),
          email: normalizeOptionalValue(form.email),
          phone: normalizeOptionalValue(form.phone),
          website: normalizeOptionalValue(form.website),
          taxId: normalizeOptionalValue(form.taxId),
          companyRegistrationNumber: normalizeOptionalValue(form.companyRegistrationNumber),
          currencyCode: form.currencyCode as IssuerProfileUpsertInput['currencyCode'],
          defaultInvoiceTerms: normalizeOptionalValue(form.defaultInvoiceTerms),
          defaultPaymentInstructions: normalizeOptionalValue(form.defaultPaymentInstructions),
          bankAccountName: normalizeOptionalValue(form.bankAccountName),
          bankName: normalizeOptionalValue(form.bankName),
          bankAccountNumber: normalizeOptionalValue(form.bankAccountNumber),
          bankSwift: normalizeOptionalValue(form.bankSwift),
          invoiceFooter: normalizeOptionalValue(form.invoiceFooter),
        });
      }}
    >
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Company profile</h3>
          <p className="mt-1 text-sm text-slate-400">Use the legal company identity that should appear on invoices and PDFs.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Issuer display name"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, issuerDisplayName: event.target.value }))}
            required
            value={form.issuerDisplayName}
          />
          <Input
            label="Issuer legal name"
            maxLength={200}
            onChange={(event) => setForm((current) => ({ ...current, issuerLegalName: event.target.value }))}
            value={form.issuerLegalName}
          />
          <Input
            label="Tax ID"
            maxLength={80}
            onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))}
            value={form.taxId}
          />
          <Input
            label="Company registration number"
            maxLength={80}
            onChange={(event) => setForm((current) => ({ ...current, companyRegistrationNumber: event.target.value }))}
            value={form.companyRegistrationNumber}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Currency code *</span>
            <select
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value }))}
              required
              value={form.currencyCode}
            >
              {issuerProfileCurrencyOptions.map((currencyCode) => (
                <option key={currencyCode} value={currencyCode}>
                  {currencyCode}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-800 pt-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Address</h3>
          <p className="mt-1 text-sm text-slate-400">Optional address details for invoices and document headers.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Address line 1"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, addressLine1: event.target.value }))}
            value={form.addressLine1}
          />
          <Input
            label="Address line 2"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, addressLine2: event.target.value }))}
            value={form.addressLine2}
          />
          <Input
            label="City"
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            value={form.city}
          />
          <Input
            label="State / region"
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
            value={form.state}
          />
          <Input
            label="Postal code"
            maxLength={40}
            onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
            value={form.postalCode}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Country</span>
            <select
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
              value={form.country}
            >
              <option value="">No country</option>
              {getCountryOptions(form.country).map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-800 pt-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Contact details</h3>
          <p className="mt-1 text-sm text-slate-400">These details are safe to publish on invoices and PDF documents.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Email"
            maxLength={200}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            type="email"
            value={form.email}
          />
          <Input
            label="Phone"
            maxLength={40}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            value={form.phone}
          />
          <Input
            label="Website"
            maxLength={200}
            onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
            type="url"
            value={form.website}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-800 pt-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Invoice defaults</h3>
          <p className="mt-1 text-sm text-slate-400">These defaults can be reused when generating invoices and PDFs.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Default invoice terms</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={5000}
              onChange={(event) => setForm((current) => ({ ...current, defaultInvoiceTerms: event.target.value }))}
              value={form.defaultInvoiceTerms}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Default payment instructions</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={5000}
              onChange={(event) => setForm((current) => ({ ...current, defaultPaymentInstructions: event.target.value }))}
              value={form.defaultPaymentInstructions}
            />
          </label>
          <Input
            label="Bank account name"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, bankAccountName: event.target.value }))}
            value={form.bankAccountName}
          />
          <Input
            label="Bank name"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))}
            value={form.bankName}
          />
          <Input
            label="Bank account number"
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, bankAccountNumber: event.target.value }))}
            value={form.bankAccountNumber}
          />
          <Input
            label="Bank SWIFT"
            maxLength={40}
            onChange={(event) => setForm((current) => ({ ...current, bankSwift: event.target.value }))}
            value={form.bankSwift}
          />
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-200">Invoice footer</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={5000}
              onChange={(event) => setForm((current) => ({ ...current, invoiceFooter: event.target.value }))}
              value={form.invoiceFooter}
            />
          </label>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={loading} type="submit">
          Save company settings
        </Button>
        <p className="text-sm text-slate-400">
          Currency is fixed per tenant. Changes are blocked after financial records already exist.
        </p>
      </div>
    </form>
  );
}
