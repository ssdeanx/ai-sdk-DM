/**
 * Supabase Database Integration with Upstash Adapter Support
 *
 * This module provides database access through Supabase with the ability to
 * conditionally use Upstash Redis and Vector as a drop-in replacement.
 *
 * To use Upstash instead of Supabase, set the following environment variables:
 * - USE_UPSTASH_ADAPTER=true
 * - UPSTASH_REDIS_REST_URL=your_upstash_redis_url
 * - UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
 * - UPSTASH_VECTOR_REST_URL=your_upstash_vector_url (optional for vector operations)
 * - UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_token (optional for vector operations)
 *
 * The module automatically detects which client to use based on these environment variables.
 *
 * --- NOTE ---
 * This file is intended for server-side use only. Do not import it in browser/client code.
 * If you need to use these functions in the browser, move them to a /lib/shared/ or /lib/client/ folder and use dynamic import.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { LRUCache } from 'lru-cache';
import * as schema from '@/db/supabase/schema';
import {
  eq,
  desc,
  and,
  sql,
  type Column,
  ColumnBaseConfig,
  ColumnDataType,
} from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';
import type {
  User,
  NewUser,
  App,
  NewApp,
  AppCodeBlock,
  NewAppCodeBlock,
  Integration,
  NewIntegration,
  File,
  NewFile,
  TerminalSession,
  NewTerminalSession,
  Workflow,
  NewWorkflow,
  Model,
  NewModel,
  Provider,
  NewProvider,
  AgentPersona,
  NewAgentPersona,
  Agent,
  NewAgent,
  Tool,
  NewTool,
  WorkflowStep,
  NewWorkflowStep,
  AgentTool,
  NewAgentTool,
  Setting,
  NewSetting,
  BlogPost,
  NewBlogPost,
  MdxDocument,
  NewMdxDocument,
} from '@/db/supabase/validation';

export type {
  User,
  NewUser,
  App,
  NewApp,
  AppCodeBlock,
  NewAppCodeBlock,
  Integration,
  NewIntegration,
  File,
  NewFile,
  TerminalSession,
  NewTerminalSession,
  Workflow,
  NewWorkflow,
  Model,
  NewModel,
  Provider,
  NewProvider,
  AgentPersona,
  NewAgentPersona,
  Agent,
  NewAgent,
  Tool,
  NewTool,
  WorkflowStep,
  NewWorkflowStep,
  AgentTool,
  NewAgentTool,
  Setting,
  NewSetting,
  BlogPost,
  NewBlogPost,
  MdxDocument,
  NewMdxDocument,
};

// --- Upstash Client Utilities ---
// These are re-exported for use in supabase.ts and other modules
export {
  getRedisClient,
  getVectorClient,
  isUpstashRedisAvailable,
} from './upstash/upstashClients';
export {
  RedisConfigSchema,
  VectorConfigSchema,
  EnvVarsSchema,
  UpstashClientError,
  validateRedisConfig,
  validateVectorConfig,
  checkUpstashAvailability,
} from './upstash/upstashClients';
import {
  createSupabaseClient,
  type SupabaseClient as UpstashSupabaseClient,
} from './upstash/supabase-adapter-factory';
import { PgTableWithColumns, PgColumn } from 'drizzle-orm/pg-core';

// Define cache item type and client types
export type CacheItem = Record<string, unknown> | unknown[]; // Use precise type for cache items

// Type guard for client types
export type ClientType = UpstashSupabaseClient;

// Define error type
export const ErrorSchema = z
  .object({
    message: z.string().optional(),
    code: z.string().optional(),
    details: z.string().optional(),
    hint: z.string().optional(),
  })
  .passthrough();
export type ErrorType = z.infer<typeof ErrorSchema>;

// Singleton instances for connection reuse
let upstashSupabaseClientInstance: UpstashSupabaseClient | null = null;
let drizzleClientInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Determines if Upstash should be used as a Supabase replacement based on environment variables
 * @returns boolean indicating if Upstash should be used
 */
export const shouldUseUpstash = (): boolean => {
  return (
    process.env.USE_UPSTASH_ADAPTER === 'true' &&
    process.env.UPSTASH_REDIS_REST_URL !== undefined &&
    process.env.UPSTASH_REDIS_REST_TOKEN !== undefined
  );
};

// Initialize LRU cache for database queries
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0,
  evictions: 0,
};

const queryCache = new LRUCache<string, CacheItem>({
  max: 500,
  ttl: 1000 * 60 * 5,
  updateAgeOnGet: true,
  allowStale: false,
  dispose: (value: CacheItem, key: string, reason: LRUCache.DisposeReason) => {
    if (reason === 'evict') {
      cacheStats.evictions++;
    }
  },
});

export const getCacheStats = () => ({ ...cacheStats });
export const resetCacheStats = () => {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.sets = 0;
  cacheStats.errors = 0;
  cacheStats.evictions = 0;
};
export const clearQueryCache = () => {
  queryCache.clear();
  resetCacheStats();
};

// Initialize Upstash client
export const getUpstashClient = (): UpstashSupabaseClient => {
  if (upstashSupabaseClientInstance) {
    return upstashSupabaseClientInstance;
  }

  try {
    upstashSupabaseClientInstance = createSupabaseClient();
    return upstashSupabaseClientInstance;
  } catch (error) {
    throw error;
  }
};

// Initialize Drizzle client
export const getDrizzleClient = (): ReturnType<typeof drizzle> => {
  if (drizzleClientInstance) {
    return drizzleClientInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const errorMsg =
      'Database connection string not found for Drizzle. Ensure DATABASE_URL is set.';
    throw new Error(errorMsg);
  }

  try {
    const pgClient = postgres(connectionString, {
      max: process.env.DB_MAX_CONNECTIONS
        ? parseInt(process.env.DB_MAX_CONNECTIONS)
        : 10,
      idle_timeout: process.env.DB_IDLE_TIMEOUT_SEC
        ? parseInt(process.env.DB_IDLE_TIMEOUT_SEC)
        : 20,
      connect_timeout: process.env.DB_CONNECT_TIMEOUT_SEC
        ? parseInt(process.env.DB_CONNECT_TIMEOUT_SEC)
        : 10,
    });
    drizzleClientInstance = drizzle(pgClient, {
      schema,
    });
    return drizzleClientInstance;
  } catch (error) {
    throw error;
  }
};

