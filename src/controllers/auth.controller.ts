import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import { clearRefreshCookie, setRefreshCookie } from '../utils/cookies';
import * as authService from '../services/auth.service';
import { setupPassword as setupPasswordService } from '../services/password.service';
import { env } from '../config/env';

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(200),
});

const setupPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(12).max(200),
});

function refreshTokenFromCookie(req: Request): string | undefined {
  const value = req.cookies?.[env.REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid login payload', 400, 'INVALID_LOGIN_PAYLOAD');
  }

  const result = await authService.login({
    email: parsed.data.email,
    password: parsed.data.password,
    request: req,
  });

  setRefreshCookie(res, result.refreshToken);

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
        tenants: result.tenants,
      },
    }),
  );
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = refreshTokenFromCookie(req);

  if (!refreshToken) {
    clearRefreshCookie(res);
    throw new AppError('Invalid session', 401, 'INVALID_SESSION');
  }

  try {
    const result = await authService.refresh({ refreshToken, request: req });
    setRefreshCookie(res, result.refreshToken);

    res.status(200).json(
      toJsonSafe({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
          tenants: result.tenants,
        },
      }),
    );
  } catch (error) {
    clearRefreshCookie(res);
    throw error;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = refreshTokenFromCookie(req);
  await authService.logout({ refreshToken, userId: req.auth?.userId, request: req });
  clearRefreshCookie(res);

  res.status(200).json(
    toJsonSafe({
      success: true,
    }),
  );
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
  }

  const result = await authService.me(req.auth.userId);

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: result,
    }),
  );
}

export async function setupPassword(req: Request, res: Response): Promise<void> {
  const parsed = setupPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid setup password payload', 400, 'INVALID_SETUP_PASSWORD_PAYLOAD');
  }

  await setupPasswordService({
    token: parsed.data.token,
    password: parsed.data.password,
    request: req,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
    }),
  );
}
