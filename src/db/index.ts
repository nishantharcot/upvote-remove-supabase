import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  if (!client) {
    client = postgres(getDatabaseUrl(), { prepare: false });
  }
  return drizzle(client, { schema });
}
