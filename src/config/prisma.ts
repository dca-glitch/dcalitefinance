import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (event) => {
  logger.error({ target: event.target, message: event.message }, 'Prisma error');
});

prisma.$on('warn', (event) => {
  logger.warn({ target: event.target, message: event.message }, 'Prisma warning');
});

export async function closePrismaConnection(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
}
