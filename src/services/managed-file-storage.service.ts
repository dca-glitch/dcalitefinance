import { createHash, createSign, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { StorageProvider, type FileAttachmentEntityType } from '@prisma/client';
import { env } from '../config/env';
import { FILE_STORAGE_ROOT } from '../config/storage';
import { AppError } from '../errors/AppError';

export interface ManagedFileStorageInput {
  tenantId: string;
  entityType: FileAttachmentEntityType;
  folderSegments: string[];
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface ManagedFileStorageResult {
  storageProvider: StorageProvider;
  storageKey: string;
  storedFilename: string;
  googleDriveFileId: string | null;
  googleDriveWebViewLink: string | null;
  googleDriveWebContentLink: string | null;
}

export interface ManagedFileDeleteInput {
  storageProvider: StorageProvider;
  storageKey: string;
  googleDriveFileId?: string | null;
}

interface DriveCredentials {
  clientEmail: string;
  privateKey: string;
}

interface DriveAccessToken {
  token: string;
  expiresAtMs: number;
}

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DRIVE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

let cachedDriveCredentials: DriveCredentials | null = null;
let cachedDriveAccessToken: DriveAccessToken | null = null;
const folderCache = new Map<string, string>();

function storageConfigError(message: string, code: string): AppError {
  return new AppError(message, 500, code);
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|\u0000]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+$/, '_');

  return sanitized.length > 0 ? sanitized : '_';
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n').trim();
}

function loadDriveCredentialsFromEnv(): DriveCredentials {
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { clientEmail: '', privateKey: '' };
  }

  const clientEmail = env.GOOGLE_DRIVE_CLIENT_EMAIL ?? env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.GOOGLE_DRIVE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw storageConfigError('Google Drive credentials are not configured', 'GOOGLE_DRIVE_NOT_CONFIGURED');
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

async function loadDriveCredentials(): Promise<DriveCredentials> {
  if (cachedDriveCredentials) {
    return cachedDriveCredentials;
  }

  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credentialsRaw = await fs.readFile(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
    const parsed = JSON.parse(credentialsRaw) as { client_email?: string; private_key?: string };

    if (!parsed.client_email || !parsed.private_key) {
      throw storageConfigError('Google Drive credential file is missing required fields', 'GOOGLE_DRIVE_INVALID_CREDENTIALS');
    }

    cachedDriveCredentials = {
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key),
    };
    return cachedDriveCredentials;
  }

  cachedDriveCredentials = loadDriveCredentialsFromEnv();
  return cachedDriveCredentials;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getDriveAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedDriveAccessToken && cachedDriveAccessToken.expiresAtMs - 60_000 > now) {
    return cachedDriveAccessToken.token;
  }

  const credentials = await loadDriveCredentials();
  const clientEmail = credentials.clientEmail;

  if (!clientEmail) {
    throw storageConfigError('Google Drive client email is missing', 'GOOGLE_DRIVE_INVALID_CREDENTIALS');
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: DRIVE_SCOPE,
      aud: DRIVE_TOKEN_URL,
      iat,
      exp,
    }),
  );
  const unsignedJwt = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(credentials.privateKey, 'base64url');

  const tokenResponse = await fetch(DRIVE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedJwt}.${signature}`,
    }),
  });

  if (!tokenResponse.ok) {
    throw storageConfigError('Google Drive access token request failed', 'GOOGLE_DRIVE_TOKEN_FAILED');
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };
  if (!tokenJson.access_token) {
    throw storageConfigError('Google Drive access token was not returned', 'GOOGLE_DRIVE_TOKEN_MISSING');
  }

  cachedDriveAccessToken = {
    token: tokenJson.access_token,
    expiresAtMs: now + (tokenJson.expires_in ?? 3600) * 1000,
  };

  return cachedDriveAccessToken.token;
}

async function driveRequest(pathname: string, init: RequestInit): Promise<Response> {
  const token = await getDriveAccessToken();
  return fetch(`https://www.googleapis.com${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

async function resolveRootFolderId(): Promise<string> {
  const rootFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (rootFolderId) {
    return rootFolderId;
  }

  const rootFolderName = env.GOOGLE_DRIVE_ROOT_FOLDER_NAME;
  if (!rootFolderName) {
    throw storageConfigError('Google Drive root folder is not configured', 'GOOGLE_DRIVE_ROOT_FOLDER_MISSING');
  }

  const cacheKey = `root:${rootFolderName}`;
  const cached = folderCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const searchParams = new URLSearchParams({
    q: [
      `mimeType='application/vnd.google-apps.folder'`,
      `name='${rootFolderName.replace(/'/g, "\\'")}'`,
      `'root' in parents`,
      'trashed=false',
    ].join(' and '),
    fields: 'files(id,name)',
    pageSize: '10',
  });

  const existingResponse = await driveRequest(`/drive/v3/files?${searchParams.toString()}`, {
    method: 'GET',
  });
  if (!existingResponse.ok) {
    throw storageConfigError('Unable to query Google Drive root folder', 'GOOGLE_DRIVE_FOLDER_LOOKUP_FAILED');
  }

  const existingJson = (await existingResponse.json()) as { files?: Array<{ id: string }> };
  const existingFolder = existingJson.files?.[0];
  if (existingFolder?.id) {
    folderCache.set(cacheKey, existingFolder.id);
    return existingFolder.id;
  }

  const createResponse = await driveRequest('/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      name: rootFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root'],
    }),
  });

  if (!createResponse.ok) {
    throw storageConfigError('Unable to create Google Drive root folder', 'GOOGLE_DRIVE_FOLDER_CREATE_FAILED');
  }

  const createJson = (await createResponse.json()) as { id?: string };
  if (!createJson.id) {
    throw storageConfigError('Google Drive root folder id was not returned', 'GOOGLE_DRIVE_FOLDER_CREATE_FAILED');
  }

  folderCache.set(cacheKey, createJson.id);
  return createJson.id;
}

