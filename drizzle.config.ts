import type { Config } from 'drizzle-kit';

export default [
  {
    schema: './db/supabase/schema.ts',
    out: './drizzle',
    dialect: 'postgresql', // 'pg' is not a valid dialect, use 'postgresql'
    dbCredentials: { // Use dbCredentials instead of connectionString
      url: process.env.SUPABASE_URL!, // Add non-null assertion or handle undefined
    },
  },
  {
    schema: './db/libsql/schema.ts',
    out: './drizzle-libsql',
    dialect: 'sqlite', // Use 'sqlite' dialect
    dbCredentials: { // Use dbCredentials instead of connectionString
      url: process.env.LIBSQL_DATABASE_URL!, // Add non-null assertion or handle undefined
    },
  },
] satisfies Config[]; // Export array directly and use 'satisfies' for type checking