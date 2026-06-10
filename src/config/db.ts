import { Pool } from 'pg';
import { env } from './env';
import { logger } from './logger';

export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
});

export async function checkDatabaseConnection(): Promise<void> {
  const client = await dbPool.connect();

  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await dbPool.end();
  logger.info('Database pool closed');
}
