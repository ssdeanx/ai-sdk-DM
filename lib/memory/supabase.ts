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
          // @ts-expect-error: Drizzle query builder chaining
          query = query.where(and(...filters));
        }
      }
      if (params?.orderBy) {
        const orderByField = params.orderBy as keyof typeof schema.users; // Ensure orderByField is a key of the actual schema table
        const col = schema.users[orderByField];

        // This check ensures `col` is valid, especially if `User` type and `schema.users` could diverge.
        // TypeScript should ideally catch if `orderByField` isn't a valid key, making `col` a typed PgColumn.
        if (!col)
          throw new Error(`Invalid orderBy column: ${String(params.orderBy)}`);

        // @ts-expect-error Drizzle's fluent query builder type inference can be complex with reassignments
        query = query.orderBy(desc(col));
      }
      if (params?.limit !== undefined) {
        // @ts-expect-error: Drizzle query builder chaining
        query = query.limit(params.limit);
      }
      if (params?.offset !== undefined) {
        // @ts-expect-error: Drizzle query builder chaining
        query = query.offset(params.offset);
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
          // @ts-expect-error: Drizzle query builder chaining
          query = query.where(and(...filters));
        }
      }
      if (params?.orderBy) {
        const col = getToolColumn(params.orderBy as string);
        if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
        // @ts-expect-error: Drizzle query builder chaining
        query = query.orderBy(desc(col));
      }
      if (params?.limit !== undefined) {
        // @ts-expect-error: Drizzle query builder chaining
        query = query.limit(params.limit);
      }
      const results = await query;
      return results.map((row) => {
        const norm = normalizeTimestampsToString(row); // norm now has string timestamps
        return {
          ...norm, // This includes string created_at and updated_at
          parameters_schema:
            typeof norm.parameters_schema === 'object' &&
            norm.parameters_schema !== null
              ? norm.parameters_schema
              : {}, // Ensure parameters_schema is an object
          tags:
            typeof norm.tags === 'object' && norm.tags !== null
              ? norm.tags
              : {}, // Ensure tags is an object
        } as Tool;
      });
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
      // @ts-expect-error: Drizzle query builder chaining
      query = query.where(and(...filters));
    }
  }
  if (params?.orderBy) {
    const col = schema.apps[params.orderBy as keyof typeof schema.apps];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as App);
}

export async function getAppById(id: string): Promise<App | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.apps)
    .where(eq(schema.apps.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as App;
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
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
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
      schema.integrations[params.orderBy as keyof typeof schema.integrations];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as Integration);
}

export async function getIntegrationById(
  id: string
): Promise<Integration | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as Integration;
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
    const col = schema.files[params.orderBy as keyof typeof schema.files];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as File);
}

export async function getFileById(id: string): Promise<File | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.files)
    .where(eq(schema.files.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as File;
}

export async function createFile(data: NewFile): Promise<File> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db.insert(schema.files).values(insertData).returning();
  return normalizeTimestampsToString(inserted[0]) as File;
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
      // @ts-expect-error: Drizzle query builder chaining
      query = query.where(and(...filters));
    }
  }
  if (params?.orderBy) {
    const col =
      schema.terminal_sessions[
        params.orderBy as keyof typeof schema.terminal_sessions
      ];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
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
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as TerminalSession;
}

export async function deleteTerminalSession(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db
    .delete(schema.terminal_sessions)
    .where(eq(schema.terminal_sessions.id, id));
  return true;
}

// ===== Workflows =====
/**
 * CRUD for Workflow entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllWorkflows(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<Workflow>;
  orderBy?: keyof Workflow;
}): Promise<Workflow[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.workflows);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.workflows[
          key as keyof typeof schema.workflows
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
      schema.workflows[params.orderBy as keyof typeof schema.workflows];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as Workflow);
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.workflows)
    .where(eq(schema.workflows.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as Workflow;
}

export async function createWorkflow(data: NewWorkflow): Promise<Workflow> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.workflows)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as Workflow;
}

export async function updateWorkflow(
  id: string,
  data: Partial<Workflow>
): Promise<Workflow | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.workflows)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.workflows.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as Workflow;
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.workflows).where(eq(schema.workflows.id, id));
  return true;
}

// ===== WorkflowSteps =====
/**
 * CRUD for WorkflowStep entity (Supabase only)
 * Generated on 2025-05-17
 */

