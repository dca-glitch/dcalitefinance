import { useEffect, useMemo, useRef, useState } from 'react';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { InvoicePreviewPanel } from '../components/invoices/InvoicePreviewPanel';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { listClients } from '../lib/clients-api';
import { archiveInvoice, cancelInvoice, createInvoice, getInvoice, issueInvoice, listInvoices, updateInvoice } from '../lib/invoices-api';
import { generateInvoicePdf, listInvoiceDocuments } from '../lib/invoice-documents-api';
import { getIssuerProfile } from '../lib/issuer-profile-api';
import { listProjects } from '../lib/projects-api';
import { createServiceItem, listServiceItems } from '../lib/service-items-api';
import { useAuth } from '../hooks/useAuth';
import type { ClientRecord } from '../types/client';
import type { InvoiceDocumentRecord } from '../types/invoice-document';
import type { IssuerProfileRecord } from '../types/issuer-profile';
import type { ProjectRecord } from '../types/project';
import type { ServiceItemRecord } from '../types/service-item';
import type {
  InvoiceCreateInput,
  InvoiceLineInput,
  InvoiceListItem,
  InvoiceRecord,
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
  taxPercent: string;
  discountMinor: string;
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

function parsePercentAmount(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
}

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function calculateInvoiceSummary(form: InvoiceFormState): {
  subtotalMinor: number;
  taxPercent: number;
  taxAmountMinor: number;
  discountMinor: number;
  totalMinor: number;
} {
  const subtotalMinor = form.lines.reduce((sum, line, index) => {
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

    return sum + quantity * unitPriceMinor;
  }, 0);

  const taxInput = form.taxPercent.trim();
  const discountInput = form.discountMinor.trim();
  const taxPercent = taxInput ? parsePercentAmount(taxInput) : 0;
  const discountMinor = discountInput ? parseMinorAmount(discountInput) : 0;

  if (taxInput && taxPercent === null) {
    throw new Error('Tax must be a valid percentage between 0 and 100.');
  }

  if (discountInput && discountMinor === null) {
    throw new Error('Discount must be a valid amount.');
  }

  const resolvedTaxPercent = taxPercent ?? 0;
  const resolvedDiscountMinor = discountMinor ?? 0;
  const taxAmountMinor = Math.round((subtotalMinor * resolvedTaxPercent * 100) / 10_000);
  const totalMinor = subtotalMinor + taxAmountMinor - resolvedDiscountMinor;

  if (totalMinor < 0) {
    throw new Error('Discount cannot exceed the invoice total.');
  }

  return {
    subtotalMinor,
    taxPercent: resolvedTaxPercent,
    taxAmountMinor,
    discountMinor: resolvedDiscountMinor,
    totalMinor,
  };
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
    taxPercent: '',
    discountMinor: '',
    lines: [buildBlankLine()],
  };
}

