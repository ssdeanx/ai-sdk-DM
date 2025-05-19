/**
 * Drizzle ORM utilities for Supabase (Postgres) and LibSQL.
 * Provides separate client initializers and generic helper functions.
 */
// Generated on May 19, 2025

import {
  drizzle as drizzlePg,
  PostgresJsDatabase,
} from 'drizzle-orm/postgres-js';
import {
  AnyPgTable,
  PgTableWithColumns,
} from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import { drizzle as drizzleLibSql, LibSQLDatabase } from 'drizzle-orm/libsql';
import {
  createClient as createLibSqlClient,
  Client as LibSqlClient,
} from '@libsql/client';
import {
  AnySQLiteTable,
  SQLiteTableWithColumns,
} from 'drizzle-orm/sqlite-core';
import { eq, SQL, sql } from 'drizzle-orm';

import * as supabaseDbSchema from '@/db/supabase/schema';
import * as libSqlDbSchema from '@/db/libsql/schema';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { z } from 'zod';

// Singleton instances for Drizzle clients
let supabaseDrizzleInstance: PostgresJsDatabase<
  typeof supabaseDbSchema
> | null = null;
let libsqlDrizzleInstance: LibSQLDatabase<typeof libSqlDbSchema> | null = null;
let rawLibsqlClientInstance: LibSqlClient | null = null; // For LibSQL raw client

/**
 * Get a Drizzle ORM client for Supabase (Postgres).
 * @returns {PostgresJsDatabase<typeof supabaseDbSchema>} Drizzle ORM client for Supabase.
 * @throws Error if DATABASE_URL (for Supabase) is not set.
 */
export const getSupabaseDrizzleClient = (): PostgresJsDatabase<
  typeof supabaseDbSchema
