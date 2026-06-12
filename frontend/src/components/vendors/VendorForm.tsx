import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getCountryOptions } from '../../lib/country-options';
import type { VendorMutationInput, VendorRecord } from '../../types/vendor';

interface VendorFormProps {
  error?: string | null;
  initialVendor?: VendorRecord | null;
  loading?: boolean;
  onCancelEdit?: () => void;
  onSubmit: (input: VendorMutationInput) => Promise<void> | void;
}

interface VendorFormState {
  name: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
  notes: string;
}

function buildInitialState(vendor?: VendorRecord | null): VendorFormState {
  return {
    name: vendor?.name ?? '',
    email: vendor?.email ?? '',
    phone: vendor?.phone ?? '',
    website: vendor?.website ?? '',
    taxId: vendor?.taxId ?? '',
    billingAddressLine1: vendor?.billingAddressLine1 ?? '',
    billingAddressLine2: vendor?.billingAddressLine2 ?? '',
    billingCity: vendor?.billingCity ?? '',
    billingState: vendor?.billingState ?? '',
    billingPostalCode: vendor?.billingPostalCode ?? '',
    billingCountry: vendor?.billingCountry ?? '',
    notes: vendor?.notes ?? '',
  };
}

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function VendorForm({ error = null, initialVendor = null, loading = false, onCancelEdit, onSubmit }: VendorFormProps) {
  const [form, setForm] = useState<VendorFormState>(() => buildInitialState(initialVendor));

  useEffect(() => {
    setForm(buildInitialState(initialVendor));
  }, [initialVendor]);

  const isEditing = Boolean(initialVendor);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      name: form.name.trim(),
      email: normalizeOptionalValue(form.email),
      phone: normalizeOptionalValue(form.phone),
      website: normalizeOptionalValue(form.website),
      taxId: normalizeOptionalValue(form.taxId),
      billingAddressLine1: normalizeOptionalValue(form.billingAddressLine1),
      billingAddressLine2: normalizeOptionalValue(form.billingAddressLine2),
      billingCity: normalizeOptionalValue(form.billingCity),
      billingState: normalizeOptionalValue(form.billingState),
      billingPostalCode: normalizeOptionalValue(form.billingPostalCode),
      billingCountry: normalizeOptionalValue(form.billingCountry),
      notes: normalizeOptionalValue(form.notes),
    });

    if (!isEditing) {
      setForm(buildInitialState(null));
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Basic details</h3>
          <p className="mt-1 text-sm text-slate-400">Core contact details for this vendor.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Vendor name"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
            value={form.name}
          />
          <Input
            label="Email"
            maxLength={254}
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
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Invoice details</h3>
          <p className="mt-1 text-sm text-slate-400">Billing details that will feed future invoices.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Tax ID"
            maxLength={80}
            onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))}
            value={form.taxId}
          />
          <Input
            label="Billing address line 1"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, billingAddressLine1: event.target.value }))}
            value={form.billingAddressLine1}
          />
          <Input
            label="Billing address line 2"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, billingAddressLine2: event.target.value }))}
            value={form.billingAddressLine2}
          />
          <Input
            label="Billing city"
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, billingCity: event.target.value }))}
            value={form.billingCity}
          />
          <Input
            label="Billing state"
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, billingState: event.target.value }))}
            value={form.billingState}
          />
          <Input
            label="Billing postal code"
            maxLength={40}
            onChange={(event) => setForm((current) => ({ ...current, billingPostalCode: event.target.value }))}
            value={form.billingPostalCode}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Billing country</span>
            <select
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) => setForm((current) => ({ ...current, billingCountry: event.target.value }))}
              value={form.billingCountry}
            >
              <option value="">No country</option>
              {getCountryOptions(form.billingCountry).map((country) => (
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
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Notes</h3>
          <p className="mt-1 text-sm text-slate-400">Optional internal notes for this vendor record.</p>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">Notes</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            maxLength={5000}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            value={form.notes}
          />
        </label>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={loading} type="submit">
          {isEditing ? 'Save vendor' : 'Create vendor'}
        </Button>
        {isEditing && onCancelEdit ? (
          <Button onClick={onCancelEdit} type="button" variant="secondary">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
