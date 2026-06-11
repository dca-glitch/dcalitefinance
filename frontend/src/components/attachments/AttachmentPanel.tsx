import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import type { FileAttachmentRecord } from '../../types/file-attachment';

interface AttachmentPanelProps {
  accept?: string;
  attachmentError?: string | null;
  attachments: FileAttachmentRecord[];
  deletingAttachmentId?: string | null;
  description: string;
  emptyMessage: string;
  loading?: boolean;
  onDelete: (attachment: FileAttachmentRecord) => Promise<void> | void;
  onUpload: (file: File) => Promise<void> | void;
  resetKey: string;
  title: string;
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

export function AttachmentPanel({
  accept,
  attachmentError = null,
  attachments,
  deletingAttachmentId = null,
  description,
  emptyMessage,
  loading = false,
  onDelete,
  onUpload,
  resetKey,
  title,
  uploadLoading = false,
}: AttachmentPanelProps) {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setFile(null);
  }, [resetKey]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20">
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">File</span>
            <input
              accept={accept}
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

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
            Loading attachments...
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyMessage}</p>
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
                    {attachment.mimeType} - {formatFileSize(attachment.sizeBytes)} - {attachment.storageProvider} - {formatDate(attachment.createdAt)}
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