async function resolveDriveFolder(parentId: string, name: string): Promise<string> {
  const cacheKey = `${parentId}:${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const safeName = name.replace(/'/g, "\\'");
  const searchParams = new URLSearchParams({
    q: [
      `mimeType='application/vnd.google-apps.folder'`,
      `name='${safeName}'`,
      `'${parentId}' in parents`,
      'trashed=false',
    ].join(' and '),
    fields: 'files(id,name)',
    pageSize: '10',
  });

  const existingResponse = await driveRequest(`/drive/v3/files?${searchParams.toString()}`, {
    method: 'GET',
  });
  if (!existingResponse.ok) {
    throw storageConfigError('Unable to query Google Drive folder', 'GOOGLE_DRIVE_FOLDER_LOOKUP_FAILED');
  }

  const existingJson = (await existingResponse.json()) as { files?: Array<{ id: string }> };
  const existingFolder = existingJson.files?.[0];
  if (existingFolder?.id) {
    folderCache.set(cacheKey, existingFolder.id);
    return existingFolder.id;
  }

  const createResponse = await driveRequest('/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  if (!createResponse.ok) {
    throw storageConfigError('Unable to create Google Drive folder', 'GOOGLE_DRIVE_FOLDER_CREATE_FAILED');
  }

  const createJson = (await createResponse.json()) as { id?: string };
  if (!createJson.id) {
    throw storageConfigError('Google Drive folder id was not returned', 'GOOGLE_DRIVE_FOLDER_CREATE_FAILED');
  }

  folderCache.set(cacheKey, createJson.id);
  return createJson.id;
}

async function resolveDriveFolderPath(segments: string[]): Promise<string> {
  let parentId = await resolveRootFolderId();
  for (const segment of segments) {
    parentId = await resolveDriveFolder(parentId, sanitizePathSegment(segment));
  }
  return parentId;
}

async function uploadToGoogleDrive(input: ManagedFileStorageInput, storageKey: string): Promise<ManagedFileStorageResult> {
  const folderId = await resolveDriveFolderPath(['tenants', input.tenantId, ...input.folderSegments]);
  const token = await getDriveAccessToken();
  const boundary = `----dca-books-lite-${randomUUID()}`;
  const metadata = {
    name: input.storedFilename,
    parents: [folderId],
  };
  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`),
    input.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await fetch(
    `${DRIVE_FILES_URL}?uploadType=multipart&fields=id,webViewLink,webContentLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  );

  if (!response.ok) {
    throw storageConfigError('Google Drive file upload failed', 'GOOGLE_DRIVE_UPLOAD_FAILED');
  }

  const json = (await response.json()) as { id?: string; webViewLink?: string; webContentLink?: string };
  if (!json.id) {
    throw storageConfigError('Google Drive file id was not returned', 'GOOGLE_DRIVE_UPLOAD_FAILED');
  }

  return {
    storageProvider: StorageProvider.GOOGLE_DRIVE,
    storageKey,
    storedFilename: input.storedFilename,
    googleDriveFileId: json.id,
    googleDriveWebViewLink: json.webViewLink ?? null,
    googleDriveWebContentLink: json.webContentLink ?? null,
  };
}

async function uploadToLocalFileSystem(input: ManagedFileStorageInput, storageKey: string): Promise<ManagedFileStorageResult> {
  const destinationPath = path.join(FILE_STORAGE_ROOT, storageKey);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.writeFile(destinationPath, input.buffer);

  return {
    storageProvider: StorageProvider.LOCAL,
    storageKey,
    storedFilename: input.storedFilename,
    googleDriveFileId: null,
    googleDriveWebViewLink: null,
    googleDriveWebContentLink: null,
  };
}

export async function storeManagedFile(input: ManagedFileStorageInput): Promise<ManagedFileStorageResult> {
  const storageKey = path.posix.join(
    'tenants',
    sanitizePathSegment(input.tenantId),
    ...input.folderSegments.map(sanitizePathSegment),
    input.storedFilename,
  );

  if (env.STORAGE_PROVIDER === 'GOOGLE_DRIVE') {
    return uploadToGoogleDrive(input, storageKey);
  }

  return uploadToLocalFileSystem(input, storageKey);
}

async function deleteFromLocalFileSystem(storageKey: string): Promise<void> {
  const absolutePath = path.join(FILE_STORAGE_ROOT, storageKey);
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

async function deleteFromGoogleDrive(fileId?: string | null): Promise<void> {
  if (!fileId) {
    return;
  }

  const response = await driveRequest(`/drive/v3/files/${fileId}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw storageConfigError('Google Drive file delete failed', 'GOOGLE_DRIVE_DELETE_FAILED');
  }
}

export async function deleteManagedFile(input: ManagedFileDeleteInput): Promise<void> {
  if (input.storageProvider === StorageProvider.GOOGLE_DRIVE) {
    await deleteFromGoogleDrive(input.googleDriveFileId);
    return;
  }

  await deleteFromLocalFileSystem(input.storageKey);
}

export function buildManagedStorageChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
