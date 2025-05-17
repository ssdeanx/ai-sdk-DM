import type { Config } from 'drizzle-kit';

export default {
  schema: './db/libsql/schema.ts',
  out: './drizzle/migrations/libsql',
  dbCredentials: {
    url: process.env.LIBSQL_DATABASE_URL || '',
    token: process.env.LIBSQL_AUTH_TOKEN,
  },
  dialect: 'sqlite',
} satisfies Config;
