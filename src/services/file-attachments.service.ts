import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType, FileAttachmentEntityType, StorageProvider } from '@prisma/client';
import { prisma } from '../config/prisma';
import { FILE_STORAGE_ROOT, buildAttachmentStorageDirectory, buildAttachmentStorageKey, ensureFileStorageRoot } from '../config/storage';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

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
  uploadedByUserId: string;
  createdAt: Date;
}

export interface FileAttachmentUploadInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  entityType: FileAttachmentEntityType;
  entityId: string;
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
    uploadedByUserId: attachment.uploadedByUserId,
    createdAt: attachment.createdAt,
  };
}

async function removeStoredFile(storageKey: string): Promise<void> {
  const absolutePath = path.join(FILE_STORAGE_ROOT, storageKey);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
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
  ensureFileStorageRoot();

  const extension = validateUploadFile(input.file);
  const attachmentId = randomUUID();
  const storedFilename = `${attachmentId}${extension}`;
  const storageDirectory = buildAttachmentStorageDirectory(input.tenantId, input.entityType);
  const storageKey = buildAttachmentStorageKey(input.tenantId, input.entityType, storedFilename);
  const checksumSha256 = createHash('sha256').update(input.file.buffer).digest('hex');

  await fs.mkdir(storageDirectory, { recursive: true });
  await fs.writeFile(path.join(storageDirectory, storedFilename), input.file.buffer);

  const attachment = await prisma.fileAttachment.create({
    data: {
      id: attachmentId,
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      originalFilename: input.file.originalname,
      storedFilename,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      storageProvider: StorageProvider.LOCAL,
      storageKey,
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
    };
  });

  await removeStoredFile(result.storageKey);

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
