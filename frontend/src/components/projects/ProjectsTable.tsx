import { Button } from '../ui/Button';
import type { ProjectRecord } from '../../types/project';

interface ProjectsTableProps {
  archiveLoadingId?: string | null;
  editingProjectId?: string | null;
  onArchive: (project: ProjectRecord) => void;
  onEdit: (project: ProjectRecord) => void;
  projects: ProjectRecord[];
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

export function ProjectsTable({
  archiveLoadingId = null,
  editingProjectId = null,
  onArchive,
  onEdit,
  projects,
}: ProjectsTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/50">
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="px-6 py-4 font-medium">Project</th>
              <th className="px-6 py-4 font-medium">Client</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {projects.map((project) => (
              <tr className={editingProjectId === project.id ? 'bg-cyan-400/5 align-top' : 'align-top'} key={project.id}>
                <td className="px-6 py-5">
                  <div className="font-medium text-slate-50">{project.name}</div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{project.client?.name ?? 'No client'}</td>
                <td className="px-6 py-5 text-sm text-slate-400">
                  {project.description?.trim() ? project.description : 'No description'}
                </td>
                <td className="px-6 py-5 text-sm text-slate-400">{formatDate(project.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onEdit(project)} variant="secondary">
                      {editingProjectId === project.id ? 'Editing' : 'Edit'}
                    </Button>
                    <Button
                      loading={archiveLoadingId === project.id}
                      onClick={() => onArchive(project)}
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
