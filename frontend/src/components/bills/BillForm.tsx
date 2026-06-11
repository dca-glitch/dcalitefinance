import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ExpenseCategoryRecord } from '../../types/expense-category';
import type { BillMutationInput, BillRecord } from '../../types/bill';
import type { VendorRecord } from '../../types/vendor';

interface BillFormProps {
  categories: ExpenseCategoryRecord[];
  error?: string | null;
  initialBill?: BillRecord | null;
  loading?: boolean;
  onCancelEdit?: () => void;
  onSubmit: (input: BillMutationInput) => Promise<void> | void;
  vendors: VendorRecord[];
}

interface BillFormState {
  vendorId: string;
  categoryId: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  amount: string;
  paymentMethod: string;
  paymentReference: string;
  notes: string;
}

function toDateInputValue(value?: string | null): string {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function toLocalDateInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function buildInitialState(bill?: BillRecord | null): BillFormState {
  return {
    vendorId: bill?.vendorId ?? '',
    categoryId: bill?.categoryId ?? '',
    billNumber: bill?.billNumber ?? '',
    billDate: toDateInputValue(bill?.billDate) || toLocalDateInputValue(),
    dueDate: toDateInputValue(bill?.dueDate),
    amount: bill ? (bill.amountMinor / 100).toFixed(2) : '',
    paymentMethod: bill?.paymentMethod ?? '',
    paymentReference: bill?.paymentReference ?? '',
    notes: bill?.notes ?? '',
  };
}

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMinorAmount(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function BillForm({
  categories,
  error = null,
  initialBill = null,
  loading = false,
  onCancelEdit,
  onSubmit,
  vendors,
}: BillFormProps) {
  const [form, setForm] = useState<BillFormState>(() => buildInitialState(initialBill));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialState(initialBill));
    setLocalError(null);
  }, [initialBill]);

  const isEditing = Boolean(initialBill);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const amountMinor = parseMinorAmount(form.amount);
    if (amountMinor === null) {
      setLocalError('Bill amount must be a valid number.');
      return;
    }

    await onSubmit({
      vendorId: normalizeOptionalValue(form.vendorId),
      categoryId: normalizeOptionalValue(form.categoryId),
      billNumber: normalizeOptionalValue(form.billNumber),
      billDate: form.billDate,
      dueDate: normalizeOptionalValue(form.dueDate),
      amountMinor,
      paymentMethod: normalizeOptionalValue(form.paymentMethod),
      paymentReference: normalizeOptionalValue(form.paymentReference),
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
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Bill details</h3>
          <p className="mt-1 text-sm text-slate-400">Capture the core bill details before payment tracking.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Vendor</span>
            <select
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) => setForm((current) => ({ ...current, vendorId: event.target.value }))}
              value={form.vendorId}
            >
              <option value="">No vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Expense category</span>
            <select
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
              value={form.categoryId}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Bill number"
            maxLength={40}
            onChange={(event) => setForm((current) => ({ ...current, billNumber: event.target.value }))}
            value={form.billNumber}
          />
          <Input
            label="Bill date"
            onChange={(event) => setForm((current) => ({ ...current, billDate: event.target.value }))}
            required
            type="date"
            value={form.billDate}
          />
          <Input
            label="Due date"
            onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            type="date"
            value={form.dueDate}
          />
          <Input
            inputMode="decimal"
            label="Amount"
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="0.00"
            required
            step="0.01"
            type="number"
            value={form.amount}
          />
          <Input
            label="Payment method"
            maxLength={80}
            onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
            value={form.paymentMethod}
          />
          <Input
            className="lg:col-span-2"
            label="Payment reference"
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, paymentReference: event.target.value }))}
            value={form.paymentReference}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-800 pt-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Notes</h3>
          <p className="mt-1 text-sm text-slate-400">Optional notes for the bill record.</p>
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

      {localError || error ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {localError ?? error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={loading} type="submit">
          {isEditing ? 'Save bill' : 'Create bill'}
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
