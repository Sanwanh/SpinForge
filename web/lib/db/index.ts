import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// postgres.js connects lazily (only on the first query), so importing this during
// `next build` (no live DB) or in the still-wallet-based flows is safe. A
// placeholder URL keeps construction from throwing when DATABASE_URL is unset;
// any actual query without a real DB will fail at request time (prod always has it).
const url = process.env.DATABASE_URL || 'postgres://placeholder:5432/spinforge';

const client = postgres(url, { prepare: false });
export const db = drizzle(client, { schema });
export { schema };
export const isDbConfigured = !!process.env.DATABASE_URL;
