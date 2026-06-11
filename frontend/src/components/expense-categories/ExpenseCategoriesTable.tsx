import { Button } from '../ui/Button';
import type { ExpenseCategoryRecord } from '../../types/expense-category';

interface ExpenseCategoriesTableProps {
  archiveLoadingId?: string | null;
  editingCategoryId?: string | null;
  onArchive: (category: ExpenseCategoryRecord) => void;
  onEdit: (category: ExpenseCategoryRecord) => void;
  categories: ExpenseCategoryRecord[];
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

export function ExpenseCategoriesTable({
  archiveLoadingId = null,
  editingCategoryId = null,
  onArchive,
  onEdit,
  categories,
}: ExpenseCategoriesTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/50">
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {categories.map((category) => (
              <tr className={`align-top ${editingCategoryId === category.id ? 'bg-cyan-400/5' : ''}`} key={category.id}>
                <td className="px-6 py-5 font-medium text-slate-50">{category.name}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{category.description ?? 'No description'}</td>
                <td className="px-6 py-5 text-sm text-slate-400">{formatDate(category.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onEdit(category)} variant="secondary">
                      {editingCategoryId === category.id ? 'Editing' : 'Edit'}
                    </Button>
                    <Button
                      loading={archiveLoadingId === category.id}
                      onClick={() => onArchive(category)}
                      variant="secondary"
                    >
                      Archive
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
