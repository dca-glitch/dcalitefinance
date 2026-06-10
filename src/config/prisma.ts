import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (event: { message: string; target?: string }) => {
  logger.error({ event }, 'Prisma error');
});

prisma.$on('warn', (event: { message: string; target?: string }) => {
  logger.warn({ event }, 'Prisma warning');
});