export async function logDatabaseConnection(
  connectionType: string,
  poolName: string,
  connectionUrlInput: string,
  options?: {
    maxConnections?: number;
    idleTimeoutMs?: number;
    connectionTimeoutMs?: number;
    status?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string | null> {
  try {
    const db = getDrizzleClient();
    const maskedUrl = connectionUrlInput.replace(/:[^@]*@/, ':***@');
    const connectionId = crypto.randomUUID();
    const result = await db
      .insert(schema.database_connections)
      .values({
        id: connectionId,
        connection_type: connectionType,
        pool_name: poolName,
        connection_url: maskedUrl,
        max_connections: options?.maxConnections,
        idle_timeout_ms: options?.idleTimeoutMs,
        connection_timeout_ms: options?.connectionTimeoutMs,
        status: options?.status || 'active',
        metadata: options?.metadata || {},
      })
      .returning({ id: schema.database_connections.id });
    return result[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * Type guard to check if a client is an Upstash Supabase client
 * @param client The client to check
 * @returns True if the client is an Upstash Supabase client
 */
export const isUpstashClient = (
  client: ClientType
): client is UpstashSupabaseClient => {
  return client && 'from' in client && 'vector' in client;
};

export const isUpstashAvailable = async (): Promise<boolean> => {
  try {
    const upstash = getUpstashClient();

    const tableClient = upstash.from('users');
    await tableClient.getAll({ limit: 1 });

    return true;
  } catch {
    return false;
  }
};

// ----- Database Access Functions -----
// Utility: Normalize Drizzle Date/null fields to string for Zod compatibility
// Define a helper type for objects with potentially Date/string/null timestamps
type ObjectWithOptionalTimestamps = {
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
};

// Define a helper type for objects where timestamps are guaranteed to be strings
type WithStringTimestamps<T> = Omit<T, 'created_at' | 'updated_at'> & {
  created_at: string;
  updated_at: string;
};

/**
 * Normalizes timestamp fields (created_at, updated_at) in an object from Date/string/null
 * to a string representation (ISO string or empty string if null/undefined).
 * This is useful for ensuring compatibility with types expecting string timestamps,
 * e.g., after fetching data from Drizzle where timestamps might be Date objects.
 *
 * @template T - The type of the input object, which must extend ObjectWithOptionalTimestamps.
 * @param {T} row - The object containing timestamp fields to normalize.
 * @returns {WithStringTimestamps<T>} A new object with 'created_at' and 'updated_at' fields as strings.
 *                                    Other properties from the input row are preserved.
 */
function normalizeTimestampsToString<T extends ObjectWithOptionalTimestamps>(
  row: T
): WithStringTimestamps<T> {
  // Destructure to separate timestamps from the rest of the properties
  const {
    created_at: originalCreatedAt,
    updated_at: originalUpdatedAt,
    ...rest
  } = row;

  return {
    ...rest, // Spread the properties other than original timestamps
    created_at:
      originalCreatedAt && typeof originalCreatedAt !== 'string'
        ? new Date(originalCreatedAt).toISOString()
        : (originalCreatedAt ?? ''), // Ensure string, even if null/undefined initially
    updated_at:
      originalUpdatedAt && typeof originalUpdatedAt !== 'string'
        ? new Date(originalUpdatedAt).toISOString()
        : (originalUpdatedAt ?? ''), // Ensure string, even if null/undefined initially
  } as WithStringTimestamps<T>; // Asserting the return type matches our transformation
}

function stripTimestamps<
  T extends { created_at?: unknown; updated_at?: unknown },
>(obj: T): Omit<T, 'created_at' | 'updated_at'> {
  // Remove created_at and updated_at keys for insert/update
  const { created_at, updated_at, ...rest } = obj;
  return rest;
}
/**
 * Returns the column object from schema.tools for a given column name.
 * @param columnName - The name of the column to retrieve.
 * @returns The column object if found, otherwise undefined.
 * @throws Error if the column does not exist in the schema.
 */
// Generated on 2024-06-09  // Update date as needed
function getToolColumn(columnName: string) {
  const col = (schema.tools as unknown as Record<string, unknown>)[columnName];
  if (!col) {
    throw new Error(`Invalid orderBy column: ${columnName}`);
  }
  return col;
}

// ===== Users =====
export async function getAllUsers(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<User>;
  orderBy?: keyof User;
}): Promise<User[]> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('users');
      // @ts-expect-error Upstash QueryOptions typing is too strict for dynamic orderBy
      return await tableClient.getAll(params);
    } else {
      const db = getDrizzleClient();
      let query = db.select().from(schema.users);
      if (params?.where) {
        const filters = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => {
            const col = schema.users[
              key as keyof typeof schema.users
            ] as unknown as Column;
            if (!col) throw new Error(`Invalid filter column: ${key}`);
            return eq(col, value);
          });
        if (filters.length > 0) {
          query = query.where(and(...filters)) as typeof query;
        }
      }
      if (params?.orderBy) {
        const orderByField = params.orderBy as keyof typeof schema.users;
        const col = schema.users[orderByField];

        if (!col) {
          throw new Error(
            `Invalid orderBy column: '${String(params.orderBy)}' not found in schema.users.`
          );
        }

        if (typeof col === 'function') {
          throw new Error(
            `Invalid orderBy key: "${String(params.orderBy)}" refers to a method, not a sortable column.`
          );
        }

        query = query.orderBy(desc(col as Column)) as typeof query;
      }
      if (params?.limit !== undefined) {
        query = query.limit(params.limit) as typeof query;
      }
      const results = await query;
      return results.map((row) => normalizeTimestampsToString(row) as User);
    }
  } catch (err) {
    throw err;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('users');
      return await tableClient.getById(id);
    } else {
      const db = getDrizzleClient();
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      if (!result[0]) return null;
      return normalizeTimestampsToString(result[0]) as User;
    }
  } catch (err) {
    throw err;
  }
}

export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<User | null> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('users');
      const updated = await tableClient.update(id, data);
      if (!updated[0]) return null;
      const row = updated[0];
      return normalizeTimestampsToString(row) as User;
    } else {
      const db = getDrizzleClient();
      const safeUpdateData = stripTimestamps(data);
      const updated = await db
        .update(schema.users)
        .set({ ...safeUpdateData, updated_at: new Date() })
        .where(eq(schema.users.id, id))
        .returning();
      if (!updated[0]) return null;
      return normalizeTimestampsToString(updated[0]) as User;
    }
  } catch (err) {
    throw err;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('users');
      await tableClient.delete(id);
    } else {
      const db = getDrizzleClient();
      await db.delete(schema.users).where(eq(schema.users.id, id));
    }
    return true;
  } catch (err) {
    throw err;
  }
}

