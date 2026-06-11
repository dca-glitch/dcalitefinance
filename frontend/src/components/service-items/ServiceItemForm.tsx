import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ServiceItemMutationInput, ServiceItemRecord } from '../../types/service-item';

interface ServiceItemFormProps {
  error?: string | null;
  initialServiceItem?: ServiceItemRecord | null;
  loading?: boolean;
  onCancelEdit?: () => void;
  onSubmit: (input: ServiceItemMutationInput) => Promise<void> | void;
}

interface ServiceItemFormState {
  name: string;
  description: string;
  unitPrice: string;
}

function formatMinorAsInput(value: number): string {
  return (value / 100).toFixed(2);
}

function buildInitialState(serviceItem?: ServiceItemRecord | null): ServiceItemFormState {
  return {
    name: serviceItem?.name ?? '',
    description: serviceItem?.description ?? '',
    unitPrice: serviceItem ? formatMinorAsInput(serviceItem.unitPriceMinor) : '',
  };
}

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseUnitPriceMinor(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue) || numericValue < 0) return null;

  return Math.round(numericValue * 100);
}

export function ServiceItemForm({
  error = null,
  initialServiceItem = null,
  loading = false,
  onCancelEdit,
  onSubmit,
}: ServiceItemFormProps) {
  const [form, setForm] = useState<ServiceItemFormState>(() => buildInitialState(initialServiceItem));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialState(initialServiceItem));
    setLocalError(null);
  }, [initialServiceItem]);

  const isEditing = Boolean(initialServiceItem);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const unitPriceMinor = parseUnitPriceMinor(form.unitPrice);
    if (unitPriceMinor === null) {
      setLocalError('Unit price must be a valid amount greater than or equal to 0.');
      return;
    }

    await onSubmit({
      name: form.name.trim(),
      unitPriceMinor,
      description: normalizeOptionalValue(form.description),
    });

    if (!isEditing) {
      setForm(buildInitialState(null));
    }
  }

  const visibleError = localError ?? error;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Input
          label="Name"
          maxLength={160}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
          value={form.name}
        />
        <Input
          inputMode="decimal"
          label="Unit Price"
          min="0"
          onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))}
          placeholder="0.00"
          required
          step="0.01"
          type="number"
          value={form.unitPrice}
        />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">Description</span>
        <textarea
          className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          maxLength={5000}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Optional service item description"
          value={form.description}
        />
      </label>

      {visibleError ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{visibleError}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={loading} type="submit">
          {isEditing ? 'Save service item' : 'Create service item'}
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
