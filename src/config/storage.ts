import fs from 'node:fs';
import path from 'node:path';
import { env } from './env';

export const FILE_STORAGE_ROOT = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);

export function ensureFileStorageRoot(): void {
  fs.mkdirSync(FILE_STORAGE_ROOT, { recursive: true });
}

export function buildAttachmentStorageDirectory(tenantId: string, entityType: string): string {
  return path.join(FILE_STORAGE_ROOT, tenantId, entityType.toLowerCase());
}

export function buildAttachmentStorageKey(tenantId: string, entityType: string, storedFilename: string): string {
  return path.join(tenantId, entityType.toLowerCase(), storedFilename).replace(/\\/g, '/');
}