// ===== Tools =====
export async function getAllTools(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<Tool>;
  orderBy?: keyof Tool;
}): Promise<Tool[]> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('tools');
      // @ts-expect-error Upstash QueryOptions typing is too strict for dynamic orderBy
      return await tableClient.getAll(params);
    } else {
      const db = getDrizzleClient();
      let query = db.select().from(schema.tools);
      if (params?.where) {
        const filters = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => {
            const col = schema.tools[
              key as keyof typeof schema.tools
            ] as Column<ColumnBaseConfig<ColumnDataType, string>>;
            if (!col) throw new Error(`Invalid filter column: ${key}`);
            return eq(col, value);
          });
        if (filters.length > 0) {
          query = query.where(and(...filters)) as typeof query;
        }
      }
      if (params?.orderBy) {
        const col = getToolColumn(params.orderBy as string) as Column;
        if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
        query = query.orderBy(desc(col)) as typeof query;
      }
      if (params?.limit !== undefined) {
        query = query.limit(params.limit) as typeof query;
      }
      const results = await query;
      return results.map(
        (norm) =>
          ({
            ...normalizeTimestampsToString(norm),
            parameters_schema:
              typeof norm.parameters_schema === 'object' &&
              norm.parameters_schema !== null
                ? norm.parameters_schema
                : {},
            tags:
              typeof norm.tags === 'object' && norm.tags !== null
                ? norm.tags
                : {},
          }) as Tool
      );
    }
  } catch (error) {
    throw error;
  }
}
export async function getToolById(id: string): Promise<Tool | null> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('tools');
      return await tableClient.getById(id);
    } else {
      const db = getDrizzleClient();
      const tools = await db
        .select()
        .from(schema.tools)
        .where(eq(schema.tools.id, id))
        .limit(1);
      if (!tools[0]) return null;
      const norm = normalizeTimestampsToString(tools[0]); // norm now has string timestamps
      return {
        ...norm, // This includes string created_at and updated_at
        parameters_schema:
          typeof norm.parameters_schema === 'object' &&
          norm.parameters_schema !== null
            ? norm.parameters_schema
            : {},
        tags:
          typeof norm.tags === 'object' && norm.tags !== null ? norm.tags : {},
      } as Tool;
    }
  } catch (error) {
    throw error;
  }
}

export async function createTool(data: NewTool): Promise<Tool> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('tools');
      const createdToolData = await tableClient.create(data);
      // Normalize the result from Upstash to match Tool type expectations
      const norm = normalizeTimestampsToString(createdToolData as Tool);
      return {
        ...norm,
        parameters_schema:
          typeof norm.parameters_schema === 'object' &&
          norm.parameters_schema !== null
            ? norm.parameters_schema
            : {},
        tags:
          typeof norm.tags === 'object' && norm.tags !== null ? norm.tags : {},
      } as Tool;
    } else {
      const db = getDrizzleClient();
      const insertData = stripTimestamps(data); // NewTool doesn't have created_at/updated_at
      const inserted = await db
        .insert(schema.tools)
        .values(insertData) // Drizzle handles created_at/updated_at via DB defaults/triggers
        .returning();

      const norm = normalizeTimestampsToString(inserted[0]);
      return {
        ...norm,
        parameters_schema:
          typeof norm.parameters_schema === 'object' &&
          norm.parameters_schema !== null
            ? norm.parameters_schema
            : {}, // Ensure parameters_schema is an object
        tags:
          typeof norm.tags === 'object' && norm.tags !== null ? norm.tags : {}, // Ensure tags is an object
      } as Tool;
    }
  } catch (error) {
    throw error;
  }
}

export async function updateTool(
  id: string,
  data: Partial<Tool>
): Promise<Tool | null> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('tools');
      const updatedResult = await tableClient.update(id, data);
      if (!updatedResult || updatedResult.length === 0 || !updatedResult[0]) {
        return null;
      }
      const row = updatedResult[0];
      // Ensure result from Upstash is normalized like Drizzle results
      const norm = normalizeTimestampsToString(row as Tool);
      return {
        ...norm,
        parameters_schema:
          typeof norm.parameters_schema === 'object' &&
          norm.parameters_schema !== null
            ? norm.parameters_schema
            : {},
        tags:
          typeof norm.tags === 'object' && norm.tags !== null ? norm.tags : {},
      } as Tool;
    } else {
      const db = getDrizzleClient();
      const safeUpdateData = stripTimestamps(data);
      const updated = await db
        .update(schema.tools)
        .set({ ...safeUpdateData, updated_at: new Date() })
        .where(eq(schema.tools.id, id))
        .returning();

      if (!updated || updated.length === 0 || !updated[0]) {
        return null;
      }
      const norm = normalizeTimestampsToString(updated[0]);
      return {
        ...norm,
        parameters_schema:
          typeof norm.parameters_schema === 'object' &&
          norm.parameters_schema !== null
            ? norm.parameters_schema
            : {},
        tags:
          typeof norm.tags === 'object' && norm.tags !== null ? norm.tags : {},
      } as Tool;
    }
  } catch (error) {
    throw error;
  }
}

// ===== Apps =====
export async function getAllApps(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<App>;
  orderBy?: keyof App;
}): Promise<App[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.apps);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.apps[key as keyof typeof schema.apps] as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query;
    }
  }
  if (params?.orderBy) {
    const colName = params.orderBy as keyof typeof schema.apps; // Explicitly type the key from App's keys
    const col = schema.apps[colName]; // Access the property on schema.apps
    // Check if the resolved property exists
    if (!col) {
      throw new Error(
        `Invalid orderBy column: '${String(params.orderBy)}' not found in schema.apps.`
      );
    }
    // Check if the resolved property is a function (e.g., a table method like getSQL())
    // which cannot be used for ordering.
    if (typeof col === 'function') {
      throw new Error(
        `Invalid orderBy key: "${String(params.orderBy)}" refers to a method, not a sortable column.`
      );
    }
    // Cast 'col' to 'Column' to satisfy Drizzle's 'desc' function.
    // This tells TypeScript to treat 'col' as a generic column type.
    query = query.orderBy(desc(col as Column)) as typeof query;
  }
  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }
  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }
  const results = await query;
  return results.map((result) => normalizeTimestampsToString(result)) as App[];
}

export async function createApp(data: NewApp): Promise<App> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db.insert(schema.apps).values(insertData).returning();
  return normalizeTimestampsToString(inserted[0]) as App;
}

export async function updateApp(
  id: string,
  data: Partial<App>
): Promise<App | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.apps)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.apps.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as App;
}

export async function deleteApp(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.apps).where(eq(schema.apps.id, id));
  return true;
}

