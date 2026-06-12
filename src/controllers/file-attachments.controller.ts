import type { Request, Response } from 'express';
import { MembershipStatus, TenantStatus, UserStatus } from '@prisma/client';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { getFileAttachmentDocument } from '../services/file-attachments.service';
import { readManagedFile } from '../services/managed-file-storage.service';
import { optionalAuth } from '../middlewares/auth.middleware';
import { verifyFileAttachmentDocumentToken } from '../utils/jwt';

const attachmentIdSchema = z.string().uuid();
const tenantIdSchema = z.string().uuid();
const documentTicketSchema = z.string().min(1);

function unauthorizedError(): AppError {
  return new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
}

function forbiddenError(): AppError {
  return new AppError('Forbidden', 403, 'FORBIDDEN');
}

function badRequestError(message: string, code: string): AppError {
  return new AppError(message, 400, code);
}

async function loadActiveTenantMembership(userId: string, tenantId: string): Promise<void> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      userId,
      status: MembershipStatus.ACTIVE,
      deletedAt: null,
      tenant: {
        status: TenantStatus.ACTIVE,
        deletedAt: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    throw forbiddenError();
  }
}

async function resolveDocumentAccessContext(req: Request, attachmentId: string): Promise<{ tenantId: string }> {
  const ticket = documentTicketSchema.safeParse(req.query.ticket);
  if (ticket.success) {
    const payload = verifyFileAttachmentDocumentToken(ticket.data);
    if (payload.aid !== attachmentId) {
      throw forbiddenError();
    }

    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        tokenVersion: payload.tv,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw unauthorizedError();
    }

    const session = await prisma.userSession.findFirst({
      where: {
        id: payload.sid,
        userId: user.id,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      throw unauthorizedError();
    }

    await loadActiveTenantMembership(user.id, payload.tid);
    return { tenantId: payload.tid };
  }

  if (req.auth) {
    const parsedTenantId = tenantIdSchema.safeParse(req.get('x-tenant-id'));
    if (!parsedTenantId.success) {
      throw badRequestError('Invalid tenant context', 'INVALID_TENANT_CONTEXT');
    }

    await loadActiveTenantMembership(req.auth.userId, parsedTenantId.data);
    return { tenantId: parsedTenantId.data };
  }

  throw unauthorizedError();
}

export async function getFileAttachmentDocumentHandler(req: Request, res: Response): Promise<void> {
  const attachmentId = attachmentIdSchema.parse(req.params.attachmentId);
  const { tenantId } = await resolveDocumentAccessContext(req, attachmentId);
  const attachment = await getFileAttachmentDocument({ tenantId, attachmentId });

  const document = await readManagedFile({
    storageProvider: attachment.storageProvider,
    storageKey: attachment.storageKey,
    googleDriveFileId: attachment.googleDriveFileId,
  });

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Content-Type', document.contentType ?? attachment.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${attachment.originalFilename.replace(/"/g, '')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (document.contentLength !== null) {
    res.setHeader('Content-Length', String(document.contentLength));
  }

  await pipeline(document.stream, res);
}

export const fileAttachmentDocumentAuthMiddleware = optionalAuth;
