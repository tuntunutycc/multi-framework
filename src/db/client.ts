import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type AppDb = ReturnType<typeof drizzle<typeof schema>>;

let cached: AppDb | undefined;
let testOverride: AppDb | undefined;

const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');

/** Default file: ./data/sqlite.db (override with SQLITE_PATH or DATABASE_URL=file:…). */
export function resolveSqlitePath(): string {
  const fromProcess = process.env.SQLITE_PATH?.trim() || process.env.DATABASE_URL?.trim();
  let fromMeta: string | undefined;
  try {
    fromMeta = import.meta.env?.SQLITE_PATH?.trim() || import.meta.env?.DATABASE_URL?.trim();
  } catch {
    // import.meta.env unavailable in some script contexts
  }

  const raw = fromProcess || fromMeta || './data/sqlite.db';

  if (raw === ':memory:' || raw.startsWith('file::memory:')) {
    return ':memory:';
  }

  const withoutScheme = raw.startsWith('file:') ? raw.slice('file:'.length) : raw;
  return path.isAbsolute(withoutScheme)
    ? withoutScheme
    : path.resolve(process.cwd(), withoutScheme);
}

function applyMigrations(db: AppDb): void {
  if (!fs.existsSync(migrationsFolder)) return;
  migrate(db, { migrationsFolder });
}

function createClient(filePath = resolveSqlitePath()): AppDb {
  if (filePath !== ':memory:') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  applyMigrations(db);
  return db;
}

/**
 * Server-only Drizzle client (better-sqlite3).
 * Do not import from client islands or src/components/public.
 */
export function getDb(): AppDb {
  if (testOverride) return testOverride;
  if (!cached) {
    cached = createClient();
  }
  return cached;
}

/** Vitest / scripts: inject an in-memory or alternate Drizzle instance. */
export function setDbOverride(db: AppDb | undefined): void {
  testOverride = db;
}

export function resetDbCache(): void {
  cached = undefined;
}

/** Build a fresh DB instance (used by tests). */
export function createSqliteDb(filePath: string): AppDb {
  return createClient(filePath);
}
