import { Button } from '../ui/Button';
import type { RecurringInvoiceListItem, RecurringInvoiceStatus } from '../../types/recurring-invoice';

interface RecurringInvoicesTableProps {
  archiveLoadingId?: string | null;
  editLoadingId?: string | null;
  generateLoadingId?: string | null;
  onArchive: (recurringInvoice: RecurringInvoiceListItem) => void;
  onEdit: (recurringInvoice: RecurringInvoiceListItem) => void;
  onGenerateNow: (recurringInvoice: RecurringInvoiceListItem) => void;
  onPause: (recurringInvoice: RecurringInvoiceListItem) => void;
  onResume: (recurringInvoice: RecurringInvoiceListItem) => void;
  pauseLoadingId?: string | null;
  resumeLoadingId?: string | null;
  recurringInvoices: RecurringInvoiceListItem[];
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'No date';
  }

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

function statusLabel(status: RecurringInvoiceStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'PAUSED':
      return 'Paused';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return status;
  }
}

function frequencyLabel(value: RecurringInvoiceListItem['frequency']): string {
  switch (value) {
    case 'MONTHLY':
      return 'Monthly';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'YEARLY':
      return 'Yearly';
    default:
      return value;
  }
}

export function RecurringInvoicesTable({
  archiveLoadingId = null,
  editLoadingId = null,
  generateLoadingId = null,
  onArchive,
  onEdit,
  onGenerateNow,
  onPause,
  onResume,
  pauseLoadingId = null,
  resumeLoadingId = null,
  recurringInvoices,
}: RecurringInvoicesTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/50">
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="px-6 py-4 font-medium">Recurring invoice</th>
              <th className="px-6 py-4 font-medium">Client / project</th>
              <th className="px-6 py-4 font-medium">Schedule</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {recurringInvoices.map((recurringInvoice) => (
              <tr className={`align-top ${editLoadingId === recurringInvoice.id ? 'bg-cyan-400/5' : ''}`} key={recurringInvoice.id}>
                <td className="px-6 py-5">
                  <div className="font-medium text-slate-50">
                    {frequencyLabel(recurringInvoice.frequency)} recurring invoice
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {recurringInvoice.notes?.trim() ? recurringInvoice.notes : 'No notes'}
                  </p>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">
                  <div>{recurringInvoice.client?.name ?? 'No client'}</div>
                  <div className="mt-1 text-slate-500">{recurringInvoice.project?.name ?? 'No project'}</div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-400">
                  <div>Start: {formatDate(recurringInvoice.startDate)}</div>
                  <div className="mt-1">Next: {formatDate(recurringInvoice.nextRunDate)}</div>
                  <div className="mt-1">Last: {formatDate(recurringInvoice.lastRunDate)}</div>
                </td>
                <td className="px-6 py-5">
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                    {statusLabel(recurringInvoice.status)}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    {recurringInvoice.status !== 'ARCHIVED' ? (
                      <Button loading={editLoadingId === recurringInvoice.id} onClick={() => onEdit(recurringInvoice)} variant="secondary">
                        Edit
                      </Button>
                    ) : null}
                    {recurringInvoice.status === 'ACTIVE' ? (
                      <Button
                        loading={pauseLoadingId === recurringInvoice.id}
                        onClick={() => onPause(recurringInvoice)}
                        variant="secondary"
                      >
                        Pause
                      </Button>
                    ) : null}
                    {recurringInvoice.status === 'PAUSED' ? (
                      <Button
                        loading={resumeLoadingId === recurringInvoice.id}
                        onClick={() => onResume(recurringInvoice)}
                        variant="secondary"
                      >
                        Resume
                      </Button>
                    ) : null}
                    {recurringInvoice.status !== 'ARCHIVED' ? (
                      <Button
                        loading={generateLoadingId === recurringInvoice.id}
                        onClick={() => onGenerateNow(recurringInvoice)}
                        variant="secondary"
                      >
                        Generate now
                      </Button>
                    ) : null}
                    {recurringInvoice.status !== 'ARCHIVED' ? (
                      <Button
                        loading={archiveLoadingId === recurringInvoice.id}
                        onClick={() => onArchive(recurringInvoice)}
                        variant="secondary"
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
