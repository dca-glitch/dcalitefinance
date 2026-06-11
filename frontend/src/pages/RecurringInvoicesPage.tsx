import { useEffect, useMemo, useRef, useState } from 'react';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { listClients } from '../lib/clients-api';
import { listProjects } from '../lib/projects-api';
import { listServiceItems } from '../lib/service-items-api';
import {
  archiveRecurringInvoice,
  createRecurringInvoice,
  generateRecurringInvoiceNow,
  getRecurringInvoice,
  listRecurringInvoices,
  pauseRecurringInvoice,
  resumeRecurringInvoice,
  updateRecurringInvoice,
} from '../lib/recurring-invoices-api';
import type { ClientRecord } from '../types/client';
import type { ProjectRecord } from '../types/project';
import type { ServiceItemRecord } from '../types/service-item';
import type {
  RecurringInvoiceGenerateData,
  RecurringInvoiceListItem,
  RecurringInvoiceMutationInput,
  RecurringInvoiceRecord,
} from '../types/recurring-invoice';
import { RecurringInvoiceForm } from '../components/recurring-invoices/RecurringInvoiceForm';
import { RecurringInvoicesTable } from '../components/recurring-invoices/RecurringInvoicesTable';

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

function recurringInvoiceActionLabel(result: RecurringInvoiceGenerateData): string {
  if (result.invoice) {
    return `Generated invoice ${result.invoice.invoiceNumber} for recurring invoice ${result.recurringInvoice.id}.`;
  }

  if (result.run.status === 'SKIPPED') {
    return `Generate now skipped: ${result.run.errorMessage ?? 'No additional details.'}`;
  }

  if (result.run.status === 'FAILED') {
    return `Generate now failed: ${result.run.errorMessage ?? 'No additional details.'}`;
  }

  return `Recurring invoice run completed with status ${result.run.status}.`;
}

