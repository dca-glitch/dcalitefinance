import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType, FileAttachmentEntityType, StorageProvider } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';
import { buildManagedStorageChecksum, deleteManagedFile, storeManagedFile } from './managed-file-storage.service';

const mimeTypeExtensionMap: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export interface SafeFileAttachmentResponse {
  id: string;
  entityType: FileAttachmentEntityType;
  entityId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: StorageProvider;
  documentLink: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  uploadedByUserId: string;
  createdAt: Date;
}

export interface FileAttachmentUploadInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  entityType: FileAttachmentEntityType;
  entityId: string;
  storagePathSegments?: string[];
  file: Express.Multer.File;
}

export interface FileAttachmentListInput {
  tenantId: string;
  entityType: FileAttachmentEntityType;
  entityId: string;
}

export interface FileAttachmentDeleteInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  entityType: FileAttachmentEntityType;
  entityId: string;
  attachmentId: string;
}

const fileAttachmentSelect = {
  id: true,
  entityType: true,
  entityId: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  storageProvider: true,
  googleDriveWebViewLink: true,
  googleDriveWebContentLink: true,
  uploadedByUserId: true,
  createdAt: true,
} satisfies Prisma.FileAttachmentSelect;

function attachmentNotFoundError(): AppError {
  return new AppError('File attachment not found', 404, 'FILE_ATTACHMENT_NOT_FOUND');
}

function unsupportedFileTypeError(): AppError {
  return new AppError('Unsupported file type', 400, 'UNSUPPORTED_FILE_TYPE');
}

function invalidFileUploadError(): AppError {
  return new AppError('Invalid file upload', 400, 'INVALID_FILE_UPLOAD');
}

function validateUploadFile(file: Express.Multer.File): string {
  const extension = mimeTypeExtensionMap[file.mimetype];

  if (!extension) {
    throw unsupportedFileTypeError();
  }

  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new AppError('File exceeds 10 MB limit', 400, 'FILE_TOO_LARGE');
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw invalidFileUploadError();
  }

  return extension;
}

function mapAttachment(attachment: {
  id: string;
  entityType: FileAttachmentEntityType;
  entityId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: StorageProvider;
  googleDriveWebViewLink: string | null;
  googleDriveWebContentLink: string | null;
  uploadedByUserId: string;
  createdAt: Date;
}): SafeFileAttachmentResponse {
  return {
    id: attachment.id,
    entityType: attachment.entityType,
    entityId: attachment.entityId,
    originalFilename: attachment.originalFilename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    storageProvider: attachment.storageProvider,
    documentLink: attachment.googleDriveWebViewLink ?? attachment.googleDriveWebContentLink ?? null,
    webViewLink: attachment.googleDriveWebViewLink,
    webContentLink: attachment.googleDriveWebContentLink,
    uploadedByUserId: attachment.uploadedByUserId,
    createdAt: attachment.createdAt,
  };
}

export async function listFileAttachments(input: FileAttachmentListInput): Promise<SafeFileAttachmentResponse[]> {
  const attachments = await prisma.fileAttachment.findMany({
    where: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      deletedAt: null,
    },
    select: fileAttachmentSelect,
    orderBy: {
      createdAt: 'asc',
    },
  });

  return attachments.map(mapAttachment);
}

export async function uploadFileAttachment(input: FileAttachmentUploadInput): Promise<SafeFileAttachmentResponse> {
  const extension = validateUploadFile(input.file);
  const attachmentId = randomUUID();
  const storedFilename = `${attachmentId}${extension}`;
  const checksumSha256 = buildManagedStorageChecksum(input.file.buffer);
  const storage = await storeManagedFile({
    tenantId: input.tenantId,
    entityType: input.entityType,
    folderSegments: input.storagePathSegments ?? [input.entityType.toLowerCase()],
    originalFilename: input.file.originalname,
    storedFilename,
    mimeType: input.file.mimetype,
    buffer: input.file.buffer,
  });

  const attachment = await prisma.fileAttachment.create({
    data: {
      id: attachmentId,
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      originalFilename: input.file.originalname,
      storedFilename: storage.storedFilename,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      storageProvider: storage.storageProvider,
      storageKey: storage.storageKey,
      googleDriveFileId: storage.googleDriveFileId,
      googleDriveWebViewLink: storage.googleDriveWebViewLink,
      googleDriveWebContentLink: storage.googleDriveWebContentLink,
      checksumSha256,
      uploadedByUserId: input.actorUserId,
    },
    select: fileAttachmentSelect,
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'FileAttachment',
    entityId: attachment.id,
    metadata: {
      attachmentId: attachment.id,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    } satisfies Prisma.InputJsonValue,
  });

  return mapAttachment(attachment);
}

export async function deleteFileAttachment(input: FileAttachmentDeleteInput): Promise<SafeFileAttachmentResponse> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.fileAttachment.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.attachmentId,
        entityType: input.entityType,
        entityId: input.entityId,
        deletedAt: null,
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        storageProvider: true,
        googleDriveFileId: true,
        googleDriveWebViewLink: true,
        googleDriveWebContentLink: true,
        uploadedByUserId: true,
        createdAt: true,
        storageKey: true,
      },
    });

    if (!existing) {
      throw attachmentNotFoundError();
    }

    const attachment = await tx.fileAttachment.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
      },
      select: fileAttachmentSelect,
    });

    return {
      attachment,
      storageKey: existing.storageKey,
      storageProvider: existing.storageProvider,
      googleDriveFileId: existing.googleDriveFileId,
    };
  });

  await deleteManagedFile({
    storageProvider: result.storageProvider,
    storageKey: result.storageKey,
    googleDriveFileId: result.googleDriveFileId,
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'FileAttachment',
    entityId: result.attachment.id,
    metadata: {
      attachmentId: result.attachment.id,
      entityType: result.attachment.entityType,
      entityId: result.attachment.entityId,
    } satisfies Prisma.InputJsonValue,
  });

  return mapAttachment(result.attachment);
}
