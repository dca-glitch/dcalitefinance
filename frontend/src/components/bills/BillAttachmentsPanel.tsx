import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import type { BillRecord } from '../../types/bill';
import type { FileAttachmentRecord } from '../../types/file-attachment';

interface BillAttachmentsPanelProps {
  attachmentError?: string | null;
  attachments: FileAttachmentRecord[];
  bill: BillRecord;
  deletingAttachmentId?: string | null;
  loading?: boolean;
  onDelete: (attachment: FileAttachmentRecord) => Promise<void> | void;
  onUpload: (file: File) => Promise<void> | void;
  uploadLoading?: boolean;
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

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BillAttachmentsPanel({
  attachmentError = null,
  attachments,
  bill,
  deletingAttachmentId = null,
  loading = false,
  onDelete,
  onUpload,
  uploadLoading = false,
}: BillAttachmentsPanelProps) {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setFile(null);
  }, [bill.id]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Bill attachments</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-50">
          {bill.billNumber ?? bill.id}
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Upload supporting files for this bill. Allowed formats follow the backend attachment rules.
        </p>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">File</span>
            <input
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-cyan-300"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <div className="flex items-end">
            <Button
              disabled={!file || loading}
              loading={uploadLoading}
              onClick={async () => {
                if (!file) {
                  return;
                }
                await onUpload(file);
                setFile(null);
              }}
              type="button"
            >
              Upload file
            </Button>
          </div>
        </div>

        {attachmentError ? (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {attachmentError}
          </div>
        ) : null}

        {attachments.length === 0 ? (
          <p className="text-sm text-slate-400">No attachments uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                key={attachment.id}
              >
                <div>
                  <div className="font-medium text-slate-50">{attachment.originalFilename}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {attachment.mimeType} - {formatFileSize(attachment.sizeBytes)} - {formatDate(attachment.createdAt)}
                  </div>
                </div>
                <Button
                  loading={deletingAttachmentId === attachment.id}
                  onClick={async () => {
                    await onDelete(attachment);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
