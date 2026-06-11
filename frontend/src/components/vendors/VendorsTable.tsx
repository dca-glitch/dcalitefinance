import { Button } from '../ui/Button';
import type { VendorRecord } from '../../types/vendor';

interface VendorsTableProps {
  archiveLoadingId?: string | null;
  editingVendorId?: string | null;
  onArchive: (vendor: VendorRecord) => void;
  onEdit: (vendor: VendorRecord) => void;
  vendors: VendorRecord[];
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

export function VendorsTable({ archiveLoadingId = null, editingVendorId = null, onArchive, onEdit, vendors }: VendorsTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/50">
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="px-6 py-4 font-medium">Vendor</th>
              <th className="px-6 py-4 font-medium">Contact</th>
              <th className="px-6 py-4 font-medium">Billing / tax</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {vendors.map((vendor) => (
              <tr className={`align-top ${editingVendorId === vendor.id ? 'bg-cyan-400/5' : ''}`} key={vendor.id}>
                <td className="px-6 py-5">
                  <div className="font-medium text-slate-50">{vendor.name}</div>
                  {vendor.website ? (
                    <a
                      className="mt-1 block text-sm text-cyan-300 hover:text-cyan-200"
                      href={vendor.website}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {vendor.website}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">No website</p>
                  )}
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">
                  <div>{vendor.email ?? 'No email'}</div>
                  <div className="mt-1 text-slate-500">{vendor.phone ?? 'No phone'}</div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">
                  <div>{vendor.taxId ?? 'No tax ID'}</div>
                  <div className="mt-1 text-slate-500">{vendor.billingCountry ?? 'No country'}</div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-400">{formatDate(vendor.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onEdit(vendor)} variant="secondary">
                      {editingVendorId === vendor.id ? 'Editing' : 'Edit'}
                    </Button>
                    <Button
                      loading={archiveLoadingId === vendor.id}
                      onClick={() => onArchive(vendor)}
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
