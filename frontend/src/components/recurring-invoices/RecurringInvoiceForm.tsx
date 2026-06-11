import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ClientRecord } from '../../types/client';
import type { ProjectRecord } from '../../types/project';
import type { ServiceItemRecord } from '../../types/service-item';
import type {
  RecurringInvoiceFrequency,
  RecurringInvoiceLineInput,
  RecurringInvoiceMutationInput,
  RecurringInvoiceRecord,
  RecurringInvoiceStatus,
} from '../../types/recurring-invoice';

interface RecurringInvoiceFormProps {
  clients: ClientRecord[];
  error?: string | null;
  initialRecurringInvoice?: RecurringInvoiceRecord | null;
  loading?: boolean;
  onCancelEdit?: () => void;
  onSubmit: (input: RecurringInvoiceMutationInput) => Promise<void> | void;
  projects: ProjectRecord[];
  serviceItems: ServiceItemRecord[];
}

interface RecurringInvoiceFormLineState {
  description: string;
  quantity: string;
  unitPrice: string;
  serviceItemId: string;
}

interface RecurringInvoiceFormState {
  clientId: string;
  projectId: string;
  status: Exclude<RecurringInvoiceStatus, 'ARCHIVED'>;
  frequency: RecurringInvoiceFrequency;
  startDate: string;
  endDate: string;
  nextRunDate: string;
  notes: string;
  terms: string;
  lines: RecurringInvoiceFormLineState[];
}

function toLocalDateInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function toDateInputValue(value?: string | null): string {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function buildBlankLine(serviceItemId = ''): RecurringInvoiceFormLineState {
  return {
    description: '',
    quantity: '1',
    unitPrice: '',
    serviceItemId,
  };
}

function buildInitialState(recurringInvoice?: RecurringInvoiceRecord | null): RecurringInvoiceFormState {
  return {
    clientId: recurringInvoice?.clientId ?? '',
    projectId: recurringInvoice?.projectId ?? '',
    status: recurringInvoice?.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
    frequency: recurringInvoice?.frequency ?? 'MONTHLY',
    startDate: toDateInputValue(recurringInvoice?.startDate) || toLocalDateInputValue(),
    endDate: toDateInputValue(recurringInvoice?.endDate),
    nextRunDate: toDateInputValue(recurringInvoice?.nextRunDate) || toLocalDateInputValue(),
    notes: recurringInvoice?.notes ?? '',
    terms: recurringInvoice?.terms ?? '',
    lines:
      recurringInvoice?.lines.length
        ? recurringInvoice.lines.map((line) => ({
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: (line.unitPriceMinor / 100).toFixed(2),
            serviceItemId: line.serviceItemId ?? '',
          }))
        : [buildBlankLine()],
  };
}

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMinorAmount(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function RecurringInvoiceLinesEditor({
  lines,
  onAddLine,
  onChangeLine,
  onRemoveLine,
  serviceItems,
}: {
  lines: RecurringInvoiceFormLineState[];
  onAddLine: () => void;
  onChangeLine: (index: number, nextLine: RecurringInvoiceFormLineState) => void;
  onRemoveLine: (index: number) => void;
  serviceItems: ServiceItemRecord[];
}) {
  return (
    <div className="space-y-4">
      {lines.map((line, index) => (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4" key={`${index}-${line.serviceItemId}`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block lg:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-200">Description</span>
              <input
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                maxLength={300}
                onChange={(event) => onChangeLine(index, { ...line, description: event.target.value })}
                required
                value={line.description}
              />
            </label>
            <Input
              inputMode="numeric"
              label="Quantity"
              min="1"
              onChange={(event) => onChangeLine(index, { ...line, quantity: event.target.value })}
              required
              step="1"
              type="number"
              value={line.quantity}
            />
            <Input
              inputMode="decimal"
              label="Unit price"
              min="0"
              onChange={(event) => onChangeLine(index, { ...line, unitPrice: event.target.value })}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={line.unitPrice}
            />
            <label className="block lg:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-200">Service item</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                onChange={(event) => onChangeLine(index, { ...line, serviceItemId: event.target.value })}
                value={line.serviceItemId}
              >
                <option value="">No service item</option>
                {serviceItems.map((serviceItem) => (
                  <option key={serviceItem.id} value={serviceItem.id}>
                    {serviceItem.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={lines.length === 1} onClick={() => onRemoveLine(index)} type="button" variant="secondary">
              Remove line
            </Button>
          </div>
        </div>
      ))}

      <Button onClick={onAddLine} type="button" variant="secondary">
        Add line
      </Button>
    </div>
  );
}

export function RecurringInvoiceForm({
  clients,
  error = null,
  initialRecurringInvoice = null,
  loading = false,
  onCancelEdit,
  onSubmit,
  projects,
  serviceItems,
}: RecurringInvoiceFormProps) {
  const [form, setForm] = useState<RecurringInvoiceFormState>(() => buildInitialState(initialRecurringInvoice));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialState(initialRecurringInvoice));
    setLocalError(null);
  }, [initialRecurringInvoice]);

  const isEditing = Boolean(initialRecurringInvoice);

  const selectedClientLabel = useMemo(() => {
    const selectedClient = clients.find((client) => client.id === form.clientId);
    return selectedClient?.name ?? 'No client';
  }, [clients, form.clientId]);

  const selectedProjectLabel = useMemo(() => {
    const selectedProject = projects.find((project) => project.id === form.projectId);
    return selectedProject?.name ?? 'No project';
  }, [form.projectId, projects]);

  function updateLine(index: number, nextLine: RecurringInvoiceFormLineState) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? nextLine : line)),
    }));
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, buildBlankLine()],
    }));
  }

  function removeLine(index: number) {
    setForm((current) => {
      if (current.lines.length === 1) {
        return current;
      }

      return {
        ...current,
        lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    try {
      const startDate = form.startDate.trim();
      const nextRunDate = form.nextRunDate.trim();

      if (!startDate) {
        setLocalError('Start date is required.');
        return;
      }

      if (!nextRunDate) {
        setLocalError('Next run date is required.');
        return;
      }

      const lines: RecurringInvoiceLineInput[] = form.lines.map((line, index) => {
        const description = line.description.trim();
        const quantity = Number(line.quantity);
        const unitPriceMinor = parseMinorAmount(line.unitPrice);

        if (!description) {
          throw new Error(`Line ${index + 1} requires a description.`);
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new Error(`Line ${index + 1} requires a quantity of at least 1.`);
        }

        if (unitPriceMinor === null) {
          throw new Error(`Line ${index + 1} requires a valid unit price.`);
        }

        return {
          description,
          quantity,
          unitPriceMinor,
          serviceItemId: normalizeOptionalValue(line.serviceItemId),
        };
      });

      await onSubmit({
        clientId: normalizeOptionalValue(form.clientId),
        projectId: normalizeOptionalValue(form.projectId),
        status: form.status,
        frequency: form.frequency,
        startDate,
        endDate: normalizeOptionalValue(form.endDate),
        nextRunDate,
        notes: normalizeOptionalValue(form.notes),
        terms: normalizeOptionalValue(form.terms),
        lines,
      });

      if (!isEditing) {
        setForm(buildInitialState(null));
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to save recurring invoice');
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Schedule details</h3>
          <p className="mt-1 text-sm text-slate-400">Set the recurring invoice cadence and tenant-scoped references.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
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
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Project</span>
            <select
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
              value={form.projectId}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Frequency</span>
            <select
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  frequency: event.target.value as RecurringInvoiceFrequency,
                }))
              }
              value={form.frequency}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Status</span>
            <select
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
                }))
              }
              value={form.status}
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
            </select>
          </label>
          <Input
            label="Start date"
            onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            required
            type="date"
            value={form.startDate}
          />
          <Input
            label="Next run date"
            onChange={(event) => setForm((current) => ({ ...current, nextRunDate: event.target.value }))}
            required
            type="date"
            value={form.nextRunDate}
          />
          <Input
            label="End date"
            onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            type="date"
            value={form.endDate}
          />
          <div className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            Client: {selectedClientLabel} | Project: {selectedProjectLabel}
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-800 pt-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Recurring lines</h3>
          <p className="mt-1 text-sm text-slate-400">Use decimal prices. The backend stores unit prices in minor units.</p>
        </div>
        <RecurringInvoiceLinesEditor
          lines={form.lines}
          onAddLine={addLine}
          onChangeLine={updateLine}
          onRemoveLine={removeLine}
          serviceItems={serviceItems}
        />
      </section>

      <section className="space-y-4 border-t border-slate-800 pt-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Notes and terms</h3>
          <p className="mt-1 text-sm text-slate-400">Optional notes and terms for the recurring invoice schedule.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Notes</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={5000}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              value={form.notes}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Terms</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={5000}
              onChange={(event) => setForm((current) => ({ ...current, terms: event.target.value }))}
              value={form.terms}
            />
          </label>
        </div>
      </section>

      {localError || error ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {localError ?? error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={loading} type="submit">
          {isEditing ? 'Save recurring invoice' : 'Create recurring invoice'}
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
