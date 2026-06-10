import { createServer } from 'node:http';
import { createApp } from './app';
import { closeDatabaseConnection } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { closePrismaConnection } from './config/prisma';

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'DCA Books Lite API started');
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, 'HTTP server shutdown failed');
      process.exit(1);
    }

    await closePrismaConnection();
    await closeDatabaseConnection();
    logger.info('Shutdown complete');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
