import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';

export function requirePermission(permissionKey: string) {
  return async function permissionMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.auth) {
        throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
      }

      if (!req.tenant) {
        throw new AppError('Tenant context required', 400, 'TENANT_CONTEXT_REQUIRED');
      }

      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          permission: {
            key: permissionKey,
          },
          role: {
            tenantId: req.tenant.id,
            deletedAt: null,
            users: {
              some: {
                tenantId: req.tenant.id,
                userId: req.auth.userId,
                deletedAt: null,
              },
            },
          },
        },
        select: { id: true },
      });

      if (!rolePermission) {
        throw new AppError('Forbidden', 403, 'PERMISSION_DENIED');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
