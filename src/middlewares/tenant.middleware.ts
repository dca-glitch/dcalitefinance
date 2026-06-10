import type { NextFunction, Request, Response } from 'express';
import { MembershipStatus, TenantStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';

const tenantIdSchema = z.string().uuid();

export async function requireTenant(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
    }

    const tenantId = req.get('x-tenant-id');
    const parsed = tenantIdSchema.safeParse(tenantId);

    if (!parsed.success) {
      throw new AppError('Invalid tenant context', 400, 'INVALID_TENANT_CONTEXT');
    }

    const membership = await prisma.tenantMembership.findFirst({
      where: {
        tenantId: parsed.data,
        userId: req.auth.userId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        tenant: {
          status: TenantStatus.ACTIVE,
          deletedAt: null,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

    if (!membership) {
      throw new AppError('Forbidden', 403, 'TENANT_ACCESS_DENIED');
    }

    req.tenant = {
      id: membership.tenant.id,
      slug: membership.tenant.slug,
      membershipId: membership.id,
    };

    next();
  } catch (error) {
    next(error);
  }
}
