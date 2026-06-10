import type { AuditAction, AuditActorType, Prisma } from '@prisma/client';
import type { Request } from 'express';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

export interface AuditLogInput {
  tenantId?: string | null;
  actorUserId?: string | null;
  actorType: AuditActorType;
  action: AuditAction;
  entityType?: string | null;
  entityId?: string | null;
  request?: Request;
  metadata?: Prisma.InputJsonValue;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorType: input.actorType,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        requestId: input.request?.requestId ?? null,
        ipAddress: input.request?.ip ?? null,
        userAgent: input.request?.get('user-agent') ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    logger.error({ err: error, action: input.action }, 'Audit log write failed');
  }
}
