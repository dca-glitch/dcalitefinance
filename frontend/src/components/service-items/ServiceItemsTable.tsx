import { Button } from '../ui/Button';
import type { ServiceItemRecord } from '../../types/service-item';

interface ServiceItemsTableProps {
  archiveLoadingId?: string | null;
  editingServiceItemId?: string | null;
  onArchive: (serviceItem: ServiceItemRecord) => void;
  onEdit: (serviceItem: ServiceItemRecord) => void;
  serviceItems: ServiceItemRecord[];
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

export function ServiceItemsTable({
  archiveLoadingId = null,
  editingServiceItemId = null,
  onArchive,
  onEdit,
  serviceItems,
}: ServiceItemsTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/50">
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="px-6 py-4 font-medium">Service item</th>
              <th className="px-6 py-4 font-medium">Unit price</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {serviceItems.map((serviceItem) => (
              <tr
                className={`align-top ${editingServiceItemId === serviceItem.id ? 'bg-cyan-400/5' : ''}`}
                key={serviceItem.id}
              >
                <td className="px-6 py-5">
                  <div className="font-medium text-slate-50">{serviceItem.name}</div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{formatMinorAmount(serviceItem.unitPriceMinor)}</td>
                <td className="px-6 py-5 text-sm text-slate-400">
                  {serviceItem.description?.trim() ? serviceItem.description : 'No description'}
                </td>
                <td className="px-6 py-5 text-sm text-slate-400">{formatDate(serviceItem.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onEdit(serviceItem)} variant="secondary">
                      {editingServiceItemId === serviceItem.id ? 'Editing' : 'Edit'}
                    </Button>
                    <Button
                      loading={archiveLoadingId === serviceItem.id}
                      onClick={() => onArchive(serviceItem)}
                      variant="secondary"
                    >
                      Archive
                    </Button>
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