function buildFormFromInvoice(invoice: InvoiceRecord): InvoiceFormState {
  return {
    issueDate: invoice.issueDate.slice(0, 10),
    dueDate: invoice.dueDate.slice(0, 10),
    clientId: invoice.clientId ?? '',
    projectId: invoice.projectId ?? '',
    notes: invoice.notes ?? '',
    terms: invoice.terms ?? '',
    taxPercent: invoice.taxPercent > 0 ? invoice.taxPercent.toFixed(2) : '',
    discountMinor: invoice.discountMinor > 0 ? (invoice.discountMinor / 100).toFixed(2) : '',
    lines: invoice.lines.length
      ? invoice.lines.map((line) => ({
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPriceMinor / 100),
          serviceItemId: line.serviceItemId ?? '',
        }))
      : [buildBlankLine()],
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

function isDraft(status: InvoiceStatus): boolean {
  return status === 'DRAFT';
}

function isIssued(status: InvoiceStatus): boolean {
  return status === 'ISSUED' || status === 'PARTIALLY_PAID' || status === 'PAID';
}

function InvoiceLinesEditor({
  lines,
  onAddLine,
  onChangeLine,
  onRemoveLine,
  onSelectServiceItem,
  serviceItems,
}: {
  lines: InvoiceFormLineState[];
  onAddLine: () => void;
  onChangeLine: (index: number, nextLine: InvoiceFormLineState) => void;
  onSelectServiceItem: (index: number, serviceItemId: string) => void;
  onRemoveLine: (index: number) => void;
  serviceItems: ServiceItemRecord[];
}) {
  return (
    <div className="space-y-4">
      {lines.map((line, index) => (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4" key={index}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Service item</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                onChange={(event) => onSelectServiceItem(index, event.target.value)}
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
        Add more
      </Button>
    </div>
  );
}

function buildInvoicePayload(form: InvoiceFormState): InvoiceCreateInput {
  const issueDate = form.issueDate.trim();
  const dueDate = form.dueDate.trim();

  if (!issueDate || !dueDate) {
    throw new Error('Issue date and due date are required.');
  }

  const summary = calculateInvoiceSummary(form);
  const lines: InvoiceLineInput[] = form.lines.map((line) => ({
    description: line.description.trim(),
    quantity: Number(line.quantity),
    unitPriceMinor: parseMinorAmount(line.unitPrice) ?? 0,
    serviceItemId: normalizeOptionalValue(line.serviceItemId),
  }));

  return {
    issueDate,
    dueDate,
    clientId: normalizeOptionalValue(form.clientId),
    projectId: normalizeOptionalValue(form.projectId),
    notes: normalizeOptionalValue(form.notes),
    terms: normalizeOptionalValue(form.terms),
    taxPercent: summary.taxPercent,
    discountMinor: summary.discountMinor,
    lines,
  };
}

export function InvoicesPage() {
  const { activeTenant } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItemRecord[]>([]);
  const [issuerProfile, setIssuerProfile] = useState<IssuerProfileRecord | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [issuerProfileLoading, setIssuerProfileLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [serviceItemError, setServiceItemError] = useState<string | null>(null);
  const [serviceItemLoading, setServiceItemLoading] = useState(false);
  const [serviceItemFormOpen, setServiceItemFormOpen] = useState(false);
  const [serviceItemForm, setServiceItemForm] = useState({ name: '', unitPrice: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [issueLoadingId, setIssueLoadingId] = useState<string | null>(null);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null);
  const [documents, setDocuments] = useState<InvoiceDocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [generateLoadingId, setGenerateLoadingId] = useState<string | null>(null);
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
      setIssuerProfile(null);
      setPageError('No active tenant context is available for invoices.');
      setInitialLoading(false);
      setIssuerProfileLoading(false);
      return;
    }

    setPageError(null);

    try {
      const [invoiceResult, clientsResult, projectsResult, serviceItemsResult, issuerProfileResult] = await Promise.all([
        listInvoices({ search: search || undefined, limit: 100 }),
        listClients({ limit: 100 }),
        listProjects({ limit: 100 }),
        listServiceItems({ limit: 100 }),
        getIssuerProfile(),
      ]);

      setInvoices(invoiceResult.invoices);
      setClients(clientsResult.clients);
      setProjects(projectsResult.projects);
      setServiceItems(serviceItemsResult.serviceItems);
      setIssuerProfile(issuerProfileResult);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load invoices');
    } finally {
      setInitialLoading(false);
      setIssuerProfileLoading(false);
    }
  }

  async function loadInvoicePreview(invoiceId: string) {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewMessage(null);
    setDocumentsError(null);

    try {
      const invoice = await getInvoice(invoiceId);
      setPreviewInvoice(invoice);
      setSelectedInvoiceId(invoice.id);

      if (isIssued(invoice.status)) {
        const invoiceDocuments = await listInvoiceDocuments(invoice.id);
        setDocuments(invoiceDocuments);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      setPreviewInvoice(null);
      setDocuments([]);
      setPreviewError(error instanceof Error ? error.message : 'Failed to load invoice preview');
    } finally {
      setPreviewLoading(false);
      setDocumentsLoading(false);
    }
  }

  async function loadInvoiceDocuments(invoiceId: string) {
    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      const result = await listInvoiceDocuments(invoiceId);
      setDocuments(result);
    } catch (error) {
      setDocuments([]);
      setDocumentsError(error instanceof Error ? error.message : 'Failed to load invoice documents');
    } finally {
      setDocumentsLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoicesPage(activeSearch);
  }, [activeTenant?.id, activeSearch]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  function updateLine(index: number, nextLine: InvoiceFormLineState) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? nextLine : line)),
    }));
  }

  function selectServiceItem(index: number, serviceItemId: string) {
    const selectedServiceItem = serviceItems.find((serviceItem) => serviceItem.id === serviceItemId) ?? null;

    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              serviceItemId,
              unitPrice: selectedServiceItem ? (selectedServiceItem.unitPriceMinor / 100).toFixed(2) : line.unitPrice,
            }
          : line,
      ),
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

  async function handleCreateServiceItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServiceItemLoading(true);
    setServiceItemError(null);

    try {
      const unitPriceMinor = parseMinorAmount(serviceItemForm.unitPrice);
      if (!serviceItemForm.name.trim()) {
        throw new Error('Service item name is required.');
      }

      if (unitPriceMinor === null) {
        throw new Error('Service item unit price must be a valid number.');
      }

      const createdServiceItem = await createServiceItem({
        name: serviceItemForm.name.trim(),
        unitPriceMinor,
      });

      setServiceItems((current) =>
        [...current, createdServiceItem].sort((left, right) => left.name.localeCompare(right.name)),
      );
      setServiceItemForm({ name: '', unitPrice: '' });
      setServiceItemFormOpen(false);

      setForm((current) => {
        if (current.lines.length !== 1 || current.lines[0].serviceItemId) {
          return current;
        }

        return {
          ...current,
          lines: [
            {
              ...current.lines[0],
              serviceItemId: createdServiceItem.id,
              unitPrice: (createdServiceItem.unitPriceMinor / 100).toFixed(2),
            },
          ],
        };
      });
    } catch (error) {
      setServiceItemError(error instanceof Error ? error.message : 'Unable to create service item');
    } finally {
      setServiceItemLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const payload = buildInvoicePayload(form);

      if (editingInvoiceId) {
        const updatedInvoice = await updateInvoice(editingInvoiceId, payload);
        setPreviewInvoice(updatedInvoice);
        setSelectedInvoiceId(updatedInvoice.id);
        setPreviewMessage('Draft invoice updated.');
        setEditingInvoiceId(null);
        setForm(buildInitialForm());
        await loadInvoicesPage(activeSearch);
        return;
      }

      const createdInvoice = await createInvoice(payload);
      setSelectedInvoiceId(createdInvoice.id);
      setForm(buildInitialForm());
      await loadInvoicesPage(activeSearch);
      await loadInvoicePreview(createdInvoice.id);
      setPreviewMessage('Draft invoice created. Review it before issuing.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save invoice');
    } finally {
      setFormLoading(false);
    }
  }

  async function handlePreview(invoice: InvoiceListItem) {
    setSelectedInvoiceId(invoice.id);
    await loadInvoicePreview(invoice.id);
  }

  async function handleStartEdit(invoiceId: string) {
    setPreviewError(null);
    setPreviewMessage(null);

    try {
      const invoice = previewInvoice?.id === invoiceId ? previewInvoice : await getInvoice(invoiceId);
      if (invoice.status !== 'DRAFT') {
        setFormError('Only draft invoices can be edited.');
        return;
      }

      setEditingInvoiceId(invoice.id);
      setSelectedInvoiceId(invoice.id);
      setPreviewInvoice(invoice);
      setDocuments([]);
      setDocumentsError(null);
      setForm(buildFormFromInvoice(invoice));
      setFormError(null);
      formContainerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to load invoice for editing');
    }
  }

  async function handleConfirmIssue(invoiceId: string) {
    if (!issuerProfile) {
      setPreviewError('Set up Company Settings before issuing invoices.');
      return;
    }

    const currentPreview = previewInvoice?.id === invoiceId ? previewInvoice : null;
    if (currentPreview && !isDraft(currentPreview.status)) {
      setPreviewError('Invoice can only be issued while draft.');
      return;
    }

    setIssueLoadingId(invoiceId);
    setPreviewError(null);
    setPreviewMessage(null);

    try {
      const issuedInvoice = await issueInvoice(invoiceId);
      setPreviewInvoice(issuedInvoice);
      setSelectedInvoiceId(issuedInvoice.id);
      await generateInvoicePdf(invoiceId);
      await loadInvoicesPage(activeSearch);
      await loadInvoicePreview(invoiceId);
      setPreviewMessage('Invoice issued and PDF generated.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to issue invoice';
      if (message.includes('Issuer profile is required before generating invoice PDFs')) {
        setPreviewError('Set up Company Settings before issuing invoices.');
      } else if (message.includes('Invoice can only be issued while draft')) {
        setPreviewError('Invoice can only be issued while draft.');
      } else {
        setPreviewError(message);
      }
    } finally {
      setIssueLoadingId(null);
    }
  }

  async function handleGeneratePdf(invoice: InvoiceRecord) {
    setGenerateLoadingId(invoice.id);
    setDocumentsError(null);

    try {
      await generateInvoicePdf(invoice.id);
      await loadInvoicePreview(invoice.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate invoice PDF';
      if (message.includes('Issuer profile is required before generating invoice PDFs')) {
        setDocumentsError('Set up Company Settings before generating invoice PDFs.');
      } else {
        setDocumentsError(message);
      }
    } finally {
      setGenerateLoadingId(null);
    }
  }

  async function handleCancel(invoice: InvoiceListItem) {
    const reason = window.prompt('Optional cancellation reason')?.trim() ?? '';

    setCancelLoadingId(invoice.id);
    setPageError(null);

    try {
      await cancelInvoice(invoice.id, reason ? { reason } : {});
      if (selectedInvoiceId === invoice.id || previewInvoice?.id === invoice.id) {
        setSelectedInvoiceId(null);
        setPreviewInvoice(null);
        setDocuments([]);
        setDocumentsError(null);
        setPreviewError(null);
        setPreviewMessage(null);
      }
      await loadInvoicesPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to cancel invoice');
    } finally {
      setCancelLoadingId(null);
    }
  }

  async function handleArchive(invoice: InvoiceListItem) {
    const confirmed = window.confirm(`Delete draft invoice "${invoice.invoiceNumber}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(invoice.id);
    setPageError(null);

    try {
      await archiveInvoice(invoice.id);
      if (selectedInvoiceId === invoice.id || previewInvoice?.id === invoice.id) {
        setSelectedInvoiceId(null);
        setPreviewInvoice(null);
        setDocuments([]);
        setDocumentsError(null);
        setPreviewError(null);
        setPreviewMessage(null);
      }
      if (editingInvoiceId === invoice.id) {
        setEditingInvoiceId(null);
        setForm(buildInitialForm());
      }
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

  const previewClient = useMemo(() => {
    if (!previewInvoice?.clientId) {
      return null;
    }

    return clients.find((client) => client.id === previewInvoice.clientId) ?? null;
  }, [clients, previewInvoice?.clientId]);

  const invoiceSummary = useMemo(() => {
    try {
      return calculateInvoiceSummary(form);
    } catch {
      return null;
    }
  }, [form]);

  return (
    <AppPage>
      <PageHeader
        description={`Create draft invoices for ${tenantLabel}, preview them before issuing, then generate the final PDF after confirmation.`}
        eyebrow="DCA Books Lite"
        title="Invoices"
      />

      <PageSection
        description="Create or edit a draft invoice, then preview it before final issue."
        title={editingInvoiceId ? 'Edit draft invoice' : 'Create invoice'}
      >
        {editingInvoiceId ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            <span>Editing a draft invoice. Save changes or cancel edit to create a new invoice.</span>
            <Button
              onClick={() => {
                setEditingInvoiceId(null);
                setForm(buildInitialForm());
                setFormError(null);
              }}
              type="button"
              variant="secondary"
            >
              Cancel edit
            </Button>
          </div>
        ) : null}

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
                  Use manual line details and optionally link each line to a service item. Add new catalog items without
                  leaving the invoice screen.
                </p>
              </div>
              <InvoiceLinesEditor
                lines={form.lines}
                onAddLine={addLine}
                onChangeLine={updateLine}
                onRemoveLine={removeLine}
                onSelectServiceItem={selectServiceItem}
                serviceItems={serviceItems}
              />
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold tracking-tight text-slate-50">Add new service item</h4>
                    <p className="mt-1 text-sm text-slate-400">Create the catalog item now and use it immediately in the invoice form.</p>
                  </div>
                  <Button
                    onClick={() => {
                      setServiceItemFormOpen((current) => !current);
                      setServiceItemError(null);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    {serviceItemFormOpen ? 'Hide' : 'Add new service item'}
                  </Button>
                </div>
                {serviceItemFormOpen ? (
                  <form className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px_auto]" onSubmit={handleCreateServiceItem}>
                    <Input
                      label="Service item name"
                      maxLength={160}
                      onChange={(event) => setServiceItemForm((current) => ({ ...current, name: event.target.value }))}
                      required
                      value={serviceItemForm.name}
                    />
                    <Input
                      inputMode="decimal"
                      label="Unit price"
                      min="0"
                      onChange={(event) => setServiceItemForm((current) => ({ ...current, unitPrice: event.target.value }))}
                      placeholder="0.00"
                      required
                      step="0.01"
                      type="number"
                      value={serviceItemForm.unitPrice}
                    />
                    <div className="flex items-end">
                      <Button loading={serviceItemLoading} type="submit">
                        Save item
                      </Button>
                    </div>
                  </form>
                ) : null}
                {serviceItemError ? (
                  <div className="mt-4 rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                    {serviceItemError}
                  </div>
                ) : null}
                <p className="mt-4 text-sm text-slate-400">New items are added to the service item list for this tenant.</p>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-800 pt-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-50">Tax and discount</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Tax is calculated from the subtotal. Discount is applied after tax and before the final total.
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                  Amounts use {issuerProfile?.currencyCode ?? 'USD'}
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Input
                  inputMode="decimal"
                  label="Tax (%)"
                  max="100"
                  min="0"
                  onChange={(event) => setForm((current) => ({ ...current, taxPercent: event.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={form.taxPercent}
                />
                <Input
                  inputMode="decimal"
                  label="Discount amount"
                  min="0"
                  onChange={(event) => setForm((current) => ({ ...current, discountMinor: event.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={form.discountMinor}
                />
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4 lg:col-span-2">
                  {invoiceSummary ? (
                    <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Subtotal</div>
                        <div className="mt-2 text-base font-medium text-slate-50">{formatMinorAmount(invoiceSummary.subtotalMinor)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Tax</div>
                        <div className="mt-2 text-base font-medium text-slate-50">
                          {formatMinorAmount(invoiceSummary.taxAmountMinor)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Discount</div>
                        <div className="mt-2 text-base font-medium text-slate-50">
                          {formatMinorAmount(invoiceSummary.discountMinor)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-100">Total</div>
                        <div className="mt-2 text-base font-semibold text-cyan-50">
                          {formatMinorAmount(invoiceSummary.totalMinor)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">Complete valid line items to preview totals.</div>
                  )}
                </div>
              </div>
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
                {editingInvoiceId ? 'Save draft changes' : 'Create invoice'}
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
        {initialLoading || issuerProfileLoading ? <LoadingState message="Loading invoices..." /> : null}

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
                        <p className="mt-1 text-sm text-slate-400">{invoice.notes?.trim() ? invoice.notes : 'No notes'}</p>
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
                          <Button
                            onClick={() => void handlePreview(invoice)}
                            variant={selectedInvoiceId === invoice.id ? 'primary' : 'secondary'}
                          >
                            Preview
                          </Button>
                          {isDraft(invoice.status) ? (
                            <Button onClick={() => void handleStartEdit(invoice.id)} variant="secondary">
                              Edit
                            </Button>
                          ) : null}
                          {invoice.status === 'ISSUED' ? (
                            <Button loading={cancelLoadingId === invoice.id} onClick={() => void handleCancel(invoice)} variant="secondary">
                              Cancel
                            </Button>
                          ) : null}
                          {isDraft(invoice.status) ? (
                            <Button loading={archiveLoadingId === invoice.id} onClick={() => void handleArchive(invoice)} variant="secondary">
                              Delete draft
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

      {previewLoading && !previewInvoice ? <LoadingState message="Loading invoice preview..." /> : null}

      {previewInvoice ? (
        <PageSection
          description="Preview the invoice before final issue. Issued invoices show the final PDF document links below."
          title={`Invoice preview - ${previewInvoice.invoiceNumber}`}
        >
          <InvoicePreviewPanel
            client={previewClient}
            documents={documents}
            documentsError={documentsError}
            documentsLoading={documentsLoading}
            error={previewError}
            generatingLoading={generateLoadingId === previewInvoice.id}
            issueLoading={issueLoadingId === previewInvoice.id}
            invoice={previewInvoice}
            issuerProfile={issuerProfile}
            onConfirmIssue={() => void handleConfirmIssue(previewInvoice.id)}
            onEditDraft={() => void handleStartEdit(previewInvoice.id)}
            onGeneratePdf={() => void handleGeneratePdf(previewInvoice)}
            onRefreshDocuments={() => void loadInvoiceDocuments(previewInvoice.id)}
            statusMessage={previewMessage}
          />
        </PageSection>
      ) : null}
    </AppPage>
  );
}
