import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Server-only Drizzle client.
 * Do not import from client islands or src/components/public.
 */
function createClient() {
  const url = import.meta.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');
  }

  const queryClient = postgres(url, { max: 4 });
  return drizzle(queryClient, { schema });
}

let cached: ReturnType<typeof createClient> | undefined;

export function getDb() {
  if (!cached) {
    cached = createClient();
  }
  return cached;
}
