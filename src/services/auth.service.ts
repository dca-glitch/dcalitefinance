import type { Request } from 'express';
import { AuditActorType, AuditAction, MembershipStatus, TenantStatus, UserStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { generateOpaqueToken, hashToken, verifyPassword } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';
import { normalizeEmail } from '../utils/email';
import { writeAuditLog } from './audit.service';

interface LoginInput {
  email: string;
  password: string;
  request: Request;
}

interface RefreshInput {
  refreshToken: string;
  request: Request;
}

interface LogoutInput {
  refreshToken?: string;
  userId?: string;
  request: Request;
}

interface AuthUserResponse {
  id: string;
  email: string;
  displayName: string | null;
  status: UserStatus;
}

interface TenantMembershipResponse {
  id: string;
  name: string;
  slug: string;
  membershipStatus: MembershipStatus;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
  tenants: TenantMembershipResponse[];
}

function refreshExpiryDate(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function buildAccessToken(user: { id: string; tokenVersion: number }, sessionId: string): string {
  return signAccessToken({
    sub: user.id,
    sid: sessionId,
    typ: 'access',
    tv: user.tokenVersion,
  });
}

async function createSession(input: { userId: string; request: Request }): Promise<{ id: string; refreshToken: string }> {
  const refreshToken = generateOpaqueToken();
  const session = await prisma.userSession.create({
    data: {
      userId: input.userId,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: input.request.get('user-agent') ?? null,
      ipAddress: input.request.ip ?? null,
      expiresAt: refreshExpiryDate(),
    },
    select: { id: true },
  });

  return { id: session.id, refreshToken };
}

async function activeTenantMemberships(userId: string): Promise<TenantMembershipResponse[]> {
  const memberships = await prisma.tenantMembership.findMany({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
      deletedAt: null,
      tenant: {
        status: TenantStatus.ACTIVE,
        deletedAt: null,
      },
    },
    include: {
      tenant: true,
    },
    orderBy: {
      tenant: {
        name: 'asc',
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.tenant.id,
    name: membership.tenant.name,
    slug: membership.tenant.slug,
    membershipStatus: membership.status,
  }));
}

async function revokeAllActiveUserSessions(input: {
  userId: string;
  revokedById: string;
  reason: string;
  request: Request;
}): Promise<void> {
  await prisma.userSession.updateMany({
    where: {
      userId: input.userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedById: input.revokedById,
      revocationReason: input.reason,
    },
  });

  await writeAuditLog({
    actorType: AuditActorType.SYSTEM,
    action: AuditAction.TOKEN_REUSE_DETECTED,
    actorUserId: input.userId,
    request: input.request,
    entityType: 'UserSession',
    entityId: input.revokedById,
    metadata: { reason: input.reason },
  });
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const normalizedEmail = normalizeEmail(input.email);
  const genericError = new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE || !user.passwordHash) {
    await writeAuditLog({
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.LOGIN_FAILED,
      request: input.request,
      metadata: { email: normalizedEmail, reason: 'invalid_credentials_or_inactive_user' },
    });
    throw genericError;
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);

  if (!passwordValid) {
    await writeAuditLog({
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.LOGIN_FAILED,
      actorUserId: user.id,
      request: input.request,
      metadata: { email: normalizedEmail, reason: 'invalid_password' },
    });
    throw genericError;
  }

  const session = await createSession({ userId: user.id, request: input.request });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.LOGIN,
    actorUserId: user.id,
    request: input.request,
    entityType: 'UserSession',
    entityId: session.id,
  });

  return {
    accessToken: buildAccessToken(user, session.id),
    refreshToken: session.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
    },
    tenants: await activeTenantMemberships(user.id),
  };
}

export async function refresh(input: RefreshInput): Promise<AuthResponse> {
  const incomingHash = hashToken(input.refreshToken);

  const existingSession = await prisma.userSession.findUnique({
    where: { refreshTokenHash: incomingHash },
    include: { user: true },
  });

  if (!existingSession) {
    throw new AppError('Invalid session', 401, 'INVALID_SESSION');
  }

  const now = new Date();
  const isReused = existingSession.revokedAt !== null || existingSession.replacedById !== null;

  if (isReused) {
    await revokeAllActiveUserSessions({
      userId: existingSession.userId,
      revokedById: existingSession.id,
      reason: 'REUSED',
      request: input.request,
    });

    throw new AppError('Invalid session', 401, 'INVALID_SESSION');
  }

  if (existingSession.expiresAt <= now || existingSession.user.deletedAt || existingSession.user.status !== UserStatus.ACTIVE) {
    await prisma.userSession.updateMany({
      where: {
        id: existingSession.id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        revocationReason: existingSession.expiresAt <= now ? 'EXPIRED' : 'USER_INACTIVE',
      },
    });

    throw new AppError('Invalid session', 401, 'INVALID_SESSION');
  }

  const replacement = await prisma.$transaction(async (tx) => {
    const refreshToken = generateOpaqueToken();
    const newSession = await tx.userSession.create({
      data: {
        userId: existingSession.userId,
        refreshTokenHash: hashToken(refreshToken),
        userAgent: input.request.get('user-agent') ?? null,
        ipAddress: input.request.ip ?? null,
        expiresAt: refreshExpiryDate(),
      },
      select: { id: true },
    });

    const rotation = await tx.userSession.updateMany({
      where: {
        id: existingSession.id,
        revokedAt: null,
        replacedById: null,
      },
      data: {
        revokedAt: now,
        replacedById: newSession.id,
        revokedById: newSession.id,
        revocationReason: 'REPLACED',
        lastUsedAt: now,
      },
    });

    if (rotation.count !== 1) {
      await tx.userSession.delete({ where: { id: newSession.id } });
      throw new AppError('Invalid session', 401, 'INVALID_SESSION');
    }

    return { id: newSession.id, refreshToken };
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.TOKEN_REFRESH,
    actorUserId: existingSession.userId,
    request: input.request,
    entityType: 'UserSession',
    entityId: replacement.id,
  });

  return {
    accessToken: buildAccessToken(existingSession.user, replacement.id),
    refreshToken: replacement.refreshToken,
    user: {
      id: existingSession.user.id,
      email: existingSession.user.email,
      displayName: existingSession.user.displayName,
      status: existingSession.user.status,
    },
    tenants: await activeTenantMemberships(existingSession.userId),
  };
}

export async function logout(input: LogoutInput): Promise<void> {
  if (!input.refreshToken) {
    return;
  }

  const session = await prisma.userSession.findUnique({
    where: { refreshTokenHash: hashToken(input.refreshToken) },
  });

  if (!session || session.revokedAt) {
    return;
  }

  await prisma.userSession.updateMany({
    where: {
      id: session.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revocationReason: 'LOGOUT',
    },
  });

  await writeAuditLog({
    actorType: input.userId ? AuditActorType.USER : AuditActorType.SYSTEM,
    action: AuditAction.LOGOUT,
    actorUserId: input.userId ?? session.userId,
    request: input.request,
    entityType: 'UserSession',
    entityId: session.id,
  });
}

export async function me(userId: string): Promise<{ user: AuthUserResponse; tenants: TenantMembershipResponse[] }> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
    },
  });

  if (!user) {
    throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
  }

  return {
    user,
    tenants: await activeTenantMemberships(userId),
  };
}
