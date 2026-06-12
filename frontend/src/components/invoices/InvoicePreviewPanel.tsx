import type { ClientRecord } from '../../types/client';
import type { InvoiceDocumentRecord } from '../../types/invoice-document';
import type { InvoiceRecord, InvoiceStatus } from '../../types/invoice';
import type { IssuerProfileRecord } from '../../types/issuer-profile';
import { Button } from '../ui/Button';
import { InvoiceDocumentsPanel } from './InvoiceDocumentsPanel';

interface InvoicePreviewPanelProps {
  invoice: InvoiceRecord;
  issuerProfile: IssuerProfileRecord | null;
  client: ClientRecord | null;
  documents: InvoiceDocumentRecord[];
  error?: string | null;
  documentsLoading?: boolean;
  documentsError?: string | null;
  issueLoading?: boolean;
  generatingLoading?: boolean;
  statusMessage?: string | null;
  onEditDraft: () => Promise<void> | void;
  onConfirmIssue: () => Promise<void> | void;
  onGeneratePdf: () => Promise<void> | void;
  onRefreshDocuments: () => Promise<void> | void;
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

function formatMinorAmount(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'code',
    }).format(value / 100);
  } catch {
    return `${currencyCode} ${(value / 100).toFixed(2)}`;
  }
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: InvoiceStatus): string {
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

export function InvoicePreviewPanel({
  invoice,
  issuerProfile,
  client,
  documents,
  error = null,
  documentsLoading = false,
  documentsError = null,
  issueLoading = false,
  generatingLoading = false,
  statusMessage = null,
  onEditDraft,
  onConfirmIssue,
  onGeneratePdf,
  onRefreshDocuments,
}: InvoicePreviewPanelProps) {
  const currencyCode = issuerProfile?.currencyCode ?? 'USD';
  const hasIssuerProfile = Boolean(issuerProfile);
  const canIssue = invoice.status === 'DRAFT' && hasIssuerProfile;
  const canEdit = invoice.status === 'DRAFT';
  const showDocuments = invoice.status !== 'DRAFT';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-slate-50">
              {invoice.status === 'DRAFT' ? `Draft ${invoice.invoiceNumber}` : invoice.invoiceNumber}
            </h3>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
              {statusLabel(invoice.status)}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Issue date {formatDate(invoice.issueDate)} · Due date {formatDate(invoice.dueDate)}
          </p>
          {invoice.status === 'DRAFT' ? (
            <p className="text-sm text-slate-400">
              Review the draft layout here before confirming issue. The final PDF is generated after issue.
            </p>
          ) : null}
          <p className="text-sm text-slate-400">
            Client: {client?.name ?? invoice.client?.name ?? 'No client'} · Project: {invoice.project?.name ?? 'No project'}
          </p>
          <p className="text-sm text-slate-400">Currency: {currencyCode}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canEdit ? (
            <Button onClick={onEditDraft} type="button" variant="secondary">
              Edit draft
            </Button>
          ) : null}
          {invoice.status === 'DRAFT' ? (
            <Button disabled={!canIssue} loading={issueLoading} onClick={onConfirmIssue} type="button">
              Confirm issue
            </Button>
          ) : null}
        </div>
      </div>

      {!hasIssuerProfile ? (
        <div className="rounded-2xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          Set up Company Settings before issuing invoices.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-2xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
          {statusMessage}
        </div>
      ) : null}

      {!hasIssuerProfile && invoice.status === 'DRAFT' ? (
        <div className="rounded-2xl border border-amber-900 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          Invoice preview is available, but issuing and PDF generation are blocked until company settings are complete.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/60">
        <div className="border-b border-slate-800 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Invoice preview</p>
          <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <h4 className="text-lg font-semibold tracking-tight text-slate-50">
                {issuerProfile?.issuerDisplayName ?? 'Company settings required'}
              </h4>
              <p className="mt-1 text-sm text-slate-400">{issuerProfile?.issuerLegalName ?? 'No legal name set'}</p>
              <p className="mt-2 text-sm text-slate-300">
                {[
                  issuerProfile?.addressLine1,
                  issuerProfile?.addressLine2,
                  issuerProfile?.city,
                  issuerProfile?.state,
                  issuerProfile?.postalCode,
                  issuerProfile?.country,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No address set'}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {issuerProfile?.email ?? 'No email'} · {issuerProfile?.phone ?? 'No phone'} ·{' '}
                {issuerProfile?.website ?? 'No website'}
              </p>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div>Tax ID: {issuerProfile?.taxId ?? 'Not set'}</div>
              <div>Registration: {issuerProfile?.companyRegistrationNumber ?? 'Not set'}</div>
              <div>Payment instructions: {issuerProfile?.defaultPaymentInstructions ?? 'Not set'}</div>
              <div>Invoice footer: {issuerProfile?.invoiceFooter ?? 'Not set'}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bill to</p>
              <div className="mt-2 text-base font-medium text-slate-50">{client?.name ?? invoice.client?.name ?? 'No client'}</div>
              <p className="mt-1 text-sm text-slate-400">
                {[
                  client?.billingAddressLine1,
                  client?.billingAddressLine2,
                  client?.billingCity,
                  client?.billingState,
                  client?.billingPostalCode,
                  client?.billingCountry,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No billing address'}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {client?.email ?? 'No email'} · {client?.phone ?? 'No phone'} · {client?.website ?? 'No website'}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Invoice details</p>
              <div className="mt-2 space-y-1 text-sm text-slate-300">
                <div>Invoice number: {invoice.invoiceNumber}</div>
                <div>Issue date: {formatDate(invoice.issueDate)}</div>
                <div>Due date: {formatDate(invoice.dueDate)}</div>
                <div>Status: {statusLabel(invoice.status)}</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950/60">
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Unit price</th>
                  <th className="px-4 py-3 font-medium">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/30">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-sm text-slate-100">
                      <div>{line.description}</div>
                      {line.serviceItem ? <div className="mt-1 text-xs text-slate-500">{line.serviceItem.name}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{line.quantity}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {formatMinorAmount(line.unitPriceMinor, currencyCode)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {formatMinorAmount(line.lineTotalMinor, currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <span className="font-medium text-slate-100">Notes:</span> {invoice.notes ?? 'No notes'}
              </div>
              <div>
                <span className="font-medium text-slate-100">Terms:</span> {invoice.terms ?? issuerProfile?.defaultInvoiceTerms ?? 'No terms'}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-4">
                <span>Subtotal</span>
                <span>{formatMinorAmount(invoice.subtotalMinor, currencyCode)}</span>
              </div>
              {invoice.taxPercent > 0 ? (
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span>Tax ({formatPercent(invoice.taxPercent)}%)</span>
                  <span>{formatMinorAmount(invoice.taxAmountMinor, currencyCode)}</span>
                </div>
              ) : null}
              {invoice.discountMinor > 0 ? (
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span>Discount</span>
                  <span>{formatMinorAmount(invoice.discountMinor, currencyCode)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between gap-4">
                <span>Total</span>
                <span>{formatMinorAmount(invoice.totalMinor, currencyCode)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span>Paid</span>
                <span>{formatMinorAmount(invoice.paidAmountMinor, currencyCode)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4 font-semibold text-slate-50">
                <span>Balance due</span>
                <span>{formatMinorAmount(invoice.balanceDueMinor, currencyCode)}</span>
              </div>
            </div>
          </div>

          {issuerProfile?.defaultPaymentInstructions ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Payment instructions</p>
              <p className="mt-2 whitespace-pre-wrap">{issuerProfile.defaultPaymentInstructions}</p>
            </div>
          ) : null}

          {issuerProfile?.invoiceFooter ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Invoice footer</p>
              <p className="mt-2 whitespace-pre-wrap">{issuerProfile.invoiceFooter}</p>
            </div>
          ) : null}
        </div>
      </div>

      {showDocuments ? (
        <InvoiceDocumentsPanel
          documents={documents}
          error={documentsError}
          generating={generatingLoading}
          invoice={invoice}
          loading={documentsLoading}
          onGeneratePdf={onGeneratePdf}
          onRefresh={onRefreshDocuments}
        />
      ) : null}
    </div>
  );
}
