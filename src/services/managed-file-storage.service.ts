import { createHash, createHmac, createSign, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
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

export interface ManagedFileReadInput {
  storageProvider: StorageProvider;
  storageKey: string;
  googleDriveFileId?: string | null;
}

export interface ManagedFileReadResult {
  stream: Readable;
  contentType: string | null;
  contentLength: number | null;
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
const S3_SERVICE = 's3';
const DOCUMENT_LINK_TTL_MINUTES = 30;

let cachedDriveCredentials: DriveCredentials | null = null;
let cachedDriveAccessToken: DriveAccessToken | null = null;
const folderCache = new Map<string, string>();

interface S3CompatibleConfig {
  endpoint: URL;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function storageConfigError(message: string, code: string): AppError {
  return new AppError(message, 500, code);
}

function managedFileNotFoundError(): AppError {
  return new AppError('File not found', 404, 'MANAGED_FILE_NOT_FOUND');
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

function normalizeEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function resolveStoragePath(storageKey: string): string {
  const absolutePath = path.resolve(FILE_STORAGE_ROOT, storageKey);
  const rootPath = `${FILE_STORAGE_ROOT}${path.sep}`;

  if (!absolutePath.startsWith(rootPath) && absolutePath !== FILE_STORAGE_ROOT) {
    throw new AppError('Invalid storage key path', 400, 'INVALID_STORAGE_KEY_PATH');
  }

  return absolutePath;
}

function getS3CompatibleConfig(): S3CompatibleConfig {
  const endpoint = env.S3_ENDPOINT;
  const bucket = env.S3_BUCKET;
  const accessKeyId = env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw storageConfigError('S3-compatible storage is not configured', 'S3_COMPATIBLE_NOT_CONFIGURED');
  }

  return {
    endpoint: normalizeEndpoint(endpoint),
    bucket,
    region: env.S3_REGION || 'auto',
    accessKeyId,
    secretAccessKey,
  };
}

function formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return {
    amzDate: `${year}${month}${day}T${hours}${minutes}${seconds}Z`,
    dateStamp: `${year}${month}${day}`,
  };
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function encodeS3Key(storageKey: string): string {
  return storageKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildS3ObjectUrl(storageKey: string): URL {
  const config = getS3CompatibleConfig();
  const url = new URL(config.endpoint.toString());
  url.pathname = `/${config.bucket}/${encodeS3Key(storageKey)}`;
  url.search = '';
  url.hash = '';
  return url;
}

function buildSignedS3Headers(input: {
  method: string;
  storageKey: string;
  bodyHash: string;
  contentType?: string | null;
}): Record<string, string> {
  const config = getS3CompatibleConfig();
  const { amzDate, dateStamp } = formatAmzDate(new Date());
  const url = buildS3ObjectUrl(input.storageKey);

  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': input.bodyHash,
    'x-amz-date': amzDate,
  };

  if (input.contentType) {
    headers['content-type'] = input.contentType;
  }

  const sortedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderKeys.map((key) => `${key}:${headers[key].trim()}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');
  const canonicalRequest = [
    input.method.toUpperCase(),
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    input.bodyHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/${S3_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, config.region);
  const kService = hmacSha256(kRegion, S3_SERVICE);
  const signingKey = hmacSha256(kService, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function sendS3CompatibleRequest(input: {
  method: 'GET' | 'PUT' | 'DELETE';
  storageKey: string;
  body?: Buffer;
  contentType?: string | null;
}): Promise<Response> {
  const body = input.body ?? Buffer.alloc(0);
  const headers = buildSignedS3Headers({
    method: input.method,
    storageKey: input.storageKey,
    bodyHash: sha256Hex(body),
    contentType: input.contentType ?? null,
  });

  const response = await fetch(buildS3ObjectUrl(input.storageKey), {
    method: input.method,
    headers,
    body: input.method === 'GET' || input.method === 'DELETE' ? undefined : body,
  });

  return response;
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
    const credentialsRaw = await fsPromises.readFile(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
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
  const destinationPath = resolveStoragePath(storageKey);
  await fsPromises.mkdir(path.dirname(destinationPath), { recursive: true });
  await fsPromises.writeFile(destinationPath, input.buffer);

  return {
    storageProvider: StorageProvider.LOCAL,
    storageKey,
    storedFilename: input.storedFilename,
    googleDriveFileId: null,
    googleDriveWebViewLink: null,
    googleDriveWebContentLink: null,
  };
}

async function uploadToS3CompatibleStorage(input: ManagedFileStorageInput, storageKey: string): Promise<ManagedFileStorageResult> {
  const response = await sendS3CompatibleRequest({
    method: 'PUT',
    storageKey,
    body: input.buffer,
    contentType: input.mimeType,
  });

  if (!response.ok) {
    throw storageConfigError('S3-compatible file upload failed', 'S3_COMPATIBLE_UPLOAD_FAILED');
  }

  return {
    storageProvider: 'S3_COMPATIBLE' as StorageProvider,
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

  if (env.STORAGE_PROVIDER === 'S3_COMPATIBLE') {
    return uploadToS3CompatibleStorage(input, storageKey);
  }

  return uploadToLocalFileSystem(input, storageKey);
}

async function deleteFromLocalFileSystem(storageKey: string): Promise<void> {
  const absolutePath = resolveStoragePath(storageKey);
  try {
    await fsPromises.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

async function readFromLocalFileSystem(storageKey: string): Promise<ManagedFileReadResult> {
  const absolutePath = resolveStoragePath(storageKey);
  let stats: Awaited<ReturnType<typeof fsPromises.stat>>;

  try {
    stats = await fsPromises.stat(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw managedFileNotFoundError();
    }

    throw error;
  }

  return {
    stream: fs.createReadStream(absolutePath),
    contentType: null,
    contentLength: stats.size,
  };
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

async function readFromGoogleDrive(fileId?: string | null): Promise<ManagedFileReadResult> {
  if (!fileId) {
    throw storageConfigError('Google Drive file id is missing', 'GOOGLE_DRIVE_FILE_ID_MISSING');
  }

  const response = await driveRequest(`/drive/v3/files/${fileId}?alt=media`, {
    method: 'GET',
  });

  if (response.status === 404) {
    throw managedFileNotFoundError();
  }

  if (!response.ok || !response.body) {
    throw storageConfigError('Google Drive file download failed', 'GOOGLE_DRIVE_DOWNLOAD_FAILED');
  }

  return {
    stream: Readable.fromWeb(response.body as unknown as globalThis.ReadableStream<Uint8Array>),
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length') ? Number(response.headers.get('content-length')) : null,
  };
}

async function deleteFromS3CompatibleStorage(storageKey: string): Promise<void> {
  const response = await sendS3CompatibleRequest({
    method: 'DELETE',
    storageKey,
  });

  if (!response.ok && response.status !== 404) {
    throw storageConfigError('S3-compatible file delete failed', 'S3_COMPATIBLE_DELETE_FAILED');
  }
}

async function readFromS3CompatibleStorage(storageKey: string): Promise<ManagedFileReadResult> {
  const response = await sendS3CompatibleRequest({
    method: 'GET',
    storageKey,
  });

  if (response.status === 404) {
    throw managedFileNotFoundError();
  }

  if (!response.ok || !response.body) {
    throw storageConfigError('S3-compatible file download failed', 'S3_COMPATIBLE_DOWNLOAD_FAILED');
  }

  return {
    stream: Readable.fromWeb(response.body as unknown as globalThis.ReadableStream<Uint8Array>),
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length') ? Number(response.headers.get('content-length')) : null,
  };
}

export async function deleteManagedFile(input: ManagedFileDeleteInput): Promise<void> {
  if (input.storageProvider === StorageProvider.GOOGLE_DRIVE) {
    await deleteFromGoogleDrive(input.googleDriveFileId);
    return;
  }

  if (input.storageProvider === 'S3_COMPATIBLE') {
    await deleteFromS3CompatibleStorage(input.storageKey);
    return;
  }

  await deleteFromLocalFileSystem(input.storageKey);
}

export async function readManagedFile(input: ManagedFileReadInput): Promise<ManagedFileReadResult> {
  if (input.storageProvider === StorageProvider.GOOGLE_DRIVE) {
    return readFromGoogleDrive(input.googleDriveFileId);
  }

  if (input.storageProvider === 'S3_COMPATIBLE') {
    return readFromS3CompatibleStorage(input.storageKey);
  }

  return readFromLocalFileSystem(input.storageKey);
}

export function buildManagedStorageChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
