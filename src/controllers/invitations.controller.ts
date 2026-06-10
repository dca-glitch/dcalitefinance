import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import { createInvitation as createInvitationService } from '../services/invitations.service';

const createInvitationSchema = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(160).optional(),
  roleIds: z.array(z.string().uuid()).optional().default([]),
});

export async function createInvitation(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
  }

  if (!req.tenant) {
    throw new AppError('Tenant context required', 400, 'TENANT_CONTEXT_REQUIRED');
  }

  const parsed = createInvitationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid invitation payload', 400, 'INVALID_INVITATION_PAYLOAD');
  }

  const result = await createInvitationService({
    tenantId: req.tenant.id,
    actorUserId: req.auth.userId,
    email: parsed.data.email,
    displayName: parsed.data.displayName ?? null,
    roleIds: parsed.data.roleIds,
    request: req,
  });

  res.status(201).json(
    toJsonSafe({
      success: true,
      data: {
        userId: result.userId,
        tenantId: result.tenantId,
        setupToken: result.setupToken,
        expiresAt: result.expiresAt,
      },
    }),
  );
}
