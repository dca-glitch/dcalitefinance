import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  typ: 'access';
  tv: number;
}

export interface FileAttachmentDocumentTokenPayload {
  sub: string;
  sid: string;
  tv: number;
  tid: string;
  aid: string;
  typ: 'file-document';
}

interface JwtPayloadWithClaims extends jwt.JwtPayload {
  sub: string;
  sid: string;
  typ: string;
  tv: number;
}

interface JwtPayloadWithDocumentClaims extends jwt.JwtPayload {
  sub: string;
  sid: string;
  tv: number;
  tid: string;
  aid: string;
  typ: string;
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

export function signFileAttachmentDocumentToken(payload: FileAttachmentDocumentTokenPayload): string {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: '30m',
  });
}

export function verifyFileAttachmentDocumentToken(token: string): FileAttachmentDocumentTokenPayload {
  const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    algorithms: ['HS256'],
  });

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as JwtPayloadWithDocumentClaims;

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    typeof payload.tv !== 'number' ||
    typeof payload.tid !== 'string' ||
    typeof payload.aid !== 'string' ||
    payload.typ !== 'file-document'
  ) {
    throw new Error('Invalid token claims');
  }

  return {
    sub: payload.sub,
    sid: payload.sid,
    tv: payload.tv,
    tid: payload.tid,
    aid: payload.aid,
    typ: 'file-document',
  };
}