// ===== AppCodeBlocks =====
/**
 * CRUD for AppCodeBlock entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllAppCodeBlocks(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<AppCodeBlock>;
  orderBy?: keyof AppCodeBlock;
}): Promise<AppCodeBlock[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.app_code_blocks);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.app_code_blocks[
          key as keyof typeof schema.app_code_blocks
        ] as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      // @ts-expect-error: Drizzle query builder chaining
      query = query.where(and(...filters));
    }
  }
  if (params?.orderBy) {
    const col =
      schema.app_code_blocks[
        params.orderBy as keyof typeof schema.app_code_blocks
      ];
    if (!col || typeof col === 'function') {
      // Added check for function type
      throw new Error(
        `Invalid orderBy column or column is not sortable: ${String(params.orderBy)}`
      );
    }
    query = query.orderBy(desc(col as Column)) as typeof query;
  }
  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }
  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as AppCodeBlock);
}

export async function getAppCodeBlockById(
  id: string
): Promise<AppCodeBlock | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.app_code_blocks)
    .where(eq(schema.app_code_blocks.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as AppCodeBlock;
}

export async function createAppCodeBlock(
  data: NewAppCodeBlock
): Promise<AppCodeBlock> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.app_code_blocks)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as AppCodeBlock;
}

export async function updateAppCodeBlock(
  id: string,
  data: Partial<AppCodeBlock>
): Promise<AppCodeBlock | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.app_code_blocks)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.app_code_blocks.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as AppCodeBlock;
}

export async function deleteAppCodeBlock(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db
    .delete(schema.app_code_blocks)
    .where(eq(schema.app_code_blocks.id, id));
  return true;
}

// ===== Integrations =====
/**
 * CRUD for Integration entity (Supabase only)
 * Generated on 2025-05-17
 */
function toDrizzleDate(val: unknown): Date | null | undefined {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function getAllIntegrations(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<Integration>;
  orderBy?: keyof Integration;
}): Promise<Integration[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.integrations);

  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.integrations[
          key as keyof typeof schema.integrations
        ] as Column; // Ensure this cast is appropriate for all where keys
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query;
    }
  }

  if (params?.orderBy) {
    const colName = params.orderBy as keyof typeof schema.integrations;
    const col = schema.integrations[colName];
    if (!col || typeof col === 'function') {
      throw new Error(
        `Invalid orderBy key: "${String(params.orderBy)}" refers to a method, not a sortable column, or column does not exist.`
      );
    }
    query = query.orderBy(desc(col as Column)) as typeof query;
  }

  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }

  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }

  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as Integration);
}

export async function createIntegration(
  data: NewIntegration
): Promise<Integration> {
  const db = getDrizzleClient();
  const insertData = {
    ...stripTimestamps(data),
    last_synced_at: toDrizzleDate(data.last_synced_at),
  };
  const inserted = await db
    .insert(schema.integrations)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as Integration;
}

export async function updateIntegration(
  id: string,
  data: Partial<Integration>
): Promise<Integration | null> {
  const db = getDrizzleClient();
  const safeUpdateData = {
    ...stripTimestamps(data),
    last_synced_at: toDrizzleDate(data.last_synced_at),
  };
  const updated = await db
    .update(schema.integrations)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.integrations.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as Integration;
}

export async function deleteIntegration(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.integrations).where(eq(schema.integrations.id, id));
  return true;
}

// ===== Files =====
/**
 * CRUD for File entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllFiles(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<File>;
  orderBy?: keyof File;
}): Promise<File[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.files);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.files[key as keyof typeof schema.files] as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      // @ts-expect-error: Drizzle query builder chaining
      query = query.where(and(...filters));
    }
  }
  if (params?.orderBy) {
    const colName = params.orderBy as keyof typeof schema.files;
    const col = schema.files[colName];
    if (!col || typeof col === 'function') {
      throw new Error(
        `Invalid orderBy key: "${String(params.orderBy)}" refers to a method, not a sortable column, or column does not exist.`
      );
    }
    query = query.orderBy(desc(col as Column)) as typeof query;
  }

  // Apply LIMIT
  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }

  // Apply OFFSET
  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }

  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as File);
}

export async function updateFile(
  id: string,
  data: Partial<File>
): Promise<File | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.files)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.files.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as File;
}

export async function deleteFile(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.files).where(eq(schema.files.id, id));
  return true;
}

// ===== TerminalSessions =====
/**
 * CRUD for TerminalSession entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllTerminalSessions(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<TerminalSession>;
  orderBy?: keyof TerminalSession;
}): Promise<TerminalSession[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.terminal_sessions);

  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.terminal_sessions[
          key as keyof typeof schema.terminal_sessions
        ] as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query;
    }
  }

  if (params?.orderBy) {
    const colName = params.orderBy as keyof typeof schema.terminal_sessions;
    const col = schema.terminal_sessions[colName];
    if (!col || typeof col === 'function') {
      throw new Error(
        `Invalid orderBy key: "${String(params.orderBy)}" refers to a method, not a sortable column, or column does not exist.`
      );
    }
    query = query.orderBy(desc(col as Column)) as typeof query;
  }

  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }

  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }

  const results = await query;
  return results.map(
    (row) => normalizeTimestampsToString(row) as TerminalSession
  );
}

export async function getTerminalSessionById(
  id: string
): Promise<TerminalSession | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.terminal_sessions)
    .where(eq(schema.terminal_sessions.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as TerminalSession;
}

export async function createTerminalSession(
  data: NewTerminalSession
): Promise<TerminalSession> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.terminal_sessions)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as TerminalSession;
}

export async function updateTerminalSession(
  id: string,
  data: Partial<TerminalSession>
): Promise<TerminalSession | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.terminal_sessions)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.terminal_sessions.id, id))
    .returning();
  // Define a type alias for the database row structure of a terminal session.
  // This makes the type of 'updated[0]' more explicit.
  type TerminalSessionRowFromDB = typeof schema.terminal_sessions.$inferSelect;

  // Assign updated[0] to a variable with the explicit type.
  const firstTerminalSession: TerminalSessionRowFromDB | undefined = updated[0];

  // Check if the first item exists.
  if (!firstTerminalSession) {
    return null;
  }
  return normalizeTimestampsToString(firstTerminalSession) as TerminalSession;
}

export async function deleteTerminalSession(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db
    .delete(schema.terminal_sessions)
    .where(eq(schema.terminal_sessions.id, id));
  return true;
}

// ===== Models =====
/**
 * CRUD for Model entity (Supabase only)
 * Generated on 2025-05-17
 */
