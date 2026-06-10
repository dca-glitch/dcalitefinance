import type { NextFunction, Request, Response } from 'express';
import { UserStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { verifyAccessToken } from '../utils/jwt';

function bearerToken(req: Request): string | null {
  const header = req.get('authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = bearerToken(req);

    if (!token) {
      throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        tokenVersion: true,
      },
    });

    if (!user || user.tokenVersion !== payload.tv) {
      throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
    }

    const session = await prisma.userSession.findFirst({
      where: {
        id: payload.sid,
        userId: user.id,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: { id: true },
    });

    if (!session) {
      throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
    }

    req.auth = {
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError('Unauthenticated', 401, 'UNAUTHENTICATED'));
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req);
  if (!token) {
    next();
    return;
  }

  await requireAuth(req, _res, next);
}