// Helper function to transform a database row to a Model object
// Generated on 2024-06-09
function dbRowToModel(dbRow: (typeof schema.models)['$inferSelect']): Model {
  const normalizedTimestampsRow = normalizeTimestampsToString(dbRow);

  let capabilitiesValue = normalizedTimestampsRow.capabilities; // Assuming 'capabilities' exists on normalizedTimestampsRow based on error context
  if (typeof capabilitiesValue === 'string') {
    try {
      capabilitiesValue = JSON.parse(capabilitiesValue);
    } catch (e) {
      // console.warn(`Failed to parse capabilities JSON string for model ${normalizedTimestampsRow.id}:`, capabilitiesValue, e);
      capabilitiesValue = undefined;
    }
  } else if (capabilitiesValue === null) {
    // If DB stores null for JSONB, and Model expects undefined or Record, map null to undefined.
    capabilitiesValue = undefined;
  } else if (
    capabilitiesValue !== undefined &&
    typeof capabilitiesValue !== 'object'
  ) {
    // If it's not a string, not undefined, not null, and not an object, it's unexpected.
    // console.warn(`Unexpected type for capabilities for model ${normalizedTimestampsRow.id}:`, typeof capabilitiesValue);
    capabilitiesValue = undefined;
  }
  // At this point, capabilitiesValue is an object, undefined.

  const modelData = {
    ...(normalizedTimestampsRow as any), // Spread as any to ensure all runtime props are included
    max_tokens: Number((normalizedTimestampsRow as any).max_tokens),
    input_cost_per_token: Number(
      (normalizedTimestampsRow as any).input_cost_per_token
    ),
    output_cost_per_token: Number(
      (normalizedTimestampsRow as any).output_cost_per_token
    ),
    default_temperature:
      (normalizedTimestampsRow as any).default_temperature != null // Handles undefined and null
        ? Number((normalizedTimestampsRow as any).default_temperature)
        : null,
    top_p:
      (normalizedTimestampsRow as any).top_p != null // Handles undefined and null
        ? Number((normalizedTimestampsRow as any).top_p)
        : null,
    top_k:
      (normalizedTimestampsRow as any).top_k != null // Handles undefined and null
        ? Number((normalizedTimestampsRow as any).top_k)
        : null,
    frequency_penalty:
      (normalizedTimestampsRow as any).frequency_penalty != null // Handles undefined and null
        ? Number((normalizedTimestampsRow as any).frequency_penalty)
        : null,
    presence_penalty:
      (normalizedTimestampsRow as any).presence_penalty != null // Handles undefined and null
        ? Number((normalizedTimestampsRow as any).presence_penalty)
        : null,
    capabilities: capabilitiesValue,
  };

  // This cast assumes that modelData now structurally matches the Model type.
  // For robust validation, ModelSchema.parse(modelData) would be better if ModelSchema is available.
  return modelData as unknown as Model;
}

export async function getAllWorkflowSteps(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<WorkflowStep>;
  orderBy?: keyof WorkflowStep;
}): Promise<WorkflowStep[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.workflow_steps);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.workflow_steps[
          key as keyof typeof schema.workflow_steps
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
      schema.workflow_steps[
        params.orderBy as keyof typeof schema.workflow_steps
      ];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as WorkflowStep);
}

export async function getWorkflowStepById(
  id: string
): Promise<WorkflowStep | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.workflow_steps)
    .where(eq(schema.workflow_steps.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as WorkflowStep;
}

export async function createWorkflowStep(
  data: NewWorkflowStep
): Promise<WorkflowStep> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.workflow_steps)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as WorkflowStep;
}

export async function updateWorkflowStep(
  id: string,
  data: Partial<WorkflowStep>
): Promise<WorkflowStep | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.workflow_steps)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.workflow_steps.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as WorkflowStep;
}

export async function deleteWorkflowStep(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db
    .delete(schema.workflow_steps)
    .where(eq(schema.workflow_steps.id, id));
  return true;
}

