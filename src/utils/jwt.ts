import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  typ: 'access';
  tv: number;
}

interface JwtPayloadWithClaims extends jwt.JwtPayload {
  sub: string;
  sid: string;
  typ: string;
  tv: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    algorithms: ['HS256'],
  });

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as JwtPayloadWithClaims;

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    payload.typ !== 'access' ||
    typeof payload.tv !== 'number'
  ) {
    throw new Error('Invalid token claims');
  }

  return {
    sub: payload.sub,
    sid: payload.sid,
    typ: 'access',
    tv: payload.tv,
  };
}
