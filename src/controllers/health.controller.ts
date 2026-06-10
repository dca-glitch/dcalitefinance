import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { toJsonSafe } from '../utils/json';

export function live(_req: Request, res: Response): void {
  res.status(200).json(
    toJsonSafe({
      success: true,
      status: 'ok',
      service: 'DCA Books Lite API',
      version: '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
    }),
  );
}

export async function ready(_req: Request, res: Response): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;

  res.status(200).json(
    toJsonSafe({
      success: true,
      status: 'ready',
      service: 'DCA Books Lite API',
      dependencies: {
        database: 'ok',
      },
    }),
  );
}
