import { useEffect, useMemo, useState } from 'react';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { listInvoices } from '../lib/invoices-api';
import { createPayment, listPayments, reversePayment } from '../lib/payments-api';
import { useAuth } from '../hooks/useAuth';
import type { InvoiceListItem } from '../types/invoice';
import type { PaymentRecord } from '../types/payment';

interface PaymentFormState {
  invoiceId: string;
  amount: string;
  paymentDate: string;
  method: string;
  reference: string;
  notes: string;
}

function toLocalDateInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatMinorAmount(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
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
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function buildInitialForm(): PaymentFormState {
  return {
    invoiceId: '',
    amount: '',
    paymentDate: toLocalDateInputValue(),
    method: 'Bank Transfer',
    reference: '',
    notes: '',
  };
}

function statusLabel(status: PaymentRecord['status']): string {
  return status === 'REVERSED' ? 'Reversed' : 'Posted';
}

function invoiceStatusLabel(status: InvoiceListItem['status']): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'ISSUED':
      return 'Issued';
    case 'PARTIALLY_PAID':
      return 'Partially paid';
    case 'PAID':
      return 'Paid';
    case 'CANCELLED':
      return 'Cancelled';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return status;
  }
}

function invoiceOptionLabel(invoice: InvoiceListItem): string {
  const balance = formatMinorAmount(invoice.balanceDueMinor);
  return `${invoice.invoiceNumber} • ${invoiceStatusLabel(invoice.status)} • balance ${balance}`;
}

export function PaymentsPage() {
  const { activeTenant } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [reverseLoadingId, setReverseLoadingId] = useState<string | null>(null);
  const [filterInvoiceId, setFilterInvoiceId] = useState('');
  const [form, setForm] = useState<PaymentFormState>(() => buildInitialForm());

  async function loadPaymentsPage(invoiceId: string) {
    if (!activeTenant?.id) {
      setInvoices([]);
      setPayments([]);
      setPageError('No active tenant context is available for payments.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const [paymentsResult, invoicesResult] = await Promise.all([
        listPayments({ invoiceId: invoiceId || undefined, limit: 100 }),
        listInvoices({ limit: 100 }),
      ]);

      setPayments(paymentsResult.payments);
      setInvoices(invoicesResult.invoices);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load payments');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadPaymentsPage(filterInvoiceId);
  }, [activeTenant?.id, filterInvoiceId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const amountMinor = parseMinorAmount(form.amount);
      if (amountMinor === null) {
        throw new Error('Payment amount must be a valid number greater than 0.');
      }

      if (!form.invoiceId.trim()) {
        throw new Error('Please choose an invoice.');
      }

      if (!form.paymentDate.trim()) {
        throw new Error('Payment date is required.');
      }

      await createPayment({
        invoiceId: form.invoiceId.trim(),
        amountMinor,
        paymentDate: form.paymentDate.trim(),
        method: form.method.trim(),
        reference: normalizeOptionalValue(form.reference),
        notes: normalizeOptionalValue(form.notes),
      });

      setForm(buildInitialForm());
      await loadPaymentsPage(filterInvoiceId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save payment');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleReverse(payment: PaymentRecord) {
    const reason = window.prompt('Optional reversal reason')?.trim() ?? '';

    setReverseLoadingId(payment.id);
    setPageError(null);

    try {
      await reversePayment(payment.id, reason ? { reason } : {});
      await loadPaymentsPage(filterInvoiceId);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to reverse payment');
    } finally {
      setReverseLoadingId(null);
    }
  }

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    'current tenant';

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === form.invoiceId) ?? null,
    [form.invoiceId, invoices],
  );

  return (
    <AppPage>
      <PageHeader
        description={`Record and reverse posted payments for ${tenantLabel}. This page stays intentionally simple and desktop-only.`}
        eyebrow="DCA Books Lite"
        title="Payments"
      />

      <PageSection
        description="Create a payment against an invoice. Payment reversal is handled directly from the list below."
        title="Create payment"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Invoice</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                onChange={(event) => setForm((current) => ({ ...current, invoiceId: event.target.value }))}
                value={form.invoiceId}
              >
                <option value="">Select an invoice</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoiceOptionLabel(invoice)}
                  </option>
                ))}
              </select>
            </label>
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
              label="Payment date"
              onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))}
              required
              type="date"
              value={form.paymentDate}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Method</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}
                value={form.method}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Stripe">Stripe</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              label="Reference"
              maxLength={120}
              onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
              value={form.reference}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Notes</span>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                maxLength={5000}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                value={form.notes}
              />
            </label>
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {formError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button loading={formLoading} type="submit">
              Create payment
            </Button>
            <div className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              Invoice: {selectedInvoice?.invoiceNumber ?? 'None selected'}
            </div>
          </div>
        </form>
      </PageSection>

      <PageSection
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Filter by invoice</span>
              <select
                className="w-80 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                onChange={(event) => setFilterInvoiceId(event.target.value)}
                value={filterInvoiceId}
              >
                <option value="">All payments</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoiceOptionLabel(invoice)}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={() => void loadPaymentsPage(filterInvoiceId)} variant="secondary">
              Refresh
            </Button>
          </div>
        }
        description="Payment records are tenant-scoped and can be reversed if necessary."
        title="Payment list"
      >
        {initialLoading ? <LoadingState message="Loading payments..." /> : null}

        {!initialLoading && pageError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadPaymentsPage(filterInvoiceId)} variant="secondary">
                Retry
              </Button>
            }
            message={pageError}
            title="Unable to load payments"
          />
        ) : null}

        {!initialLoading && !pageError && payments.length === 0 ? (
          <EmptyState
            message="No payments match the current filter. Create a payment above or change the invoice filter."
            title="No payments yet"
          />
        ) : null}

        {!initialLoading && !pageError && payments.length > 0 ? (
          <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/50">
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-6 py-4 font-medium">Payment</th>
                    <th className="px-6 py-4 font-medium">Invoice</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {payments.map((payment) => (
                    <tr className="align-top" key={payment.id}>
                      <td className="px-6 py-5">
                        <div className="font-medium text-slate-50">{payment.method}</div>
                        <p className="mt-1 text-sm text-slate-400">
                          {payment.reference?.trim() ? payment.reference : 'No reference'}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-300">
                        <div>{payment.invoice.invoiceNumber}</div>
                        <div className="mt-1 text-slate-500">
                          Balance: {formatMinorAmount(payment.invoice.balanceDueMinor)}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-300">{formatMinorAmount(payment.amountMinor)}</td>
                      <td className="px-6 py-5 text-sm text-slate-400">{formatDate(payment.paymentDate)}</td>
                      <td className="px-6 py-5">
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                          {statusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {payment.status === 'POSTED' ? (
                          <Button
                            loading={reverseLoadingId === payment.id}
                            onClick={() => void handleReverse(payment)}
                            variant="secondary"
                          >
                            Reverse
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-500">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </PageSection>
    </AppPage>
  );
}