// Helper function to normalize model data, especially numeric fields and JSON capabilities
function normalizeModelData(
  row: Record<string, any> // Drizzle row, can be any object from DB
): Model {
  const normalizedTimestampsRow = normalizeTimestampsToString(row);

  // Handle 'capabilities' which might be a string (JSON) or already an object/null/undefined
  let capabilitiesValue = row.capabilities; // Use direct row access
  if (typeof capabilitiesValue === 'string') {
    try {
      capabilitiesValue = JSON.parse(capabilitiesValue);
    } catch (e) {
      // console.warn(`Failed to parse capabilities JSON for model ${row.id}:`, e);
      capabilitiesValue = null; // Match schema: optional().nullable()
    }
  }
  // If capabilitiesValue is already an object or null, it's fine.
  // If it's undefined and schema expects nullable, it's also fine.

  // Handle 'metadata' similarly if it could be a JSON string from DB
  // For now, assume Drizzle handles JSONB to object/null for metadata.
  // let metadataValue = row.metadata;
  // if (typeof metadataValue === 'string') { ... }

  const modelData = {
    ...(normalizedTimestampsRow as Omit<
      typeof normalizedTimestampsRow,
      keyof Model
    > &
      Partial<Model>), // Spread properties

    // Ensure all fields from ModelSchema are correctly typed
    id: String(row.id),
    name: String(row.name),
    provider_id: String(row.provider_id),
    model_id: String(row.model_id),

    // Mandatory numeric fields
    max_tokens: Number(row.max_tokens),
    // Assuming input/output_cost_per_token are stored as numeric or text in DB that can be Number()
    input_cost_per_token: Number(row.input_cost_per_token),
    output_cost_per_token: Number(row.output_cost_per_token),

    // Optional boolean fields (boolean | undefined)
    supports_vision:
      row.supports_vision != null ? Boolean(row.supports_vision) : undefined,
    supports_functions:
      row.supports_functions != null
        ? Boolean(row.supports_functions)
        : undefined,
    supports_streaming:
      row.supports_streaming != null
        ? Boolean(row.supports_streaming)
        : undefined,

    // Optional numeric fields (number | undefined)
    default_temperature:
      row.default_temperature != null
        ? Number(row.default_temperature)
        : undefined,
    default_top_p:
      row.default_top_p != null ? Number(row.default_top_p) : undefined,
    default_frequency_penalty:
      row.default_frequency_penalty != null
        ? Number(row.default_frequency_penalty)
        : undefined,
    default_presence_penalty:
      row.default_presence_penalty != null
        ? Number(row.default_presence_penalty)
        : undefined,
    context_window:
      row.context_window != null ? Number(row.context_window) : undefined,

    // Optional nullable string fields
    description: row.description != null ? String(row.description) : null,
    base_url: row.base_url != null ? String(row.base_url) : null,

    // Optional string fields (string | undefined)
    category: row.category != null ? String(row.category) : undefined,
    api_key: row.api_key != null ? String(row.api_key) : undefined, // Assuming api_key is optional in Model type
    status: row.status != null ? String(row.status) : undefined, // Assuming status is optional in Model type

    // JSON fields (already handled or spread)
    capabilities: capabilitiesValue, // Already processed
    metadata: row.metadata, // Assumed to be object | null from spread or Drizzle

    // Timestamps are handled by normalizeTimestampsToString and spread
    created_at: normalizedTimestampsRow.created_at,
    updated_at: normalizedTimestampsRow.updated_at,
  };
  return modelData as Model;
}

export async function getModelById(id: string): Promise<Model | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.models)
    .where(eq(schema.models.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeModelData(result[0]);
}

export async function updateModel(
  id: string,
  data: Partial<Model>
): Promise<Model | null> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('models');
      // Upstash adapter might not need special handling for numeric strings
      // but ensure data conforms to what Upstash expects.
      // For now, assume direct update is fine.
      const updatedResult = await tableClient.update(id, data);
      if (!updatedResult || updatedResult.length === 0 || !updatedResult[0]) {
        return null;
      }
      // Normalize the result from Upstash to match Model type expectations
      return normalizeModelData(updatedResult[0] as Record<string, any>);
    } else {
      const db = getDrizzleClient();
      const safeUpdateData = stripTimestamps(data);

      // Prepare data for Drizzle, converting numbers to strings for numeric columns
      // and handling potential null/undefined values correctly.
      const updatePayload: Record<string, any> = { ...safeUpdateData };

      // Example: Convert numeric fields that are stored as numeric/text in DB
      // but might be numbers in `Partial<Model>`
      if (safeUpdateData.max_tokens !== undefined) {
        updatePayload.max_tokens = Number(safeUpdateData.max_tokens);
      }
      if (safeUpdateData.input_cost_per_token !== undefined) {
        updatePayload.input_cost_per_token = String(
          safeUpdateData.input_cost_per_token
        );
      }
      if (safeUpdateData.output_cost_per_token !== undefined) {
        updatePayload.output_cost_per_token = String(
          safeUpdateData.output_cost_per_token
        );
      }
      if (
        safeUpdateData.default_temperature !== undefined &&
        safeUpdateData.default_temperature !== null
      ) {
        updatePayload.default_temperature = String(
          safeUpdateData.default_temperature
        );
      } else if (safeUpdateData.default_temperature === null) {
        updatePayload.default_temperature = null;
      }
      if (
        safeUpdateData.default_top_p !== undefined &&
        safeUpdateData.default_top_p !== null
      ) {
        updatePayload.default_top_p = String(safeUpdateData.default_top_p);
      } else if (safeUpdateData.default_top_p === null) {
        updatePayload.default_top_p = null;
      }
      if (
        safeUpdateData.default_frequency_penalty !== undefined &&
        safeUpdateData.default_frequency_penalty !== null
      ) {
        updatePayload.default_frequency_penalty = String(
          safeUpdateData.default_frequency_penalty
        );
      } else if (safeUpdateData.default_frequency_penalty === null) {
        updatePayload.default_frequency_penalty = null;
      }
      if (
        safeUpdateData.default_presence_penalty !== undefined &&
        safeUpdateData.default_presence_penalty !== null
      ) {
        updatePayload.default_presence_penalty = String(
          safeUpdateData.default_presence_penalty
        );
      } else if (safeUpdateData.default_presence_penalty === null) {
        updatePayload.default_presence_penalty = null;
      }
      if (
        safeUpdateData.context_window !== undefined &&
        safeUpdateData.context_window !== null
      ) {
        updatePayload.context_window = Number(safeUpdateData.context_window);
      } else if (safeUpdateData.context_window === null) {
        updatePayload.context_window = null;
      }

      // Remove undefined keys to avoid issues with Drizzle's set method
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      const updated = await db
        .update(schema.models)
        .set({ ...updatePayload, updated_at: new Date() })
        .where(eq(schema.models.id, id))
        .returning();

      if (!updated || updated.length === 0 || !updated[0]) {
        return null;
      }
      return normalizeModelData(updated[0]);
    }
  } catch (error) {
    // console.error("Error in updateModel:", error);
    throw error;
  }
}

