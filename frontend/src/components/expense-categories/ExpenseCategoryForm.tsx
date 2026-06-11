import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ExpenseCategoryMutationInput, ExpenseCategoryRecord } from '../../types/expense-category';

interface ExpenseCategoryFormProps {
  error?: string | null;
  initialCategory?: ExpenseCategoryRecord | null;
  loading?: boolean;
  onCancelEdit?: () => void;
  onSubmit: (input: ExpenseCategoryMutationInput) => Promise<void> | void;
}

interface ExpenseCategoryFormState {
  name: string;
  description: string;
}

function buildInitialState(category?: ExpenseCategoryRecord | null): ExpenseCategoryFormState {
  return {
    name: category?.name ?? '',
    description: category?.description ?? '',
  };
}

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ExpenseCategoryForm({
  error = null,
  initialCategory = null,
  loading = false,
  onCancelEdit,
  onSubmit,
}: ExpenseCategoryFormProps) {
  const [form, setForm] = useState<ExpenseCategoryFormState>(() => buildInitialState(initialCategory));

  useEffect(() => {
    setForm(buildInitialState(initialCategory));
  }, [initialCategory]);

  const isEditing = Boolean(initialCategory);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      name: form.name.trim(),
      description: normalizeOptionalValue(form.description),
    });

    if (!isEditing) {
      setForm(buildInitialState(null));
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Category details</h3>
          <p className="mt-1 text-sm text-slate-400">Keep the expense category naming compact and clear.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Category name"
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
            value={form.name}
          />
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-200">Description</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={5000}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              value={form.description}
            />
          </label>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={loading} type="submit">
          {isEditing ? 'Save category' : 'Create category'}
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
