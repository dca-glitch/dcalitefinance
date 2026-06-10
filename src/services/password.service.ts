import type { Request } from 'express';
import { AuditAction, AuditActorType, AuthTokenPurpose, MembershipStatus, TenantStatus, UserStatus, type Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { hashPassword } from '../utils/crypto';
import { writeAuditLog } from './audit.service';
import { consumeAuthToken } from './auth-token.service';

interface SetupPasswordInput {
  token: string;
  password: string;
  request: Request;
}

function invalidSetupToken(message = 'Invalid setup token'): AppError {
  return new AppError(message, 400, 'INVALID_SETUP_TOKEN');
}

export async function setupPassword(input: SetupPasswordInput): Promise<void> {
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const consumedToken = await prisma.$transaction(async (tx) => {
    const token = await consumeAuthToken({
      db: tx,
      token: input.token,
      purpose: AuthTokenPurpose.INVITATION_SETUP,
      expectedUserStatus: UserStatus.INVITED,
    });

    if (!token.tenantId) {
      throw invalidSetupToken();
    }

    const membership = await tx.tenantMembership.findFirst({
      where: {
        tenantId: token.tenantId,
        userId: token.userId,
        status: MembershipStatus.INVITED,
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
      throw invalidSetupToken();
    }

    const user = await tx.user.findFirst({
      where: {
        id: token.userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw invalidSetupToken();
    }

    await tx.user.update({
      where: {
        id: token.userId,
      },
      data: {
        passwordHash,
        passwordUpdatedAt: now,
        status: UserStatus.ACTIVE,
        tokenVersion: {
          increment: 1,
        },
      },
    });

    await tx.tenantMembership.updateMany({
      where: {
        tenantId: token.tenantId,
        userId: token.userId,
        deletedAt: null,
      },
      data: {
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await tx.userSession.updateMany({
      where: {
        userId: token.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        revocationReason: 'PASSWORD_SETUP',
      },
    });

    return token;
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.PASSWORD_SETUP,
    actorUserId: consumedToken.userId,
    tenantId: consumedToken.tenantId,
    request: input.request,
    entityType: 'User',
    entityId: consumedToken.userId,
    metadata: {
      invitedUserId: consumedToken.userId,
      tenantId: consumedToken.tenantId,
    } satisfies Prisma.InputJsonValue,
  });
}
