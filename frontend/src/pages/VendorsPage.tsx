import { useEffect, useRef, useState } from 'react';
import { VendorForm } from '../components/vendors/VendorForm';
import { VendorsTable } from '../components/vendors/VendorsTable';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { archiveVendor, createVendor, listVendors, updateVendor } from '../lib/vendors-api';
import type { VendorMutationInput, VendorRecord } from '../types/vendor';

export function VendorsPage() {
  const { activeTenant } = useAuth();
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [editingVendor, setEditingVendor] = useState<VendorRecord | null>(null);
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  async function loadVendors() {
    if (!activeTenant?.id) {
      setVendors([]);
      setPageError('No active tenant context is available for vendors.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const result = await listVendors({ limit: 100 });
      setVendors(result.vendors);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load vendors');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadVendors();
  }, [activeTenant?.id]);

  useEffect(() => {
    if (!editingVendor) {
      return;
    }

    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [editingVendor]);

  async function handleSubmit(input: VendorMutationInput) {
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, input);
      } else {
        await createVendor(input);
      }

      setEditingVendor(null);
      await loadVendors();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save vendor');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleArchive(vendor: VendorRecord) {
    const confirmed = window.confirm(`Archive vendor "${vendor.name}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(vendor.id);
    setPageError(null);

    try {
      await archiveVendor(vendor.id);

      if (editingVendor?.id === vendor.id) {
        setEditingVendor(null);
        setFormError(null);
      }

      await loadVendors();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to archive vendor');
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
        description={`Manage vendor records for ${tenantLabel}. Keep billing details ready for future expense and bill workflows.`}
        eyebrow="DCA Books Lite"
        title="Vendors"
      />

      <PageSection
        description="Create a vendor with the backend-supported contact and invoice fields."
        title={editingVendor ? `Edit ${editingVendor.name}` : 'Create vendor'}
      >
        <div ref={formContainerRef}>
          <VendorForm
            error={formError}
            initialVendor={editingVendor}
            key={editingVendor?.id ?? 'create-vendor'}
            loading={formLoading}
            onCancelEdit={() => {
              setEditingVendor(null);
              setFormError(null);
            }}
            onSubmit={handleSubmit}
          />
        </div>
      </PageSection>

      <PageSection
        actions={
          !initialLoading && pageError ? (
            <Button onClick={() => void loadVendors()} variant="secondary">
              Retry
            </Button>
          ) : null
        }
        description="Vendor records are tenant-scoped and archived instead of hard deleted."
        title="Vendor list"
      >
        {initialLoading ? <LoadingState message="Loading vendors..." /> : null}

        {!initialLoading && pageError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadVendors()} variant="secondary">
                Retry
              </Button>
            }
            message={pageError}
            title="Unable to load vendors"
          />
        ) : null}

        {!initialLoading && !pageError && vendors.length === 0 ? (
          <EmptyState
            message="No vendors have been created yet. Use the form above to add your first vendor."
            title="No vendors yet"
          />
        ) : null}

        {!initialLoading && !pageError && vendors.length > 0 ? (
          <VendorsTable
            archiveLoadingId={archiveLoadingId}
            editingVendorId={editingVendor?.id ?? null}
            onArchive={(vendor) => void handleArchive(vendor)}
            onEdit={(vendor) => {
              setEditingVendor(vendor);
              setFormError(null);
            }}
            vendors={vendors}
          />
        ) : null}
      </PageSection>
    </AppPage>
  );
}
