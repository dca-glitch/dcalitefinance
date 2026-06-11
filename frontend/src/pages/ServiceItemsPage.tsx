import { useEffect, useRef, useState } from 'react';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ServiceItemForm } from '../components/service-items/ServiceItemForm';
import { ServiceItemsTable } from '../components/service-items/ServiceItemsTable';
import { archiveServiceItem, createServiceItem, listServiceItems, updateServiceItem } from '../lib/service-items-api';
import { useAuth } from '../hooks/useAuth';
import type { ServiceItemMutationInput, ServiceItemRecord } from '../types/service-item';

export function ServiceItemsPage() {
  const { activeTenant } = useAuth();
  const [serviceItems, setServiceItems] = useState<ServiceItemRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [editingServiceItem, setEditingServiceItem] = useState<ServiceItemRecord | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  async function loadServiceItems(search: string) {
    if (!activeTenant?.id) {
      setServiceItems([]);
      setPageError('No active tenant context is available for service items.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const result = await listServiceItems({ search: search || undefined, limit: 100 });
      setServiceItems(result.serviceItems);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load service items');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadServiceItems(activeSearch);
  }, [activeTenant?.id, activeSearch]);

  useEffect(() => {
    if (!editingServiceItem) {
      return;
    }

    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [editingServiceItem]);

  async function handleSubmit(input: ServiceItemMutationInput) {
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingServiceItem) {
        await updateServiceItem(editingServiceItem.id, input);
      } else {
        await createServiceItem(input);
      }

      setEditingServiceItem(null);
      await loadServiceItems(activeSearch);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save service item');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleArchive(serviceItem: ServiceItemRecord) {
    const confirmed = window.confirm(`Archive service item "${serviceItem.name}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(serviceItem.id);
    setPageError(null);

    try {
      await archiveServiceItem(serviceItem.id);

      if (editingServiceItem?.id === serviceItem.id) {
        setEditingServiceItem(null);
        setFormError(null);
      }

      await loadServiceItems(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to archive service item');
    } finally {
      setArchiveLoadingId(null);
    }
  }

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    'current tenant';

  return (
    <AppPage>
      <PageHeader
        description={`Manage service items for ${tenantLabel}. These catalog entries can later be selected on invoices.`}
        eyebrow="DCA Books Lite"
        title="Service Items"
      />

      <PageSection
        description="Create, edit, and archive catalog items using the backend Service Items API."
        title={editingServiceItem ? `Edit ${editingServiceItem.name}` : 'Create service item'}
      >
        <div ref={formContainerRef}>
          <ServiceItemForm
            error={formError}
            initialServiceItem={editingServiceItem}
            key={editingServiceItem?.id ?? 'create-service-item'}
            loading={formLoading}
            onCancelEdit={() => {
              setEditingServiceItem(null);
              setFormError(null);
            }}
            onSubmit={handleSubmit}
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
              label="Search service items"
              maxLength={160}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by name or description"
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
        description="Service item records come from the backend and remain tenant-scoped."
        title="Service item list"
      >
        {initialLoading ? <LoadingState message="Loading service items..." /> : null}

        {!initialLoading && pageError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadServiceItems(activeSearch)} variant="secondary">
                Retry
              </Button>
            }
            message={pageError}
            title="Unable to load service items"
          />
        ) : null}

        {!initialLoading && !pageError && serviceItems.length === 0 ? (
          <EmptyState
            message="No service items match the current search. Create a new catalog item above."
            title="No service items yet"
          />
        ) : null}

        {!initialLoading && !pageError && serviceItems.length > 0 ? (
          <ServiceItemsTable
            archiveLoadingId={archiveLoadingId}
            editingServiceItemId={editingServiceItem?.id ?? null}
            onArchive={(serviceItem) => void handleArchive(serviceItem)}
            onEdit={(serviceItem) => {
              setEditingServiceItem(serviceItem);
              setFormError(null);
            }}
            serviceItems={serviceItems}
          />
        ) : null}
      </PageSection>
    </AppPage>
  );
}
