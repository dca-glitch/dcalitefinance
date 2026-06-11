import { Button } from '../ui/Button';
import type { BillRecord, BillStatus } from '../../types/bill';

interface BillsTableProps {
  archiveLoadingId?: string | null;
  editingBillId?: string | null;
  markPaidLoadingId?: string | null;
  onArchive: (bill: BillRecord) => void;
  onEdit: (bill: BillRecord) => void;
  onMarkPaid: (bill: BillRecord) => void;
  onSelectAttachments: (bill: BillRecord) => void;
  onVoid: (bill: BillRecord) => void;
  voidLoadingId?: string | null;
  bills: BillRecord[];
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

function formatMinorAmount(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function statusLabel(status: BillStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'OPEN':
      return 'Open';
    case 'PAID':
      return 'Paid';
    case 'VOID':
      return 'Void';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return status;
  }
}

export function BillsTable({
  archiveLoadingId = null,
  editingBillId = null,
  markPaidLoadingId = null,
  onArchive,
  onEdit,
  onMarkPaid,
  onSelectAttachments,
  onVoid,
  voidLoadingId = null,
  bills,
}: BillsTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/50">
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="px-6 py-4 font-medium">Bill</th>
              <th className="px-6 py-4 font-medium">Vendor / category</th>
              <th className="px-6 py-4 font-medium">Dates</th>
              <th className="px-6 py-4 font-medium">Amount / balance</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {bills.map((bill) => (
              <tr className={`align-top ${editingBillId === bill.id ? 'bg-cyan-400/5' : ''}`} key={bill.id}>
                <td className="px-6 py-5">
                  <div className="font-medium text-slate-50">{bill.billNumber ?? bill.id}</div>
                  <p className="mt-1 text-sm text-slate-400">{bill.paymentReference ?? 'No payment reference'}</p>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">
                  <div>{bill.vendor?.name ?? 'No vendor'}</div>
                  <div className="mt-1 text-slate-500">{bill.category?.name ?? 'No category'}</div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-400">
                  <div>Bill: {formatDate(bill.billDate)}</div>
                  <div className="mt-1">Due: {formatDate(bill.dueDate)}</div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">
                  <div>Amount: {formatMinorAmount(bill.amountMinor)}</div>
                  <div className="mt-1">Balance: {formatMinorAmount(bill.balanceDueMinor)}</div>
                </td>
                <td className="px-6 py-5">
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                    {statusLabel(bill.status)}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onEdit(bill)} variant="secondary">
                      {editingBillId === bill.id ? 'Editing' : 'Edit'}
                    </Button>
                    <Button onClick={() => onSelectAttachments(bill)} variant="secondary">
                      Attachments
                    </Button>
                    {bill.status !== 'PAID' && bill.status !== 'ARCHIVED' ? (
                      <Button loading={markPaidLoadingId === bill.id} onClick={() => onMarkPaid(bill)} variant="secondary">
                        Mark paid
                      </Button>
                    ) : null}
                    {bill.status === 'DRAFT' || bill.status === 'OPEN' ? (
                      <Button loading={voidLoadingId === bill.id} onClick={() => onVoid(bill)} variant="secondary">
                        Void
                      </Button>
                    ) : null}
                    {bill.status !== 'ARCHIVED' ? (
                      <Button
                        loading={archiveLoadingId === bill.id}
                        onClick={() => onArchive(bill)}
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
