import { Button } from '../ui/Button';
import type { ClientRecord } from '../../types/client';

interface ClientsTableProps {
  archiveLoadingId?: string | null;
  clients: ClientRecord[];
  editingClientId?: string | null;
  onArchive: (client: ClientRecord) => void;
  onEdit: (client: ClientRecord) => void;
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

function statusLabel(status: ClientRecord['status']): string {
  if (status === 'INACTIVE') {
    return 'Inactive';
  }

  if (status === 'ARCHIVED') {
    return 'Archived';
  }

  return 'Active';
}

export function ClientsTable({ archiveLoadingId = null, clients, editingClientId = null, onArchive, onEdit }: ClientsTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/50">
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="px-6 py-4 font-medium">Client</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Phone</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {clients.map((client) => (
              <tr
                className={`align-top ${editingClientId === client.id ? 'bg-cyan-400/5' : ''}`}
                key={client.id}
              >
                <td className="px-6 py-5">
                  <div className="font-medium text-slate-50">{client.name}</div>
                  {client.website ? (
                    <a
                      className="mt-1 block text-sm text-cyan-300 hover:text-cyan-200"
                      href={client.website}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {client.website}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">No website</p>
                  )}
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{client.email ?? 'No email'}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{client.phone ?? 'No phone'}</td>
                <td className="px-6 py-5">
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                    {statusLabel(client.status)}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-slate-400">{formatDate(client.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onEdit(client)} variant="secondary">
                      {editingClientId === client.id ? 'Editing' : 'Edit'}
                    </Button>
                    <Button
                      loading={archiveLoadingId === client.id}
                      onClick={() => onArchive(client)}
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
