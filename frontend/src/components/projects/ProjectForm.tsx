import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ClientRecord } from '../../types/client';
import type { ProjectMutationInput, ProjectRecord } from '../../types/project';

interface ProjectFormProps {
  clients: ClientRecord[];
  error?: string | null;
  initialProject?: ProjectRecord | null;
  loading?: boolean;
  onCancelEdit?: () => void;
  onSubmit: (input: ProjectMutationInput) => Promise<void> | void;
}

interface ProjectFormState {
  name: string;
  description: string;
  clientId: string;
}

function buildInitialState(project?: ProjectRecord | null): ProjectFormState {
  return {
    name: project?.name ?? '',
    description: project?.description ?? '',
    clientId: project?.clientId ?? '',
  };
}

function normalizeOptionalValue(value: string): string | null | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ProjectForm({
  clients,
  error = null,
  initialProject = null,
  loading = false,
  onCancelEdit,
  onSubmit,
}: ProjectFormProps) {
  const [form, setForm] = useState<ProjectFormState>(() => buildInitialState(initialProject));

  useEffect(() => {
    setForm(buildInitialState(initialProject));
  }, [initialProject]);

  const isEditing = Boolean(initialProject);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      name: form.name.trim(),
      description: normalizeOptionalValue(form.description),
      clientId: normalizeOptionalValue(form.clientId),
    });

    if (!isEditing) {
      setForm(buildInitialState(null));
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Input
          label="Project name"
          maxLength={160}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
          value={form.name}
        />
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">Client</span>
          <select
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
            value={form.clientId}
          >
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">Description</span>
        <textarea
          className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          maxLength={5000}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Optional project description"
          value={form.description}
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={loading} type="submit">
          {isEditing ? 'Save project' : 'Create project'}
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
