import type { Request, Response } from 'express';
import { MembershipStatus } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import {
  getCurrentTenant,
  listTenantMembers,
  updateMemberRoles,
  updateMemberStatus,
} from '../services/tenant-management.service';

const memberRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).default([]),
});

const memberStatusSchema = z.object({
  status: z.nativeEnum(MembershipStatus),
});

const userIdSchema = z.string().uuid();

function requireAuthAndTenant(req: Request): { userId: string; tenantId: string } {
  if (!req.auth) {
    throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
  }

  if (!req.tenant) {
    throw new AppError('Tenant context required', 400, 'TENANT_CONTEXT_REQUIRED');
  }

  return {
    userId: req.auth.userId,
    tenantId: req.tenant.id,
  };
}

export async function current(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const result = await getCurrentTenant({
    tenantId: context.tenantId,
    userId: context.userId,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: result,
    }),
  );
}

export async function members(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const result = await listTenantMembers(context.tenantId);

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        members: result,
      },
    }),
  );
}

export async function updateMemberRolesHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const targetUserId = userIdSchema.parse(req.params.userId);
  const parsed = memberRolesSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid role assignment payload', 400, 'INVALID_ROLE_ASSIGNMENT_PAYLOAD');
  }

  const result = await updateMemberRoles({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    targetUserId,
    roleIds: parsed.data.roleIds,
    request: req,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: result,
    }),
  );
}

export async function updateMemberStatusHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const targetUserId = userIdSchema.parse(req.params.userId);
  const parsed = memberStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid member status payload', 400, 'INVALID_MEMBER_STATUS_PAYLOAD');
  }

  const result = await updateMemberStatus({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    targetUserId,
    status: parsed.data.status,
    request: req,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: result,
    }),
  );
}
