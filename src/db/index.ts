import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

neonConfig.fetchConnectionCache = true;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

let db: NeonHttpDatabase<typeof schema> | undefined;

/** Neon HTTP driver — works in Node dev and Cloudflare Workers. */
export function getDb() {
  if (!db) {
    db = drizzle(neon(getDatabaseUrl()), { schema });
  }
  return db;
}