// ===== Models =====
/**
  }
  const results = await query;
  return results.map(dbRowToModel);
}

export async function getModelById(id: string): Promise<Model | null> {
  const db = getDrizzleClient();
  orderBy?: keyof Model;
}): Promise<Model[]> {
  const db = getDrizzleClient();
    .where(eq(schema.models.id, id))
    .limit(1);
  if (!result[0]) return null;
  return dbRowToModel(result[0]);
}

export async function createModel(data: NewModel): Promise<Model> {
  const db = getDrizzleClient();
      });
    if (filters.length > 0) {
    .insert(schema.models)
    .values(insertData)
    .returning();
  return dbRowToModel(inserted[0]);
}

export async function updateModel(
  id: string,
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    .where(eq(schema.models.id, id))
    .returning();
  if (!updated[0]) return null;
  return dbRowToModel(updated[0]);
}

export async function deleteModel(id: string): Promise<boolean> {
export async function getModelById(id: string): Promise<Model | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.models)
    .where(eq(schema.models.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as Model;
}

export async function createModel(data: NewModel): Promise<Model> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.models)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as Model;
}

export async function updateModel(
  id: string,
  data: Partial<Model>
): Promise<Model | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.models)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.models.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as Model;
}

export async function deleteModel(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.models).where(eq(schema.models.id, id));
  return true;
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
      schema.providers[params.orderBy as keyof typeof schema.providers];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
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
      // @ts-expect-error: Drizzle query builder chaining
      query = query.where(and(...filters));
    }
  }
  if (params?.orderBy) {
    const col =
      schema.agent_personas[
        params.orderBy as keyof typeof schema.agent_personas
      ];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
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

export async function createAgentPersona(
  data: NewAgentPersona
): Promise<AgentPersona> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.agent_personas)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as AgentPersona;
}

export async function updateAgentPersona(
  id: string,
  data: Partial<AgentPersona>
): Promise<AgentPersona | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.agent_personas)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.agent_personas.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as AgentPersona;
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
      // @ts-expect-error: Drizzle query builder chaining
      query = query.where(and(...filters));
    }
  }
  if (params?.orderBy) {
    const col = schema.agents[params.orderBy as keyof typeof schema.agents];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
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
      // @ts-expect-error: Drizzle query builder chaining
      query = query.where(and(...filters));
    }
  }
  if (params?.orderBy) {
    const col =
      schema.agent_tools[params.orderBy as keyof typeof schema.agent_tools];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
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
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.agent_tools)
    .values(insertData)
    .returning();
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
      // @ts-expect-error: Drizzle query builder chaining
      query = query.where(and(...filters));
    }
  }
  if (params?.orderBy) {
    const col = schema.settings[params.orderBy as keyof typeof schema.settings];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as Setting);
}

export async function getSettingById(id: string): Promise<Setting | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.id, id))
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
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.settings.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as Setting;
}
export async function deleteSetting(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.settings).where(eq(schema.settings.id, id));
  return true;
}

// ===== BlogPosts =====
/**
 * CRUD for BlogPost entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllBlogPosts(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<BlogPost>;
  orderBy?: keyof BlogPost;
}): Promise<BlogPost[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.blog_posts);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.blog_posts[
          key as keyof typeof schema.blog_posts
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
      schema.blog_posts[params.orderBy as keyof typeof schema.blog_posts];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as BlogPost);
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.blog_posts)
    .where(eq(schema.blog_posts.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as BlogPost;
}

export async function createBlogPost(data: NewBlogPost): Promise<BlogPost> {
  const db = getDrizzleClient();
  const insertData = {
    ...stripTimestamps(data),
    published_at: data.published_at ? new Date(data.published_at) : null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  const inserted = await db
    .insert(schema.blog_posts)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as BlogPost;
}

export async function updateBlogPost(
  id: string,
  data: Partial<BlogPost>
): Promise<BlogPost | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updateData = {
    ...safeUpdateData,
    updated_at: new Date(),
    published_at: safeUpdateData.published_at
      ? new Date(safeUpdateData.published_at)
      : null,
  };
  const updated = await db
    .update(schema.blog_posts)
    .set(updateData)
    .where(eq(schema.blog_posts.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as BlogPost;
}
export async function deleteBlogPost(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.blog_posts).where(eq(schema.blog_posts.id, id));
  return true;
}

// ===== MdxDocuments =====
/**
 * CRUD for MdxDocument entity (Supabase only)
 * Generated on 2025-05-17
 */
export async function getAllMdxDocuments(params?: {
  limit?: number;
  offset?: number;
  where?: Partial<MdxDocument>;
  orderBy?: keyof MdxDocument;
}): Promise<MdxDocument[]> {
  const db = getDrizzleClient();
  let query = db.select().from(schema.mdx_documents);
  if (params?.where) {
    const filters = Object.entries(params.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const col = schema.mdx_documents[
          key as keyof typeof schema.mdx_documents
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
      schema.mdx_documents[params.orderBy as keyof typeof schema.mdx_documents];
    if (!col) throw new Error(`Invalid orderBy column: ${params.orderBy}`);
    // @ts-expect-error: Drizzle query builder chaining
    query = query.orderBy(desc(col));
  }
  if (params?.limit !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.limit(params.limit);
  }
  if (params?.offset !== undefined) {
    // @ts-expect-error: Drizzle query builder chaining
    query = query.offset(params.offset);
  }
  const results = await query;
  return results.map((row) => normalizeTimestampsToString(row) as MdxDocument);
}

export async function getMdxDocumentById(
  id: string
): Promise<MdxDocument | null> {
  const db = getDrizzleClient();
  const result = await db
    .select()
    .from(schema.mdx_documents)
    .where(eq(schema.mdx_documents.id, id))
    .limit(1);
  if (!result[0]) return null;
  return normalizeTimestampsToString(result[0]) as MdxDocument;
}

export async function createMdxDocument(
  data: NewMdxDocument
): Promise<MdxDocument> {
  const db = getDrizzleClient();
  const insertData = stripTimestamps(data);
  const inserted = await db
    .insert(schema.mdx_documents)
    .values(insertData)
    .returning();
  return normalizeTimestampsToString(inserted[0]) as MdxDocument;
}

export async function updateMdxDocument(
  id: string,
  data: Partial<MdxDocument>
): Promise<MdxDocument | null> {
  const db = getDrizzleClient();
  const safeUpdateData = stripTimestamps(data);
  const updated = await db
    .update(schema.mdx_documents)
    .set({ ...safeUpdateData, updated_at: new Date() })
    .where(eq(schema.mdx_documents.id, id))
    .returning();
  if (!updated[0]) return null;
  return normalizeTimestampsToString(updated[0]) as MdxDocument;
}

export async function deleteMdxDocument(id: string): Promise<boolean> {
  const db = getDrizzleClient();
  await db.delete(schema.mdx_documents).where(eq(schema.mdx_documents.id, id));
  return true;
}