> => {
  // Generated on May 19, 2025
  if (supabaseDrizzleInstance) {
    return supabaseDrizzleInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'Supabase DATABASE_URL not found. Please set DATABASE_URL environment variable for Supabase (Postgres) connection.'
    );
  }

  try {
    const pgClient = postgres(connectionString, { max: 10 }); // Adjust pool size as needed
    supabaseDrizzleInstance = drizzlePg(pgClient, {
      schema: supabaseDbSchema,
      logger: process.env.NODE_ENV === 'development',
    });
    upstashLogger.info(
      'drizzle-supabase',
      'Supabase Drizzle client initialized successfully.'
    );
    return supabaseDrizzleInstance;
  } catch (error) {
    upstashLogger.error(
      'drizzle-supabase',
      'Failed to initialize Supabase Drizzle client',
      error instanceof Error ? error : { error: String(error) }
    );
    throw new Error(
      `Failed to initialize Supabase Drizzle client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Get a Drizzle ORM client for LibSQL.
 * @returns {LibSQLDatabase<typeof libSqlDbSchema>} Drizzle ORM client for LibSQL.
 * @throws Error if LIBSQL_DATABASE_URL is not set.
 */
export const getLibsqlDrizzleClient = (): LibSQLDatabase<
  typeof libSqlDbSchema
> => {
  // Generated on May 19, 2025
  if (libsqlDrizzleInstance) {
    return libsqlDrizzleInstance;
  }

  const dbUrl = process.env.LIBSQL_DATABASE_URL;
  const authToken = process.env.LIBSQL_AUTH_TOKEN;

  if (!dbUrl) {
    throw new Error(
      'LibSQL database URL not found. Please set LIBSQL_DATABASE_URL environment variable.'
    );
  }
  if (
    dbUrl.startsWith('libsql://') &&
    dbUrl.includes('.turso.io') &&
    !authToken
  ) {
    upstashLogger.warn(
      'drizzle-libsql',
      'LIBSQL_AUTH_TOKEN is not set for remote Turso DB. This might be required.'
    );
  }

  try {
    if (!rawLibsqlClientInstance) {
      rawLibsqlClientInstance = createLibSqlClient({
        url: dbUrl,
        authToken: authToken,
      });
    }
    libsqlDrizzleInstance = drizzleLibSql(rawLibsqlClientInstance, {
      schema: libSqlDbSchema,
      logger: process.env.NODE_ENV === 'development',
    });
    upstashLogger.info(
      'drizzle-libsql',
      'LibSQL Drizzle client initialized successfully.'
    );
    return libsqlDrizzleInstance;
  } catch (error) {
    upstashLogger.error(
      'drizzle-libsql',
      'Failed to initialize LibSQL Drizzle client',
      error instanceof Error ? error : { error: String(error) }
    );
    throw new Error(
      `Failed to initialize LibSQL Drizzle client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Check if the Supabase Drizzle client is available.
 * @returns {Promise<boolean>} True if available.
 */
export const isSupabaseDrizzleAvailable = async (): Promise<boolean> => {
  // Generated on May 19, 2025
  try {
    const db = getSupabaseDrizzleClient();
    if (!supabaseDbSchema.users) {
      await db.execute('SELECT 1'); // Generic check
    } else {
      await db.select().from(supabaseDbSchema.users).limit(1);
    }
    return true;
  } catch (error) {
    await upstashLogger.error(
      'drizzle-supabase',
      'Error checking Supabase Drizzle availability',
      error instanceof Error ? error : { error: String(error) }
    );
    return false;
  }
};

/**
 * Check if the LibSQL Drizzle client is available.
 * @returns {Promise<boolean>} True if available.
 */
export const isLibsqlDrizzleAvailable = async (): Promise<boolean> => {
  // Generated on May 19, 2025
  try {
    const db = getLibsqlDrizzleClient();
    // Use a generic query for LibSQL as schema details (e.g., a 'models' table) are not guaranteed.
    // This avoids potential compile-time errors if 'libSqlDbSchema.models' does not exist.
    await db.run(sql`SELECT 1`); // Generic check for SQLite based
    return true;
  } catch (error) {
    await upstashLogger.error(
      'drizzle-libsql',
      'Error checking LibSQL Drizzle availability',
      error instanceof Error ? error : { error: String(error) }
    );
    return false;
  }
};

// --- SUPABASE (POSTGRES) CRUD HELPERS ---

/**
 * Get a row by ID from a Supabase (Postgres) table using Drizzle and validate with Zod.
 */
export async function getByIdWithSupabaseDrizzle<
  TTable extends { id: { name: string } },
  TRow,
  TZodSchema extends z.ZodType<TRow, any, any>
>(
  db: PostgresJsDatabase<typeof supabaseDbSchema>,
  table: TTable,
  zodSchema: TZodSchema,
  id: string
): Promise<TRow | null> {
  try {
    // @ts-expect-error: Drizzle table typing
    const result = await db.select().from(table).where(eq(table.id, id)).limit(1);
    const row = result[0];
    if (!row) return null;
    const parsed = zodSchema.safeParse(row);
    if (!parsed.success) {
      await upstashLogger.error('drizzle-supabase', 'Validation failed in getByIdWithSupabaseDrizzle', { error: parsed.error.flatten(), row });
      return null;
    }
    return parsed.data;
  } catch (error) {
    await upstashLogger.error('drizzle-supabase', 'Error in getByIdWithSupabaseDrizzle', error instanceof Error ? error : { error: String(error) });
    return null;
  }
}

export async function getAllWithSupabaseDrizzle<
  TTable,
  TRow,
  TZodSchema extends z.ZodType<TRow, any, any>
>(
  db: PostgresJsDatabase<typeof supabaseDbSchema>,
  table: TTable,
  zodSchema: TZodSchema
): Promise<TRow[]> {
  try {
    // @ts-expect-error: Drizzle table typing
    const result = await db.select().from(table);
    return result
      .map((row: unknown) => zodSchema.safeParse(row))
      .filter((parsed: z.SafeParseReturnType<TRow>) => parsed.success)
      .map((parsed: z.SafeParseReturnType<TRow>) => (parsed as z.SafeParseSuccess<TRow>).data);
  } catch (error) {
    await upstashLogger.error('drizzle-supabase', 'Error in getAllWithSupabaseDrizzle', error instanceof Error ? error : { error: String(error) });
    return [];
  }
}

export async function createWithSupabaseDrizzle<
  TTable,
  TRow,
  TZodSchema extends z.ZodType<TRow, any, any>
>(
  db: PostgresJsDatabase<typeof supabaseDbSchema>,
  table: TTable,
  zodSchema: TZodSchema,
  data: unknown
): Promise<TRow | null> {
  try {
    const parsed = zodSchema.safeParse(data);
    if (!parsed.success) {
      await upstashLogger.error('drizzle-supabase', 'Validation failed in createWithSupabaseDrizzle', { error: parsed.error.flatten(), data });
      return null;
    }
    // @ts-expect-error: Drizzle table typing
    const result = await db.insert(table).values(parsed.data).returning();
    const row = result[0];
    if (!row) return null;
    const out = zodSchema.safeParse(row);
    if (!out.success) {
      await upstashLogger.error('drizzle-supabase', 'Output validation failed in createWithSupabaseDrizzle', { error: out.error.flatten(), row });
      return null;
    }
    return out.data;
  } catch (error) {
    await upstashLogger.error('drizzle-supabase', 'Error in createWithSupabaseDrizzle', error instanceof Error ? error : { error: String(error) });
    return null;
  }
}

export async function updateWithSupabaseDrizzle<
  TTable extends { id: { name: string } },
  TRow,
  TZodSchema extends z.ZodType<TRow, any, any>
>(
  db: PostgresJsDatabase<typeof supabaseDbSchema>,
  table: TTable,
  zodSchema: TZodSchema,
  id: string,
  data: Partial<TRow>
): Promise<TRow | null> {
  try {
    // @ts-expect-error: Drizzle table typing
    const currentRows = await db.select().from(table).where(eq(table.id, id)).limit(1);
    const current = currentRows[0];
    if (!current) return null;
    const merged = { ...current, ...data, id };
    const parsed = zodSchema.safeParse(merged);
    if (!parsed.success) {
      await upstashLogger.error('drizzle-supabase', 'Validation failed in updateWithSupabaseDrizzle', { error: parsed.error.flatten(), merged });
      return null;
    }
    // @ts-expect-error: Drizzle table typing
    const result = await db.update(table).set(parsed.data).where(eq(table.id, id)).returning();
    const row = result[0];
    if (!row) return null;
    const out = zodSchema.safeParse(row);
    if (!out.success) {
      await upstashLogger.error('drizzle-supabase', 'Output validation failed in updateWithSupabaseDrizzle', { error: out.error.flatten(), row });
      return null;
    }
    return out.data;
  } catch (error) {
    await upstashLogger.error('drizzle-supabase', 'Error in updateWithSupabaseDrizzle', error instanceof Error ? error : { error: String(error) });
    return null;
  }
}

export async function deleteWithSupabaseDrizzle<
  TTable extends { id: { name: string } }
>(
  db: PostgresJsDatabase<typeof supabaseDbSchema>,
  table: TTable,
  id: string
): Promise<boolean> {
  try {
    // @ts-expect-error: Drizzle table typing
    const result = await db.delete(table).where(eq(table.id, id));
    if ('rowCount' in result) return result.rowCount > 0;
    if (Array.isArray(result)) return result.length > 0;
    return false;
  } catch (error) {
    await upstashLogger.error('drizzle-supabase', 'Error in deleteWithSupabaseDrizzle', error instanceof Error ? error : { error: String(error) });
    return false;
  }
}

// --- LIBSQL (SQLITE) CRUD HELPERS ---

/**
 * Get a row by ID from a LibSQL (SQLite) table using Drizzle and validate with Zod.
 */
export async function getByIdWithLibsqlDrizzle<
  TTable extends { id: { name: string } },
  TRow,
  TZodSchema extends z.ZodType<TRow, any, any>
>(
  db: LibSQLDatabase<typeof libSqlDbSchema>,
  table: TTable,
  zodSchema: TZodSchema,
  id: string
): Promise<TRow | null> {
  try {
    // @ts-expect-error: Drizzle table typing
    const result = await db.select().from(table).where(eq(table.id, id)).all();
    const row = result[0];
    if (!row) return null;
    const parsed = zodSchema.safeParse(row);
    if (!parsed.success) {
      await upstashLogger.error('drizzle-libsql', 'Validation failed in getByIdWithLibsqlDrizzle', { error: parsed.error.flatten(), row });
      return null;
    }
    return parsed.data;
  } catch (error) {
    await upstashLogger.error('drizzle-libsql', 'Error in getByIdWithLibsqlDrizzle', error instanceof Error ? error : { error: String(error) });
    return null;
  }
}

export async function getAllWithLibsqlDrizzle<
  TTable,
  TRow,
  TZodSchema extends z.ZodType<TRow, any, any>
>(
  db: LibSQLDatabase<typeof libSqlDbSchema>,
  table: TTable,
  zodSchema: TZodSchema
): Promise<TRow[]> {
  try {
    // @ts-expect-error: Drizzle table typing
    const result = await db.select().from(table).all();
    return result
      .map((row: unknown) => zodSchema.safeParse(row))
      .filter((parsed: z.SafeParseReturnType<TRow>) => parsed.success)
      .map((parsed: z.SafeParseReturnType<TRow>) => (parsed as z.SafeParseSuccess<TRow>).data);
  } catch (error) {
    await upstashLogger.error('drizzle-libsql', 'Error in getAllWithLibsqlDrizzle', error instanceof Error ? error : { error: String(error) });
    return [];
  }
}

export async function createWithLibsqlDrizzle<
  TTable,
  TRow,
  TZodSchema extends z.ZodType<TRow, any, any>
>(
  db: LibSQLDatabase<typeof libSqlDbSchema>,
  table: TTable,
  zodSchema: TZodSchema,
  data: unknown
): Promise<TRow | null> {
  try {
    const parsed = zodSchema.safeParse(data);
    if (!parsed.success) {
      await upstashLogger.error('drizzle-libsql', 'Validation failed in createWithLibsqlDrizzle', { error: parsed.error.flatten(), data });
      return null;
    }
    // @ts-expect-error: Drizzle table typing
    const result = await db.insert(table).values(parsed.data).all();
    const row = result[0];
    if (!row) return null;
    const out = zodSchema.safeParse(row);
    if (!out.success) {
      await upstashLogger.error('drizzle-libsql', 'Output validation failed in createWithLibsqlDrizzle', { error: out.error.flatten(), row });
      return null;
    }
    return out.data;
  } catch (error) {
    await upstashLogger.error('drizzle-libsql', 'Error in createWithLibsqlDrizzle', error instanceof Error ? error : { error: String(error) });
    return null;
  }
}

export async function updateWithLibsqlDrizzle<
  TTable extends { id: { name: string } },
  TRow,
  TZodSchema extends z.ZodType<TRow, any, any>
>(
  db: LibSQLDatabase<typeof libSqlDbSchema>,
  table: TTable,
  zodSchema: TZodSchema,
  id: string,
  data: Partial<TRow>
): Promise<TRow | null> {
  try {
    // @ts-expect-error: Drizzle table typing
    const currentRows = await db.select().from(table).where(eq(table.id, id)).all();
    const current = currentRows[0];
    if (!current) return null;
    const merged = { ...current, ...data, id };
    const parsed = zodSchema.safeParse(merged);
    if (!parsed.success) {
      await upstashLogger.error('drizzle-libsql', 'Validation failed in updateWithLibsqlDrizzle', { error: parsed.error.flatten(), merged });
      return null;
    }
    // @ts-expect-error: Drizzle table typing
    const result = await db.update(table).set(parsed.data).where(eq(table.id, id)).all();
    const row = result[0];
    if (!row) return null;
    const out = zodSchema.safeParse(row);
    if (!out.success) {
      await upstashLogger.error('drizzle-libsql', 'Output validation failed in updateWithLibsqlDrizzle', { error: out.error.flatten(), row });
      return null;
    }
    return out.data;
  } catch (error) {
    await upstashLogger.error('drizzle-libsql', 'Error in updateWithLibsqlDrizzle', error instanceof Error ? error : { error: String(error) });
    return null;
  }
}

export async function deleteWithLibsqlDrizzle<
  TTable extends { id: { name: string } }
>(
  db: LibSQLDatabase<typeof libSqlDbSchema>,
  table: TTable,
  id: string
): Promise<boolean> {
  try {
    // @ts-expect-error: Drizzle table typing
    const result = await db.delete(table).where(eq(table.id, id)).all();
    if (Array.isArray(result)) return result.length > 0;
    if ('rowsAffected' in result) return result.rowsAffected > 0;
    return false;
  } catch (error) {
    await upstashLogger.error('drizzle-libsql', 'Error in deleteWithLibsqlDrizzle', error instanceof Error ? error : { error: String(error) });
    return false;
  }
}
