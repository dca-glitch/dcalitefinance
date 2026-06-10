import { AuthTokenPurpose, TenantStatus, UserStatus, type Prisma, type PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { generateOpaqueToken, hashToken } from '../utils/crypto';

type DbClient = PrismaClient | Prisma.TransactionClient;

interface IssueAuthTokenInput {
  db: DbClient;
  userId: string;
  purpose: AuthTokenPurpose;
  ttlHours: number;
  tenantId?: string | null;
  createdById?: string | null;
}

interface ConsumeAuthTokenInput {
  db: DbClient;
  token: string;
  purpose: AuthTokenPurpose;
  expectedUserStatus: UserStatus;
  expectedTenantId?: string | null;
}

function tokenExpiresAt(ttlHours: number): Date {
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
}

function authTokenError(message = 'Invalid token'): AppError {
  return new AppError(message, 400, 'INVALID_AUTH_TOKEN');
}

export async function issueAuthToken(input: IssueAuthTokenInput): Promise<{ rawToken: string; expiresAt: Date; tokenId: string }> {
  const rawToken = generateOpaqueToken();
  const created = await input.db.authToken.create({
    data: {
      userId: input.userId,
      tenantId: input.tenantId ?? null,
      purpose: input.purpose,
      tokenHash: hashToken(rawToken),
      expiresAt: tokenExpiresAt(input.ttlHours),
      createdById: input.createdById ?? null,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  return {
    rawToken,
    expiresAt: created.expiresAt,
    tokenId: created.id,
  };
}

export async function issueInvitationSetupToken(input: Omit<IssueAuthTokenInput, 'purpose' | 'ttlHours'>): Promise<{ rawToken: string; expiresAt: Date; tokenId: string }> {
  return issueAuthToken({
    ...input,
    purpose: AuthTokenPurpose.INVITATION_SETUP,
    ttlHours: env.INVITATION_TOKEN_TTL_HOURS,
  });
}

export async function issuePasswordResetToken(input: Omit<IssueAuthTokenInput, 'purpose' | 'ttlHours'>): Promise<{ rawToken: string; expiresAt: Date; tokenId: string }> {
  return issueAuthToken({
    ...input,
    purpose: AuthTokenPurpose.PASSWORD_RESET,
    ttlHours: env.PASSWORD_RESET_TOKEN_TTL_HOURS,
  });
}

export async function consumeAuthToken(input: ConsumeAuthTokenInput): Promise<{
  id: string;
  userId: string;
  tenantId: string | null;
  purpose: AuthTokenPurpose;
  expiresAt: Date;
}> {
  const tokenHash = hashToken(input.token);
  const now = new Date();

  const record = await input.db.authToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
          passwordHash: true,
          tokenVersion: true,
        },
      },
      tenant: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!record) {
    throw authTokenError();
  }

  if (record.purpose !== input.purpose) {
    throw authTokenError('Invalid token purpose');
  }

  if (record.consumedAt) {
    throw authTokenError('Token already used');
  }

  if (record.revokedAt) {
    throw authTokenError('Token revoked');
  }

  if (record.expiresAt <= now) {
    throw authTokenError('Token expired');
  }

  if (record.user.deletedAt || record.user.status !== input.expectedUserStatus) {
    throw authTokenError('User is inactive');
  }

  if (record.tenantId !== null) {
    if (!record.tenant || record.tenant.deletedAt || record.tenant.status !== TenantStatus.ACTIVE) {
      throw authTokenError('Tenant is inactive');
    }
  }

  if (input.expectedTenantId !== undefined && record.tenantId !== input.expectedTenantId) {
    throw authTokenError('Tenant mismatch');
  }

  const consumed = await input.db.authToken.updateMany({
    where: {
      id: record.id,
      consumedAt: null,
      revokedAt: null,
    },
    data: {
      consumedAt: now,
    },
  });

  if (consumed.count !== 1) {
    throw authTokenError();
  }

  return {
    id: record.id,
    userId: record.userId,
    tenantId: record.tenantId,
    purpose: record.purpose,
    expiresAt: record.expiresAt,
  };
}
