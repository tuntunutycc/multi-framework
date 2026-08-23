import type { APIRoute } from 'astro';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { getUploadsRoot } from '@/lib/uploads';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * GET /uploads/tenant-{id}/filename.ext
 * Serves files written under public/uploads (works in Docker/LXC when the dir is mounted).
 */
export const GET: APIRoute = async ({ params }) => {
  const segments = params.path;
  if (!segments) {
    return new Response('Not found', { status: 404 });
  }

  const parts = Array.isArray(segments) ? segments : segments.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    return new Response('Not found', { status: 404 });
  }

  const root = getUploadsRoot();
  const absolute = path.resolve(root, ...parts);

  if (!absolute.startsWith(root + path.sep)) {
    return new Response('Not found', { status: 404 });
  }

  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    return new Response('Not found', { status: 404 });
  }

  const ext = path.extname(absolute).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream;

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
