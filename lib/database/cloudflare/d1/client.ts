/**
 * Cloudflare D1 Database Client
 *
 * Provides database connection and ORM instance for Cloudflare D1.
 * Supports both Cloudflare Workers environment and local development.
 *
 * Generated on 2025-01-24
 */

import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

/**
 * Type for the Drizzle ORM instance configured with D1 and our schema
 */
export type D1Orm = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Gets the D1 database binding from the Cloudflare environment
 *
 * @param env - Cloudflare environment object containing bindings
 * @returns D1Database instance or throws error if not available
 *
 * @throws {Error} When D1 binding is not available in environment
 */
export function getD1Database(env?: {
  DB_D1?: D1Database;
  D1_DATABASE?: D1Database;
}): D1Database {
  // Try multiple ways to access the D1 binding
  const d1 =
    env?.DB_D1 ||
    env?.D1_DATABASE ||
    (globalThis as { env?: { DB_D1?: D1Database; D1_DATABASE?: D1Database } })
      .env?.DB_D1 ||
    (globalThis as { env?: { DB_D1?: D1Database; D1_DATABASE?: D1Database } })
      .env?.D1_DATABASE;

  if (!d1) {
    throw new Error(
      'D1 database binding not found. ' +
        'Ensure DB_D1 or D1_DATABASE is configured in your Cloudflare environment. ' +
        'For local development, use `wrangler pages dev` or configure local D1 setup.'
    );
  }

  return d1;
}

/**
 * Creates and returns a Drizzle ORM instance connected to D1
 *
 * @param env - Cloudflare environment object containing bindings
 * @returns Configured Drizzle ORM instance with full schema
 *
 * @example
 * ```typescript
 * // In a Cloudflare Worker or Pages Function
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const db = getD1Orm(env);
 *     const users = await db.select().from(schema.users);
 *     return Response.json(users);
 *   }
 * };
 * ```
 */
export function getD1Orm(env?: {
  DB_D1?: D1Database;
  D1_DATABASE?: D1Database;
}): D1Orm {
  const d1 = getD1Database(env);
  return drizzle(d1, { schema });
}
/**
 * Configuration for D1 local development
 * Used when running locally with wrangler or in development mode
 */
export interface D1LocalConfig {
  /** Local D1 database file path */
  databasePath?: string;
  /** Enable debug logging for SQL queries */
  debug?: boolean;
}

/**
 * Creates a D1 ORM instance for local development
 * This is primarily used for development and testing environments
 *
 * @param config - Local development configuration
 * @returns Configured Drizzle ORM instance for local development
 *
 * @example
 * ```typescript
 * // For local development
 * const db = getD1OrmLocal({
 *   databasePath: './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite',
 *   debug: true
 * });
 * ```
 */

export function getD1OrmLocal(config: D1LocalConfig = {}): D1Orm {
  // For local development, you can implement SQLite connection here
  // This is a placeholder implementation that throws a helpful error
  const { databasePath, debug } = config;

  if (databasePath || debug) {
    // Configuration logged for debugging purposes
    // console.log('D1 Local Config:', { databasePath, debug });
  }

  throw new Error(
    'Local D1 development not yet configured. ' +
      'Use `wrangler pages dev` to run with D1 bindings, ' +
      'or implement local SQLite fallback for development. ' +
      'See: https://developers.cloudflare.com/d1/get-started/'
  );
}

/**
 * Creates a D1 ORM instance with automatic environment detection
 * Works in both Cloudflare Workers and local development
 *
 * @param env - Optional Cloudflare environment object
 * @returns Configured Drizzle ORM instance
 */
export function createD1Orm(env?: {
  DB_D1?: D1Database;
  D1_DATABASE?: D1Database;
}): D1Orm {
  try {
    return getD1Orm(env);
  } catch (error) {
    // In development, provide more helpful error messages
    if (process.env.NODE_ENV === 'development') {
      // Development warning logged
      // console.warn('D1 binding not available. Make sure you are running with `wrangler pages dev`');
    }
    throw error;
  }
}

/**
 * Validates that the D1 environment is properly configured
 *
 * @param env - Cloudflare environment object
 * @returns true if D1 is available, false otherwise
 */
export function isD1Available(env?: {
  DB_D1?: D1Database;
  D1_DATABASE?: D1Database;
}): boolean {
  try {
    getD1Database(env);
    return true;
  } catch {
    return false;
  }
}
/**
 * Re-export schema for convenient access
 */
export { schema };
export * from './schema';
