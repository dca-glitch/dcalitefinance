import { useEffect, useRef, useState } from 'react';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import {
  archiveExpenseCategory,
  createExpenseCategory,
  listExpenseCategories,
  updateExpenseCategory,
} from '../lib/expense-categories-api';
import type {
  ExpenseCategoryMutationInput,
  ExpenseCategoryRecord,
} from '../types/expense-category';
import { ExpenseCategoryForm } from '../components/expense-categories/ExpenseCategoryForm';
import { ExpenseCategoriesTable } from '../components/expense-categories/ExpenseCategoriesTable';

export function ExpenseCategoriesPage() {
  const { activeTenant } = useAuth();
  const [categories, setCategories] = useState<ExpenseCategoryRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryRecord | null>(null);
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  async function loadCategories() {
    if (!activeTenant?.id) {
      setCategories([]);
      setPageError('No active tenant context is available for expense categories.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const result = await listExpenseCategories({ limit: 100 });
      setCategories(result.expenseCategories);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load expense categories');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, [activeTenant?.id]);

  useEffect(() => {
    if (!editingCategory) {
      return;
    }

    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [editingCategory]);

  async function handleSubmit(input: ExpenseCategoryMutationInput) {
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingCategory) {
        await updateExpenseCategory(editingCategory.id, input);
      } else {
        await createExpenseCategory(input);
      }

      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save expense category');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleArchive(category: ExpenseCategoryRecord) {
    const confirmed = window.confirm(`Archive expense category "${category.name}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(category.id);
    setPageError(null);

    try {
      await archiveExpenseCategory(category.id);

      if (editingCategory?.id === category.id) {
        setEditingCategory(null);
        setFormError(null);
      }

      await loadCategories();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to archive expense category');
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
        description={`Manage expense categories for ${tenantLabel}. These records stay tenant-scoped and archive-only.`}
        eyebrow="DCA Books Lite"
        title="Expense Categories"
      />

      <PageSection
        description="Create a compact expense category record with a short name and optional description."
        title={editingCategory ? `Edit ${editingCategory.name}` : 'Create expense category'}
      >
        <div ref={formContainerRef}>
          <ExpenseCategoryForm
            error={formError}
            initialCategory={editingCategory}
            key={editingCategory?.id ?? 'create-expense-category'}
            loading={formLoading}
            onCancelEdit={() => {
              setEditingCategory(null);
              setFormError(null);
            }}
            onSubmit={handleSubmit}
          />
        </div>
      </PageSection>

      <PageSection
        actions={
          !initialLoading && pageError ? (
            <Button onClick={() => void loadCategories()} variant="secondary">
              Retry
            </Button>
          ) : null
        }
        description="Expense categories are safe archive-only records."
        title="Expense category list"
      >
        {initialLoading ? <LoadingState message="Loading expense categories..." /> : null}

        {!initialLoading && pageError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadCategories()} variant="secondary">
                Retry
              </Button>
            }
            message={pageError}
            title="Unable to load expense categories"
          />
        ) : null}

        {!initialLoading && !pageError && categories.length === 0 ? (
          <EmptyState
            message="No expense categories have been created yet. Use the form above to add one."
            title="No expense categories yet"
          />
        ) : null}

        {!initialLoading && !pageError && categories.length > 0 ? (
          <ExpenseCategoriesTable
            archiveLoadingId={archiveLoadingId}
            editingCategoryId={editingCategory?.id ?? null}
            categories={categories}
            onArchive={(category) => void handleArchive(category)}
            onEdit={(category) => {
              setEditingCategory(category);
              setFormError(null);
            }}
          />
        ) : null}
      </PageSection>
    </AppPage>
  );
}
