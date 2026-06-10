import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: env.REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieOptions());
}
