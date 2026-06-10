import type { Request } from 'express';
import { AuditAction, AuditActorType, MembershipStatus, UserStatus, type Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';
import { issueInvitationSetupToken } from './auth-token.service';
import { normalizeEmail } from '../utils/email';

interface CreateInvitationInput {
  tenantId: string;
  actorUserId: string;
  email: string;
  displayName?: string | null;
  roleIds: string[];
  request: Request;
}

export interface CreateInvitationResult {
  userId: string;
  tenantId: string;
  setupToken: string;
  expiresAt: Date;
}

function uniqueRoleIds(roleIds: string[]): string[] {
  return [...new Set(roleIds)];
}

function userInactiveError(): AppError {
  return new AppError('User is inactive', 400, 'USER_INACTIVE');
}

export async function createInvitation(input: CreateInvitationInput): Promise<CreateInvitationResult> {
  const email = normalizeEmail(input.email);
  const roleIds = uniqueRoleIds(input.roleIds);

  const result = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.deletedAt) {
      throw userInactiveError();
    }

    if (existingUser && existingUser.status !== UserStatus.ACTIVE && existingUser.status !== UserStatus.INVITED) {
      throw userInactiveError();
    }

    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          email,
          displayName: input.displayName ?? null,
          status: UserStatus.INVITED,
          passwordHash: null,
        },
      }));

    const membershipStatus = user.status === UserStatus.ACTIVE ? MembershipStatus.ACTIVE : MembershipStatus.INVITED;

    await tx.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: user.id,
        },
      },
      update: {
        status: membershipStatus,
        deletedAt: null,
      },
      create: {
        tenantId: input.tenantId,
        userId: user.id,
        status: membershipStatus,
      },
    });

    if (roleIds.length > 0) {
      const roles = await tx.role.findMany({
        where: {
          tenantId: input.tenantId,
          id: {
            in: roleIds,
          },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (roles.length !== roleIds.length) {
        throw new AppError('Invalid role selection', 400, 'INVALID_ROLE_SELECTION');
      }

      for (const roleId of roleIds) {
        await tx.userRole.upsert({
          where: {
            tenantId_userId_roleId: {
              tenantId: input.tenantId,
              userId: user.id,
              roleId,
            },
          },
          update: {
            deletedAt: null,
          },
          create: {
            tenantId: input.tenantId,
            userId: user.id,
            roleId,
          },
        });
      }
    }

    const invitation = await issueInvitationSetupToken({
      db: tx,
      userId: user.id,
      tenantId: input.tenantId,
      createdById: input.actorUserId,
    });

    return {
      userId: user.id,
      tenantId: input.tenantId,
      setupToken: invitation.rawToken,
      expiresAt: invitation.expiresAt,
      roleCount: roleIds.length,
    };
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.INVITE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'User',
    entityId: result.userId,
    metadata: {
      invitedUserId: result.userId,
      tenantId: result.tenantId,
      roleCount: result.roleCount,
    } satisfies Prisma.InputJsonValue,
  });

  return {
    userId: result.userId,
    tenantId: result.tenantId,
    setupToken: result.setupToken,
    expiresAt: result.expiresAt,
  };
}