export async function deleteModel(id: string): Promise<boolean> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('models');
      await tableClient.delete(id);
    } else {
      const db = getDrizzleClient();
      await db.delete(schema.models).where(eq(schema.models.id, id));
    }
    return true;
  } catch (err) {
    // console.error("Error in deleteModel:", err);
    throw err;
  }
}

// ===== Providers =====
/**
 * CRUD for Provider entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllProviders(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<Provider>;
  orderBy?: keyof Provider;
}): Promise<Provider[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.providers);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.providers[
          key as keyof typeof schema.providers
        ] as unknown as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query;
    }
  }
  if (params?.orderBy) {
    const col =
      schema.providers[params.orderBy as keyof typeof schema.providers];
    if (!col) {
      throw new Error(`Invalid orderBy column: ${String(params.orderBy)}`);
    }
    // Check if 'col' is a function (e.g., a method on the table object)
    if (typeof col === 'function') {
      throw new Error(
        `Invalid orderBy key: "${String(params.orderBy)}" refers to a method, not a sortable column.`
      );
    }
    // Cast 'col' to Column to satisfy Drizzle's desc() function and resolve TS error
    query = query.orderBy(desc(col as Column)) as typeof query;
  }
  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }
  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }
  const results = await query.execute();
  return results.map((row) => normalizeTimestampsToString(row) as Provider);
}

export async function getProviderById(id: string): Promise<Provider | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as Provider;
}

export async function createProvider(data: NewProvider): Promise<Provider> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.providers)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as Provider;
}

export async function updateProvider(
  id: string,
  data: Partial<Provider>
): Promise<Provider | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.providers)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.providers.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as Provider;
}

export async function deleteProvider(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.providers).where(eq(schema.providers.id, id));
  return true;
}

// ===== AgentPersonas =====
/**
 * CRUD for AgentPersona entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllAgentPersonas(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<AgentPersona>;
  orderBy?: keyof AgentPersona;
}): Promise<AgentPersona[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.agent_personas);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.agent_personas[
          key as keyof typeof schema.agent_personas
        ] as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query;
    }
  }
  if (params?.orderBy) {
    const col =
      schema.agent_personas[
        params.orderBy as keyof typeof schema.agent_personas
      ];
    if (!col || typeof col === 'function') {
      throw new Error(
        `Invalid orderBy column or column is not sortable: ${String(params.orderBy)}`
      );
    }
    query = query.orderBy(desc(col as Column)) as typeof query;
  }
  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }
  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as AgentPersona);
}

export async function getAgentPersonaById(
  id: string
): Promise<AgentPersona | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.agent_personas)
    .where(eq(schema.agent_personas.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as AgentPersona;
}

export async function deleteAgentPersona(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db
    .delete(schema.agent_personas)
    .where(eq(schema.agent_personas.id, id));
  return true;
}

// ===== Agents =====
/**
 * CRUD for Agent entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllAgents(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<Agent>;
  orderBy?: keyof Agent;
}): Promise<Agent[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.agents);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.agents[key as keyof typeof schema.agents] as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query;
    }
  }
  if (params?.orderBy) {
    const col = schema.agents[params.orderBy as keyof typeof schema.agents];
    if (!col || typeof col === 'function') {
      throw new Error(
        `Invalid orderBy column or column is not sortable: ${String(params.orderBy)}`
      );
    }
    query = query.orderBy(desc(col as Column)) as typeof query;
  }
  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }
  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as Agent);
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as Agent;
}

export async function createAgent(data: NewAgent): Promise<Agent> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.agents)
    .values(insertData)
    .returning();
  if (!inserted[0]) {
    throw new Error('Failed to create agent or retrieve the created row.');
  }
  return normalizeTimestampsToString(inserted[0]) as Agent;
}

export async function updateAgent(
  id: string,
  data: Partial<Agent>
): Promise<Agent | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.agents)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.agents.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as Agent;
}

export async function deleteAgent(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.agents).where(eq(schema.agents.id, id));
  return true;
}

// ===== AgentTools =====
/**
 * CRUD for AgentTool entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllAgentTools(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<AgentTool>;
  orderBy?: keyof AgentTool;
}): Promise<AgentTool[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.agent_tools);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.agent_tools[
          key as keyof typeof schema.agent_tools
        ] as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query;
    }
  }
  if (params?.orderBy) {
    const col =
      schema.agent_tools[params.orderBy as keyof typeof schema.agent_tools];
    if (!col || typeof col === 'function') {
      throw new Error(
        `Invalid orderBy column or column is not sortable: ${String(params.orderBy)}`
      );
    }
    query = query.orderBy(desc(col as Column)) as typeof query;
  }
  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }
  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as AgentTool);
}

export async function getAgentToolByKeys(
  agentId: string,
  toolId: string
): Promise<AgentTool | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.agent_tools)
    .where(
      and(
        eq(schema.agent_tools.agent_id, agentId),
        eq(schema.agent_tools.tool_id, toolId)
      )
    )
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as AgentTool;
}

export async function createAgentTool(data: NewAgentTool): Promise<AgentTool> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data); // NewAgentTool doesn't have created_at
  const inserted = await db
    .insert(schema.agent_tools)
    .values(insertData) // Drizzle handles created_at via DB defaults/triggers if defined
    .returning();
  if (!inserted[0]) {
    throw new Error('Failed to create agent tool or retrieve the created row.');
  }
  return normalizeTimestampsToString(inserted[0]) as AgentTool;
}

export async function updateAgentTool(
  agentId: string,
  toolId: string,
  data: Partial<AgentTool>
): Promise<AgentTool | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.agent_tools)
    .set(safeUpdateData) // Rely on DB/ORM to handle updated_at for this table
    .where(
      and(
        eq(schema.agent_tools.agent_id, agentId),
        eq(schema.agent_tools.tool_id, toolId)
      )
    )
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as AgentTool;
}

export async function deleteAgentTool(
  agentId: string,
  toolId: string
): Promise<boolean> {
  const db = getDrizzleClient();
  await db
    .delete(schema.agent_tools)
    .where(
      and(
        eq(schema.agent_tools.agent_id, agentId),
        eq(schema.agent_tools.tool_id, toolId)
      )
    );
  return true;
}

// ===== Settings =====
/**
 * CRUD for Setting entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllSettings(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<Setting>;
  orderBy?: keyof Setting;
}): Promise<Setting[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.settings);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.settings[
          key as keyof typeof schema.settings
        ] as Column;
        if (!col) throw new Error(`Invalid filter column: ${key}`);
        return eq(col, value);
      });
    if (filters.length > 0) {
      query = query.where(and(...filters)) as typeof query;
    }
  }
  if (params?.orderBy) {
    const col = schema.settings[params.orderBy as keyof typeof schema.settings];
    if (!col || typeof col === 'function') {
      throw new Error(
        `Invalid orderBy column or column is not sortable: ${String(params.orderBy)}`
      );
    }
    query = query.orderBy(desc(col as Column)) as typeof query;
  }
  if (params?.limit !== undefined) {
    query = query.limit(params.limit) as typeof query;
  }
  if (params?.offset !== undefined) {
    query = query.offset(params.offset) as typeof query;
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as Setting);
}

export async function getSettingById(id: string): Promise<Setting | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as Setting;
}

export async function createSetting(data: NewSetting): Promise<Setting> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.settings)
    .values(insertData)
    .returning();
  if (!inserted[0]) {
    throw new Error('Failed to create setting or retrieve the created row.');
  }
  return normalizeTimestampsToString(inserted[0]) as Setting;
}
export async function updateSetting(
  id: string,
  data: Partial<Setting>
): Promise<Setting | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.settings)
    .set(safeUpdateData)
    .where(eq(schema.settings.key, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as Setting;
}
export async function deleteSetting(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.settings).where(eq(schema.settings.key, id));
  return true;
}

// --- Generic Database Operations ---

/**
 * Generic function to get an entity by its ID.
 * @param tableName The name of the table.
 * @param id The ID of the entity.
 * @returns The entity or null if not found.
 */
