import { Button } from '../ui/Button';
import type { InvoiceListItem } from '../../types/invoice';
import type { InvoiceDocumentRecord } from '../../types/invoice-document';

interface InvoiceDocumentsPanelProps {
  invoice: InvoiceListItem;
  documents: InvoiceDocumentRecord[];
  error?: string | null;
  loading?: boolean;
  generating?: boolean;
  onGeneratePdf: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
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

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getOpenLink(document: InvoiceDocumentRecord): string | null {
  return document.documentLink ?? document.webViewLink ?? document.webContentLink ?? null;
}

function statusLabel(status: InvoiceListItem['status']): string {
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

export function InvoiceDocumentsPanel({
  invoice,
  documents,
  error = null,
  loading = false,
  generating = false,
  onGeneratePdf,
  onRefresh,
}: InvoiceDocumentsPanelProps) {
  const canGeneratePdf = invoice.status === 'ISSUED';

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-slate-50">{invoice.invoiceNumber}</h3>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
              {statusLabel(invoice.status)}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Issue date {formatDate(invoice.issueDate)} · Due date {formatDate(invoice.dueDate)}
          </p>
          <p className="text-sm text-slate-400">
            Client: {invoice.client?.name ?? 'No client'} · Project: {invoice.project?.name ?? 'No project'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!canGeneratePdf} loading={generating} onClick={onGeneratePdf} type="button">
            Generate PDF
          </Button>
          <Button loading={loading} onClick={onRefresh} type="button" variant="secondary">
            Refresh
          </Button>
        </div>
      </div>

      {!canGeneratePdf ? (
        <div className="rounded-2xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          Issue this invoice before generating a PDF document.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-slate-400">
          No invoice documents have been generated yet. Use the button above after issuing the invoice.
        </p>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => {
            const openLink = getOpenLink(document);

            return (
              <div
                className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                key={document.id}
              >
                <div className="space-y-1">
                  <div className="font-medium text-slate-50">{document.originalFilename}</div>
                  <div className="text-sm text-slate-400">
                    {document.mimeType} · {formatFileSize(document.sizeBytes)} · {document.storageProvider} ·{' '}
                    {formatDate(document.createdAt)}
                  </div>
                </div>
                {openLink ? (
                  <a
                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
                    href={openLink}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    Open document
                  </a>
                ) : (
                  <span className="text-sm text-slate-500">No external document link available</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
