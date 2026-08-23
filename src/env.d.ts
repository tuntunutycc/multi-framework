/// <reference types="astro/client" />

import type { AuthUser } from '@/lib/auth';

declare namespace App {
  interface Locals {
    session?: AuthUser;
  }
}

interface ImportMetaEnv {
  readonly DATABASE_URL?: string;
  readonly SQLITE_PATH?: string;
  readonly SESSION_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