export async function getEntityById<T extends { id: string }>(
  tableName: keyof typeof schema,
  id: string
): Promise<T | null> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from(tableName);
      const result = (await tableClient.getById(id)) as T | null;
      if (result && 'created_at' in result && 'updated_at' in result) {
        return normalizeTimestampsToString(
          result as ObjectWithOptionalTimestamps
        ) as unknown as T;
      }
      return result;
    } else {
      const db = getDrizzleClient();
      const table = schema[tableName] as PgTableWithColumns<any>; // Cast to a generic Drizzle table
      if (!table || !table.id) {
        throw new Error(
          `Table ${String(tableName)} or its ID column is not defined in the schema.`
        );
      }
      const result = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);
      if (!result[0]) return null;
      return normalizeTimestampsToString(result[0] as any) as unknown as T; // Normalize and cast
    }
  } catch (err) {
    // console.error(`Error in getEntityById for ${String(tableName)}:`, err);
    throw err;
  }
}
/**
 * Generic function to create an entity.
 * @param tableName The name of the table.
 * @param data The data for the new entity.
 * @returns The created entity.
 */
export async function createEntity<
  T extends { id: string },
  NewT extends Record<string, any>,
>(tableName: keyof typeof schema, data: NewT): Promise<T> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();

      const tableClient = client.from(tableName);
      const createdData = (await tableClient.create(data)) as T;
      if (
        createdData &&
        'created_at' in createdData &&
        'updated_at' in createdData
      ) {
        return normalizeTimestampsToString(
          createdData as ObjectWithOptionalTimestamps
        ) as unknown as T;
      }
      return createdData;
    } else {
      const db = getDrizzleClient();
      const table = schema[tableName] as PgTableWithColumns<any>;
      if (!table) {
        throw new Error(
          `Table ${String(tableName)} is not defined in the schema.`
        );
      }
      const insertData = stripTimestamps(data as any); // Remove timestamps if present
      const inserted = await db.insert(table).values(insertData).returning();

      if (!inserted[0]) {
        throw new Error(
          `Failed to create entity in ${String(tableName)} or retrieve the created row.`
        );
      }
      return normalizeTimestampsToString(inserted[0] as any) as unknown as T; // Normalize and cast
    }
  } catch (err) {
    // console.error(`Error in createEntity for ${String(tableName)}:`, err);
    throw err;
  }
}
/**
 * Generic function to delete an entity by its ID.
 * @param tableName The name of the table.
 * @param id The ID of the entity to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export async function deleteEntity(
  tableName: keyof typeof schema,
  id: string
): Promise<boolean> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from(tableName);
      await tableClient.delete(id);
    } else {
      const db = getDrizzleClient();
      const table = schema[tableName] as PgTableWithColumns<any>;
      if (!table || !table.id) {
        throw new Error(
          `Table ${String(tableName)} or its ID column is not defined in the schema.`
        );
      }
      await db.delete(table).where(eq(table.id, id));
    }
    return true;
  } catch (err) {
    // console.error(`Error in deleteEntity for ${String(tableName)}:`, err);
    // Consider re-throwing or returning false based on error handling strategy
    throw err; // Re-throw by default
  }
}

// --- Vector Operations ---

/**
 * Represents a vector with content and embedding.
 */
