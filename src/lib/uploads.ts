import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Root on disk: ./public/uploads (override with UPLOADS_DIR for LXC volumes). */
export function getUploadsRoot(): string {
  const fromEnv = process.env.UPLOADS_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), 'public', 'uploads');
}

/** Safe folder segment from session tenantId, e.g. tenant_riverside → tenant-riverside */
export function tenantUploadDirName(tenantId: string): string {
  const safe = tenantId.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
  if (!safe) throw new Error('Invalid tenantId for upload path');
  return `tenant-${safe}`;
}

export function resolveTenantUploadDir(tenantId: string): string {
  return path.join(getUploadsRoot(), tenantUploadDirName(tenantId));
}

/** Public URL path returned to the client (served by /uploads/[...path]). */
export function publicUploadUrl(tenantId: string, filename: string): string {
  return `/uploads/${tenantUploadDirName(tenantId)}/${filename}`;
}

export type SavedUpload = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * Persist an image under public/uploads/tenant-{id}/ and return its public URL.
 */
export async function saveTenantUpload(tenantId: string, file: File): Promise<SavedUpload> {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new UploadError('Missing file', 400);
  }

  const mimeType = (file.type || '').toLowerCase();
  const ext = ALLOWED_MIME[mimeType];
  if (!ext) {
    throw new UploadError('Only JPEG, PNG, WebP, and GIF images are allowed', 400);
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new UploadError('Image must be between 1 byte and 5 MB', 400);
  }

  const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  const dir = resolveTenantUploadDir(tenantId);
  const absolutePath = path.join(dir, filename);

  // Path traversal guard
  const root = getUploadsRoot();
  if (!absolutePath.startsWith(root + path.sep) && absolutePath !== root) {
    throw new UploadError('Invalid upload path', 400);
  }

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return {
    url: publicUploadUrl(tenantId, filename),
    filename,
    mimeType,
    size: file.size,
  };
}

export class UploadError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}
