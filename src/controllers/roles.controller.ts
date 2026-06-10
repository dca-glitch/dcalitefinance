import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import { createRole as createRoleService, listRoles, updateRole as updateRoleService } from '../services/tenant-management.service';

const permissionKeysSchema = z.array(z.string().trim().min(1).max(120)).default([]);

const createRoleSchema = z.object({
  key: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(300).optional(),
  permissionKeys: permissionKeysSchema,
});

const updateRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(300).nullable().optional(),
    permissionKeys: z.array(z.string().trim().min(1).max(120)).optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined || value.permissionKeys !== undefined, {
    message: 'At least one field is required',
  });

const roleIdSchema = z.string().uuid();

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

export async function listTenantRolesHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const roles = await listRoles(context.tenantId);

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        roles,
      },
    }),
  );
}

export async function createRoleHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = createRoleSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid role payload', 400, 'INVALID_ROLE_PAYLOAD');
  }

  const role = await createRoleService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    key: parsed.data.key,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    permissionKeys: parsed.data.permissionKeys,
    request: req,
  });

  res.status(201).json(
    toJsonSafe({
      success: true,
      data: {
        role,
      },
    }),
  );
}

export async function updateRoleHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const roleId = roleIdSchema.parse(req.params.roleId);
  const parsed = updateRoleSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid role update payload', 400, 'INVALID_ROLE_UPDATE_PAYLOAD');
  }

  const role = await updateRoleService({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    roleId,
    name: parsed.data.name,
    description: parsed.data.description,
    permissionKeys: parsed.data.permissionKeys,
    request: req,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        role,
      },
    }),
  );
}
