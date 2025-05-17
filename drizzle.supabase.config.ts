import type { Config } from 'drizzle-kit';

export default {
  schema: './db/supabase/schema.ts',
  out: './drizzle/migrations/supabase',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  dialect: 'postgresql',
} satisfies Config;
