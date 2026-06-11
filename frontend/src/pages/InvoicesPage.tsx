import { useEffect, useMemo, useRef, useState } from 'react';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { archiveInvoice, cancelInvoice, createInvoice, issueInvoice, listInvoices } from '../lib/invoices-api';
import { listClients } from '../lib/clients-api';
import { listProjects } from '../lib/projects-api';
import { listServiceItems } from '../lib/service-items-api';
import { useAuth } from '../hooks/useAuth';
import type { ClientRecord } from '../types/client';
import type { ProjectRecord } from '../types/project';
import type { ServiceItemRecord } from '../types/service-item';
import type {
  InvoiceCreateInput,
  InvoiceLineInput,
  InvoiceListItem,
  InvoiceStatus,
} from '../types/invoice';

interface InvoiceFormLineState {
  description: string;
  quantity: string;
  unitPrice: string;
  serviceItemId: string;
}

interface InvoiceFormState {
  issueDate: string;
  dueDate: string;
  clientId: string;
  projectId: string;
  notes: string;
  terms: string;
  lines: InvoiceFormLineState[];
}

function toLocalDateInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function addDays(input: string, days: number): string {
  const date = new Date(`${input}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalDateInputValue(date);
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

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildBlankLine(serviceItemId = ''): InvoiceFormLineState {
  return {
    description: '',
    quantity: '1',
    unitPrice: '',
    serviceItemId,
  };
}

function buildInitialForm(): InvoiceFormState {
  const issueDate = toLocalDateInputValue();
  return {
    issueDate,
    dueDate: addDays(issueDate, 30),
    clientId: '',
    projectId: '',
    notes: '',
    terms: '',
    lines: [buildBlankLine()],
  };
}

function statusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'ISSUED':
      return 'Issued';
    case 'PARTIALLY_PAID':
      return 'Partially paid';
    case 'PAID':
      return 'Paid';
    case 'CANCELLED':
      return 'Cancelled';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return status;
  }
}

function canIssue(status: InvoiceStatus): boolean {
  return status === 'DRAFT';
}

function canCancel(status: InvoiceStatus): boolean {
  return status === 'ISSUED';
}

function canArchive(status: InvoiceStatus): boolean {
  return status === 'DRAFT';
}

function InvoiceLinesEditor({
  lines,
  onAddLine,
  onChangeLine,
  onRemoveLine,
  serviceItems,
}: {
  lines: InvoiceFormLineState[];
  onAddLine: () => void;
  onChangeLine: (index: number, nextLine: InvoiceFormLineState) => void;
  onRemoveLine: (index: number) => void;
  serviceItems: ServiceItemRecord[];
}) {
  return (
    <div className="space-y-4">
      {lines.map((line, index) => (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4" key={`${index}-${line.serviceItemId}`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Service item</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                onChange={(event) => onChangeLine(index, { ...line, serviceItemId: event.target.value })}
                value={line.serviceItemId}
              >
                <option value="">No service item</option>
                {serviceItems.map((serviceItem) => (
                  <option key={serviceItem.id} value={serviceItem.id}>
                    {serviceItem.name} ({formatMinorAmount(serviceItem.unitPriceMinor)})
                  </option>
                ))}
              </select>
            </label>
            <Input
              id={`invoice-line-${index}-description`}
              label="Description"
              maxLength={300}
              onChange={(event) => onChangeLine(index, { ...line, description: event.target.value })}
              required
              value={line.description}
            />
            <Input
              id={`invoice-line-${index}-quantity`}
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
              id={`invoice-line-${index}-unit-price`}
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

export function InvoicesPage() {
  const { activeTenant } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItemRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [issueLoadingId, setIssueLoadingId] = useState<string | null>(null);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [form, setForm] = useState<InvoiceFormState>(() => buildInitialForm());
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  async function loadInvoicesPage(search: string) {
    if (!activeTenant?.id) {
      setInvoices([]);
      setClients([]);
      setProjects([]);
      setServiceItems([]);
      setPageError('No active tenant context is available for invoices.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const [invoiceResult, clientsResult, projectsResult, serviceItemsResult] = await Promise.all([
        listInvoices({ search: search || undefined, limit: 100 }),
        listClients({ limit: 100 }),
        listProjects({ limit: 100 }),
        listServiceItems({ limit: 100 }),
      ]);

      setInvoices(invoiceResult.invoices);
      setClients(clientsResult.clients);
      setProjects(projectsResult.projects);
      setServiceItems(serviceItemsResult.serviceItems);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load invoices');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoicesPage(activeSearch);
  }, [activeTenant?.id, activeSearch]);

  useEffect(() => {
    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  function updateForm(nextForm: InvoiceFormState | ((current: InvoiceFormState) => InvoiceFormState)) {
    setForm(nextForm);
  }

  function updateLine(index: number, nextLine: InvoiceFormLineState) {
    updateForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? nextLine : line)),
    }));
  }

  function addLine() {
    updateForm((current) => ({
      ...current,
      lines: [...current.lines, buildBlankLine()],
    }));
  }

  function removeLine(index: number) {
    updateForm((current) => {
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
    setFormLoading(true);
    setFormError(null);

    try {
      const issueDate = form.issueDate.trim();
      const dueDate = form.dueDate.trim();

      if (!issueDate || !dueDate) {
        throw new Error('Issue date and due date are required.');
      }

      const lines: InvoiceLineInput[] = form.lines.map((line, index) => {
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

      const payload: InvoiceCreateInput = {
        issueDate,
        dueDate,
        clientId: normalizeOptionalValue(form.clientId),
        projectId: normalizeOptionalValue(form.projectId),
        notes: normalizeOptionalValue(form.notes),
        terms: normalizeOptionalValue(form.terms),
        lines,
      };

      await createInvoice(payload);
      setForm(buildInitialForm());
      await loadInvoicesPage(activeSearch);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save invoice');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleIssue(invoice: InvoiceListItem) {
    setIssueLoadingId(invoice.id);
    setPageError(null);

    try {
      await issueInvoice(invoice.id);
      await loadInvoicesPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to issue invoice');
    } finally {
      setIssueLoadingId(null);
    }
  }

  async function handleCancel(invoice: InvoiceListItem) {
    const reason = window.prompt('Optional cancellation reason')?.trim() ?? '';

    setCancelLoadingId(invoice.id);
    setPageError(null);

    try {
      await cancelInvoice(invoice.id, reason ? { reason } : {});
      await loadInvoicesPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to cancel invoice');
    } finally {
      setCancelLoadingId(null);
    }
  }

  async function handleArchive(invoice: InvoiceListItem) {
    const confirmed = window.confirm(`Archive invoice "${invoice.invoiceNumber}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(invoice.id);
    setPageError(null);

    try {
      await archiveInvoice(invoice.id);
      await loadInvoicesPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to archive invoice');
    } finally {
      setArchiveLoadingId(null);
    }
  }

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    'current tenant';

  const selectedClientLabel = useMemo(() => {
    const selectedClient = clients.find((client) => client.id === form.clientId);
    return selectedClient?.name ?? 'No client';
  }, [clients, form.clientId]);

  return (
    <AppPage>
      <PageHeader
        description={`Create and manage invoices for ${tenantLabel}. The UI stays intentionally simple and desktop-only for the launch.`}
        eyebrow="DCA Books Lite"
        title="Invoices"
      />

      <PageSection
        description="Create a simple invoice with dated lines, then issue, cancel, or archive it from the list below."
        title="Create invoice"
      >
        <div ref={formContainerRef}>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Input
                label="Issue date"
                onChange={(event) => setForm((current) => ({ ...current, issueDate: event.target.value }))}
                required
                type="date"
                value={form.issueDate}
              />
              <Input
                label="Due date"
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                required
                type="date"
                value={form.dueDate}
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
            </div>

            <section className="space-y-4 border-t border-slate-800 pt-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-50">Invoice lines</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Use manual line details and optionally link each line to a service item.
                </p>
              </div>
              <InvoiceLinesEditor
                lines={form.lines}
                onAddLine={addLine}
                onChangeLine={updateLine}
                onRemoveLine={removeLine}
                serviceItems={serviceItems}
              />
            </section>

            <section className="space-y-4 border-t border-slate-800 pt-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-50">Invoice notes</h3>
                <p className="mt-1 text-sm text-slate-400">Optional notes and payment terms.</p>
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

            {formError ? (
              <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button loading={formLoading} type="submit">
                Create invoice
              </Button>
              <div className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                Client: {selectedClientLabel}
              </div>
            </div>
          </form>
        </div>
      </PageSection>

      <PageSection
        actions={
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setActiveSearch(searchDraft.trim());
            }}
          >
            <Input
              className="lg:w-80"
              label="Search invoices"
              maxLength={160}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by number, client, project, notes, or terms"
              value={searchDraft}
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {activeSearch ? (
              <Button
                onClick={() => {
                  setSearchDraft('');
                  setActiveSearch('');
                }}
                variant="secondary"
              >
                Clear
              </Button>
            ) : null}
          </form>
        }
        description="Invoice records are tenant-scoped and reflect the current workflow state."
        title="Invoice list"
      >
        {initialLoading ? <LoadingState message="Loading invoices..." /> : null}

        {!initialLoading && pageError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadInvoicesPage(activeSearch)} variant="secondary">
                Retry
              </Button>
            }
            message={pageError}
            title="Unable to load invoices"
          />
        ) : null}

        {!initialLoading && !pageError && invoices.length === 0 ? (
          <EmptyState
            message="No invoices match the current search. Create a new invoice above."
            title="No invoices yet"
          />
        ) : null}

        {!initialLoading && !pageError && invoices.length > 0 ? (
          <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/50">
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-6 py-4 font-medium">Invoice</th>
                    <th className="px-6 py-4 font-medium">Client / project</th>
                    <th className="px-6 py-4 font-medium">Dates</th>
                    <th className="px-6 py-4 font-medium">Total / balance</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invoices.map((invoice) => (
                    <tr className="align-top" key={invoice.id}>
                      <td className="px-6 py-5">
                        <div className="font-medium text-slate-50">{invoice.invoiceNumber}</div>
                        <p className="mt-1 text-sm text-slate-400">
                          {invoice.notes?.trim() ? invoice.notes : 'No notes'}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-300">
                        <div>{invoice.client?.name ?? 'No client'}</div>
                        <div className="mt-1 text-slate-500">{invoice.project?.name ?? 'No project'}</div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-400">
                        <div>Issue: {formatDate(invoice.issueDate)}</div>
                        <div className="mt-1">Due: {formatDate(invoice.dueDate)}</div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-300">
                        <div>Total: {formatMinorAmount(invoice.totalMinor)}</div>
                        <div className="mt-1">Balance: {formatMinorAmount(invoice.balanceDueMinor)}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                          {statusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          {canIssue(invoice.status) ? (
                            <Button loading={issueLoadingId === invoice.id} onClick={() => void handleIssue(invoice)}>
                              Issue
                            </Button>
                          ) : null}
                          {canCancel(invoice.status) ? (
                            <Button
                              loading={cancelLoadingId === invoice.id}
                              onClick={() => void handleCancel(invoice)}
                              variant="secondary"
                            >
                              Cancel
                            </Button>
                          ) : null}
                          {canArchive(invoice.status) ? (
                            <Button
                              loading={archiveLoadingId === invoice.id}
                              onClick={() => void handleArchive(invoice)}
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
        ) : null}
      </PageSection>
    </AppPage>
  );
}
