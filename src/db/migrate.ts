import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb, resetDbCache, resolveSqlitePath } from './client';

resetDbCache();
const db = getDb();
const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');

migrate(db, { migrationsFolder });
console.log(`Migrations applied to ${resolveSqlitePath()}`);