export function RecurringInvoicesPage() {
  const { activeTenant } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItemRecord[]>([]);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoiceListItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [pauseLoadingId, setPauseLoadingId] = useState<string | null>(null);
  const [resumeLoadingId, setResumeLoadingId] = useState<string | null>(null);
  const [generateLoadingId, setGenerateLoadingId] = useState<string | null>(null);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [editingRecurringInvoice, setEditingRecurringInvoice] = useState<RecurringInvoiceRecord | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  async function loadRecurringInvoicesPage(search: string) {
    if (!activeTenant?.id) {
      setRecurringInvoices([]);
      setClients([]);
      setProjects([]);
      setServiceItems([]);
      setPageError('No active tenant context is available for recurring invoices.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const [recurringResult, clientsResult, projectsResult, serviceItemsResult] = await Promise.all([
        listRecurringInvoices({ search: search || undefined, limit: 100 }),
        listClients({ limit: 100 }),
        listProjects({ limit: 100 }),
        listServiceItems({ limit: 100 }),
      ]);

      setRecurringInvoices(recurringResult.recurringInvoices);
      setClients(clientsResult.clients);
      setProjects(projectsResult.projects);
      setServiceItems(serviceItemsResult.serviceItems);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load recurring invoices');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadRecurringInvoicesPage(activeSearch);
  }, [activeTenant?.id, activeSearch]);

  useEffect(() => {
    if (!editingRecurringInvoice) {
      return;
    }

    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [editingRecurringInvoice]);

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    'current tenant';

  const selectedRecurringInvoiceLabel = useMemo(() => {
    if (!editingRecurringInvoice) {
      return 'Create recurring invoice';
    }

    return `Edit ${editingRecurringInvoice.client?.name ?? 'recurring invoice'}`;
  }, [editingRecurringInvoice]);

  async function loadRecurringInvoiceForEdit(recurringInvoice: RecurringInvoiceListItem) {
    setEditLoadingId(recurringInvoice.id);
    setFormError(null);

    try {
      const detailedRecurringInvoice = await getRecurringInvoice(recurringInvoice.id);
      setEditingRecurringInvoice(detailedRecurringInvoice);
      setPageMessage(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load recurring invoice');
    } finally {
      setEditLoadingId(null);
    }
  }

  async function handleSubmit(input: RecurringInvoiceMutationInput) {
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingRecurringInvoice) {
        await updateRecurringInvoice(editingRecurringInvoice.id, input);
        setPageMessage('Recurring invoice updated.');
      } else {
        await createRecurringInvoice(input);
        setPageMessage('Recurring invoice created.');
      }

      setEditingRecurringInvoice(null);
      await loadRecurringInvoicesPage(activeSearch);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save recurring invoice');
    } finally {
      setFormLoading(false);
    }
  }

  async function handlePause(recurringInvoice: RecurringInvoiceListItem) {
    setPauseLoadingId(recurringInvoice.id);
    setPageError(null);

    try {
      await pauseRecurringInvoice(recurringInvoice.id);
      setPageMessage('Recurring invoice paused.');
      await loadRecurringInvoicesPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to pause recurring invoice');
    } finally {
      setPauseLoadingId(null);
    }
  }

  async function handleResume(recurringInvoice: RecurringInvoiceListItem) {
    setResumeLoadingId(recurringInvoice.id);
    setPageError(null);

    try {
      await resumeRecurringInvoice(recurringInvoice.id);
      setPageMessage('Recurring invoice resumed.');
      await loadRecurringInvoicesPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to resume recurring invoice');
    } finally {
      setResumeLoadingId(null);
    }
  }

  async function handleGenerateNow(recurringInvoice: RecurringInvoiceListItem) {
    setGenerateLoadingId(recurringInvoice.id);
    setPageError(null);

    try {
      const result = await generateRecurringInvoiceNow(recurringInvoice.id);
      setPageMessage(recurringInvoiceActionLabel(result));
      await loadRecurringInvoicesPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to generate recurring invoice now');
    } finally {
      setGenerateLoadingId(null);
    }
  }

  async function handleArchive(recurringInvoice: RecurringInvoiceListItem) {
    const confirmed = window.confirm(`Archive recurring invoice "${recurringInvoice.id}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(recurringInvoice.id);
    setPageError(null);

    try {
      await archiveRecurringInvoice(recurringInvoice.id);

      if (editingRecurringInvoice?.id === recurringInvoice.id) {
        setEditingRecurringInvoice(null);
        setFormError(null);
      }

      setPageMessage('Recurring invoice archived.');
      await loadRecurringInvoicesPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to archive recurring invoice');
    } finally {
      setArchiveLoadingId(null);
    }
  }

  return (
    <AppPage>
      <PageHeader
        description={`Manage recurring invoices for ${tenantLabel}. The workflow stays desktop-only and tenant-scoped.`}
        eyebrow="DCA Books Lite"
        title="Recurring Invoices"
      />

      {pageMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {pageMessage}
        </div>
      ) : null}

      <PageSection
        description="Create or edit a recurring invoice with optional client/project links and line items."
        title={selectedRecurringInvoiceLabel}
      >
        <div ref={formContainerRef}>
          <RecurringInvoiceForm
            clients={clients}
            error={formError}
            initialRecurringInvoice={editingRecurringInvoice}
            key={editingRecurringInvoice?.id ?? 'create-recurring-invoice'}
            loading={formLoading}
            onCancelEdit={() => {
              setEditingRecurringInvoice(null);
              setFormError(null);
            }}
            onSubmit={handleSubmit}
            projects={projects}
            serviceItems={serviceItems}
          />
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
              label="Search recurring invoices"
              maxLength={160}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by notes, terms, client, or project"
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
        description="Recurring invoices are tenant-scoped and can be paused, resumed, generated, or archived."
        title="Recurring invoice list"
      >
        {initialLoading ? <LoadingState message="Loading recurring invoices..." /> : null}

        {!initialLoading && pageError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadRecurringInvoicesPage(activeSearch)} variant="secondary">
                Retry
              </Button>
            }
            message={pageError}
            title="Unable to load recurring invoices"
          />
        ) : null}

        {!initialLoading && !pageError && recurringInvoices.length === 0 ? (
          <EmptyState
            message="No recurring invoices match the current search. Create a new one above."
            title="No recurring invoices yet"
          />
        ) : null}

        {!initialLoading && !pageError && recurringInvoices.length > 0 ? (
          <RecurringInvoicesTable
            archiveLoadingId={archiveLoadingId}
            editLoadingId={editLoadingId}
            generateLoadingId={generateLoadingId}
            onArchive={(recurringInvoice) => void handleArchive(recurringInvoice)}
            onEdit={(recurringInvoice) => void loadRecurringInvoiceForEdit(recurringInvoice)}
            onGenerateNow={(recurringInvoice) => void handleGenerateNow(recurringInvoice)}
            onPause={(recurringInvoice) => void handlePause(recurringInvoice)}
            onResume={(recurringInvoice) => void handleResume(recurringInvoice)}
            pauseLoadingId={pauseLoadingId}
            recurringInvoices={recurringInvoices}
            resumeLoadingId={resumeLoadingId}
          />
        ) : null}
      </PageSection>
    </AppPage>
  );
}