export interface VectorData {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

/**
 * Upserts a vector into the Upstash vector store.
 * @param vector The vector data to upsert.
 * @returns A promise that resolves when the operation is complete.
 * @throws Error if Upstash Vector client is not available.
 */
export async function upsertVector(vector: VectorData): Promise<void> {
  if (!shouldUseUpstash() || !process.env.UPSTASH_VECTOR_REST_URL) {
    throw new Error(
      'Upstash Vector client is not configured or Upstash adapter is not enabled.'
    );
  }
  const client = getUpstashClient();
  if (!client.vector) {
    throw new Error('Upstash Vector client (client.vector) is not available.');
  }
  try {
    await client.vector.upsert([
      {
        id: vector.id,
        vector: vector.embedding,
        metadata: vector.metadata,
      },
    ]);
  } catch (error) {
    // console.error('Error upserting vector:', error);
    throw error;
  }
}
/**
 * Queries vectors from the Upstash vector store.
 * @param embedding The query embedding.
 * @param topK The number of top results to return.
 * @param filter Optional metadata filter string.
 * @returns A promise that resolves with an array of query results.
 * @throws Error if Upstash Vector client is not available.
 */
export async function queryVectors(
  embedding: number[],
  topK: number,
  filter?: Record<string, unknown>
): Promise<
  Array<{ id: string; score: number; metadata?: Record<string, unknown> }>
> {
  if (!shouldUseUpstash() || !process.env.UPSTASH_VECTOR_REST_URL) {
    throw new Error(
      'Upstash Vector client is not configured or Upstash adapter is not enabled.'
    );
  }
  const client = getUpstashClient();
  if (!client.vector) {
    throw new Error('Upstash Vector client (client.vector) is not available.');
  }
  try {
    const results = await client.vector.search(embedding, {
      topK,
      includeMetadata: true,
      filter,
    });
    return results.map((r) => ({
      id: String(r.id), // Ensure id is string
      score: Number(r.score), // Convert score to number
      metadata:
        r.metadata && typeof r.metadata === 'object'
          ? (r.metadata as Record<string, unknown>)
          : undefined,
    }));
  } catch (error) {
    // console.error('Error querying vectors:', error);
    throw error;
  }
}

/**
 * Deletes a vector from the Upstash vector store by its ID.
 * @param id The ID of the vector to delete.
 * @returns A promise that resolves when the operation is complete.
 * @throws Error if Upstash Vector client is not available.
 */
export async function deleteVector(id: string | string[]): Promise<void> {
  if (!shouldUseUpstash() || !process.env.UPSTASH_VECTOR_REST_URL) {
    throw new Error(
      'Upstash Vector client is not configured or Upstash adapter is not enabled.'
    );
  }
  const client = getUpstashClient();
  if (!client.vector) {
    throw new Error('Upstash Vector client (client.vector) is not available.');
  }
  try {
    await client.vector.delete(id);
  } catch (error) {
    // console.error('Error deleting vector(s):', error);
    throw error;
  }
}

/**
 * Fetches vectors from the Upstash vector store by their IDs.
 * @param ids An array of vector IDs to fetch.
 * @returns A promise that resolves with an array of fetched vectors.
 * @throws Error if Upstash Vector client is not available.
 */
export async function fetchVectors(
  ids: string[]
): Promise<Array<VectorData | null>> {
  if (!shouldUseUpstash() || !process.env.UPSTASH_VECTOR_REST_URL) {
    throw new Error(
      'Upstash Vector client is not configured or Upstash adapter is not enabled.'
    );
  }
  const client = getUpstashClient();
  if (!client.vector) {
    throw new Error('Upstash Vector client (client.vector) is not available.');
  }
  try {
    /**
     * @interface UpstashRawVectorResult
     * @description Represents the raw structure of a vector item as potentially returned
     * by the Upstash vector client's `get` method, before transformation into `VectorData`.
     * This interface is based on the usage observed in the `fetchVectors` function,
     * particularly the access to an optional `data` field for content.
     */
    interface UpstashRawVectorResult {
      /** The unique identifier of the vector. Can be a string or a number from the Upstash client. */
      id: string | number;

      /**
       * Optional field that may contain the primary content of the vector.
       * If this field is a string, it's used as the `content` for `VectorData`.
       * Typed as `unknown` to enforce a type check before use.
       */
      data?: unknown;

      /**
       * The numerical embedding (vector representation) of the item.
       * Defaults to an empty array if not provided by the client.
       */
      vector?: number[];

      /**
       * Optional metadata associated with the vector.
       * This should conform to a key-value structure.
       */
      metadata?: Record<string, unknown>;
    }

    const rawResults = (await client.vector.get(ids, {
      includeMetadata: true,
    })) as Array<UpstashRawVectorResult | null>;

    return rawResults.map((rawResult): VectorData | null => {
      if (rawResult === null) {
        return null;
      }

      const content = typeof rawResult.data === 'string' ? rawResult.data : '';

      return {
        id: String(rawResult.id),
        content: content,
        embedding: rawResult.vector || [],
        metadata: rawResult.metadata,
      };
    });
  } catch (error) {
    // console.error('Error fetching vectors:', error);
    throw error;
  }
}/**
 * Resets the Upstash vector index, deleting all vectors.
 * Use with caution.
 * @returns A promise that resolves when the operation is complete.
 * @throws Error if Upstash Vector client is not available.
 */export async function resetVectorIndex(): Promise<void> {
  if (!shouldUseUpstash() || !process.env.UPSTASH_VECTOR_REST_URL) {
    throw new Error(
      'Upstash Vector client is not configured or Upstash adapter is not enabled.'
    );
  }
  const client = getUpstashClient();
  if (!client.vector) {
    throw new Error('Upstash Vector client (client.vector) is not available.');
  }
  try {
    await client.vector.reset();
  } catch (error) {
    // console.error('Error resetting vector index:', error);
    throw error;
  }
}

// --- Cache Invalidation ---

/**
 * Generates a cache key for a query.
 * @param baseKey The base key for the query (e.g., table name).
 * @param params Optional parameters for the query.
 * @returns A string representing the cache key.
 */
export function generateCacheKey(
  baseKey: string,
  params?: Record<string, any>
): string {
  if (!params || Object.keys(params).length === 0) {
    return baseKey;
  }
  // Sort parameter keys for consistent key generation
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((obj: Record<string, any>, key: string) => {
      obj[key] = params[key];
      return obj;
    }, {});
  const paramString = JSON.stringify(sortedParams);
  const hash = crypto.createHash('sha256').update(paramString).digest('hex');
  return `${baseKey}:${hash}`;
}

/**
 * Invalidates cache entries related to a specific table or entity.
 * This is a simple implementation that clears the entire cache.
 * More granular invalidation can be implemented if needed.
 * @param _tableName The name of the table for which to invalidate cache entries.
 */
export function invalidateCacheForTable(_tableName: string): void {
  // For now, clear the entire cache on any invalidation.
  // TODO: Implement more granular cache invalidation if performance becomes an issue.
  // e.g., by iterating over keys and deleting those matching `_tableName:*`
  clearQueryCache();
}

// Example of how to use cache for a specific function (e.g., getAllUsers)
// This is illustrative; actual caching is integrated into the CRUD functions if shouldUseUpstash is false.
export async function getCachedAllUsers(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<User>;
  orderBy?: keyof User;
}): Promise<User[]> {
  const cacheKey = generateCacheKey('users:getAll', params);
  if (queryCache.has(cacheKey)) {
    cacheStats.hits++;
    return queryCache.get(cacheKey) as User[];
  }

  cacheStats.misses++;
  try {
    const users = await getAllUsers(params); // Actual data fetching
    queryCache.set(cacheKey, users);
    cacheStats.sets++;
    return users;
  } catch (error) {
    cacheStats.errors++;
    throw error;
  }
}
