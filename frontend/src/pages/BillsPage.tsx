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
import { listExpenseCategories } from '../lib/expense-categories-api';
import { archiveBill, createBill, deleteBillAttachment, listBillAttachments, listBills, markBillPaid, updateBill, uploadBillAttachment, voidBill } from '../lib/bills-api';
import { listVendors } from '../lib/vendors-api';
import type { BillMutationInput, BillRecord } from '../types/bill';
import type { ExpenseCategoryRecord } from '../types/expense-category';
import type { FileAttachmentRecord } from '../types/file-attachment';
import type { VendorRecord } from '../types/vendor';
import { BillAttachmentsPanel } from '../components/bills/BillAttachmentsPanel';
import { BillForm } from '../components/bills/BillForm';
import { BillsTable } from '../components/bills/BillsTable';

export function BillsPage() {
  const { activeTenant } = useAuth();
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryRecord[]>([]);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [markPaidLoadingId, setMarkPaidLoadingId] = useState<string | null>(null);
  const [voidLoadingId, setVoidLoadingId] = useState<string | null>(null);
  const [editingBill, setEditingBill] = useState<BillRecord | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<FileAttachmentRecord[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  async function loadBillsPage(search: string) {
    if (!activeTenant?.id) {
      setBills([]);
      setVendors([]);
      setCategories([]);
      setPageError('No active tenant context is available for bills.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const [billResult, vendorResult, categoryResult] = await Promise.all([
        listBills({ search: search || undefined, limit: 100 }),
        listVendors({ limit: 100 }),
        listExpenseCategories({ limit: 100 }),
      ]);

      setBills(billResult.bills);
      setVendors(vendorResult.vendors);
      setCategories(categoryResult.expenseCategories);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load bills');
    } finally {
      setInitialLoading(false);
    }
  }

  async function loadAttachments(billId: string) {
    setAttachmentsLoading(true);
    setAttachmentsError(null);

    try {
      const result = await listBillAttachments(billId);
      setAttachments(result.attachments);
    } catch (error) {
      setAttachments([]);
      setAttachmentsError(error instanceof Error ? error.message : 'Failed to load attachments');
    } finally {
      setAttachmentsLoading(false);
    }
  }

  useEffect(() => {
    void loadBillsPage(activeSearch);
  }, [activeTenant?.id, activeSearch]);

  useEffect(() => {
    if (!editingBill) {
      return;
    }

    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [editingBill]);

  useEffect(() => {
    if (!selectedBillId) {
      setAttachments([]);
      setAttachmentsError(null);
      return;
    }

    const bill = bills.find((currentBill) => currentBill.id === selectedBillId);
    if (!bill) {
      return;
    }

    void loadAttachments(selectedBillId);
  }, [bills, selectedBillId]);

  const selectedBill = useMemo(() => bills.find((bill) => bill.id === selectedBillId) ?? null, [bills, selectedBillId]);

  async function handleSubmit(input: BillMutationInput) {
    setFormLoading(true);
    setFormError(null);

    try {
      const bill = editingBill ? await updateBill(editingBill.id, input) : await createBill(input);

      setEditingBill(null);
      setSelectedBillId(bill.id);
      await loadBillsPage(activeSearch);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save bill');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleArchive(bill: BillRecord) {
    const confirmed = window.confirm(`Archive bill "${bill.billNumber ?? bill.id}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(bill.id);
    setPageError(null);

    try {
      await archiveBill(bill.id);

      if (editingBill?.id === bill.id) {
        setEditingBill(null);
        setFormError(null);
      }

      if (selectedBillId === bill.id) {
        setSelectedBillId(null);
      }

      await loadBillsPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to archive bill');
    } finally {
      setArchiveLoadingId(null);
    }
  }

  async function handleMarkPaid(bill: BillRecord) {
    setMarkPaidLoadingId(bill.id);
    setPageError(null);

    try {
      await markBillPaid(bill.id);
      await loadBillsPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to mark bill paid');
    } finally {
      setMarkPaidLoadingId(null);
    }
  }

  async function handleVoid(bill: BillRecord) {
    const confirmed = window.confirm(`Void bill "${bill.billNumber ?? bill.id}"?`);
    if (!confirmed) {
      return;
    }

    setVoidLoadingId(bill.id);
    setPageError(null);

    try {
      await voidBill(bill.id);
      await loadBillsPage(activeSearch);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to void bill');
    } finally {
      setVoidLoadingId(null);
    }
  }

  async function handleUploadAttachment(file: File) {
    if (!selectedBill) {
      return;
    }

    setUploadLoading(true);
    setAttachmentsError(null);

    try {
      await uploadBillAttachment(selectedBill.id, file);
      await loadAttachments(selectedBill.id);
    } catch (error) {
      setAttachmentsError(error instanceof Error ? error.message : 'Unable to upload attachment');
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleDeleteAttachment(attachment: FileAttachmentRecord) {
    if (!selectedBill) {
      return;
    }

    const confirmed = window.confirm(`Remove attachment "${attachment.originalFilename}"?`);
    if (!confirmed) {
      return;
    }

    setDeletingAttachmentId(attachment.id);
    setAttachmentsError(null);

    try {
      await deleteBillAttachment(selectedBill.id, attachment.id);
      await loadAttachments(selectedBill.id);
    } catch (error) {
      setAttachmentsError(error instanceof Error ? error.message : 'Unable to remove attachment');
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    'current tenant';

  return (
    <AppPage>
      <PageHeader
        description={`Manage bills for ${tenantLabel}. This UI stays desktop-only and keeps finance actions simple.`}
        eyebrow="DCA Books Lite"
        title="Bills / Expenses"
      />

      <PageSection
        description="Create or edit a bill with vendor and category references, then manage attachments from the selected bill panel."
        title={editingBill ? `Edit ${editingBill.billNumber ?? editingBill.id}` : 'Create bill'}
      >
        <div ref={formContainerRef}>
          <BillForm
            categories={categories}
            error={formError}
            initialBill={editingBill}
            key={editingBill?.id ?? 'create-bill'}
            loading={formLoading}
            onCancelEdit={() => {
              setEditingBill(null);
              setFormError(null);
            }}
            onSubmit={handleSubmit}
            vendors={vendors}
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
              label="Search bills"
              maxLength={160}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by number, vendor, category, notes, or payment reference"
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
        description="Bills are tenant-scoped and support attachment management from the list below."
        title="Bill list"
      >
        {initialLoading ? <LoadingState message="Loading bills..." /> : null}

        {!initialLoading && pageError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadBillsPage(activeSearch)} variant="secondary">
                Retry
              </Button>
            }
            message={pageError}
            title="Unable to load bills"
          />
        ) : null}

        {!initialLoading && !pageError && bills.length === 0 ? (
          <EmptyState
            message="No bills match the current search. Create a new bill above."
            title="No bills yet"
          />
        ) : null}

        {!initialLoading && !pageError && bills.length > 0 ? (
          <BillsTable
            archiveLoadingId={archiveLoadingId}
            bills={bills}
            editingBillId={editingBill?.id ?? null}
            markPaidLoadingId={markPaidLoadingId}
            onArchive={(bill) => void handleArchive(bill)}
            onEdit={(bill) => {
              setEditingBill(bill);
              setSelectedBillId(bill.id);
              setFormError(null);
            }}
            onMarkPaid={(bill) => void handleMarkPaid(bill)}
            onSelectAttachments={(bill) => setSelectedBillId(bill.id)}
            onVoid={(bill) => void handleVoid(bill)}
            voidLoadingId={voidLoadingId}
          />
        ) : null}
      </PageSection>

      {selectedBill ? (
        <PageSection
          description="Upload supporting documents and keep them tenant-scoped."
          title={`Attachments for ${selectedBill.billNumber ?? selectedBill.id}`}
        >
          {attachmentsLoading ? <LoadingState message="Loading attachments..." /> : null}

          {!attachmentsLoading ? (
          <BillAttachmentsPanel
            attachmentError={attachmentsError}
            attachments={attachments}
            bill={selectedBill}
            deletingAttachmentId={deletingAttachmentId}
            onDelete={handleDeleteAttachment}
            onUpload={handleUploadAttachment}
            uploadLoading={uploadLoading}
          />
        ) : null}
        </PageSection>
      ) : null}
    </AppPage>
  );
}
