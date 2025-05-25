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
import { eq, desc, and, type Column } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';

// Canonical types for all Supabase entities
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
} from '../shared/types/supabase';

// --- Upstash Client Utilities ---
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
export type CacheItem = Record<string, unknown> | unknown[];

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

    const tableClient = upstash.from('users', schema.users);
    await tableClient.getAll({ limit: 1 });

    return true;
  } catch {
    return false;
  }
};

// ----- Database Access Functions -----
// Utility: Normalize Drizzle Date/null fields to string for Zod compatibility
type ObjectWithOptionalTimestamps = {
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
};

type WithStringTimestamps<T> = Omit<T, 'created_at' | 'updated_at'> & {
  created_at: string;
  updated_at: string;
};

function normalizeTimestampsToString<T extends ObjectWithOptionalTimestamps>(
  row: T
): WithStringTimestamps<T> {
  const {
    created_at: originalCreatedAt,
    updated_at: originalUpdatedAt,
    ...rest
  } = row;

  return {
    ...rest,
    created_at:
      originalCreatedAt && typeof originalCreatedAt !== 'string'
        ? new Date(originalCreatedAt).toISOString()
        : (originalCreatedAt ?? ''),
    updated_at:
      originalUpdatedAt && typeof originalUpdatedAt !== 'string'
        ? new Date(originalUpdatedAt).toISOString()
        : (originalUpdatedAt ?? ''),
  } as WithStringTimestamps<T>;
}

function stripTimestamps<
  T extends { created_at?: unknown; updated_at?: unknown },
>(obj: T): Omit<T, 'created_at' | 'updated_at'> {
  const rest = { ...obj };
  delete rest.created_at;
  delete rest.updated_at;
  return rest as Omit<T, 'created_at' | 'updated_at'>;
}

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
      const tableClient = client.from('users', schema.users);
      const upstashParams = {
        ...params,
        orderBy: params?.orderBy
          ? { column: params.orderBy, order: 'desc' }
          : undefined,
      };
      const results = (await tableClient.getAll(upstashParams)) as unknown[];
      return results.map(
        (item) => normalizeTimestampsToString(item as User) as User
      );
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
      const tableClient = client.from('users', schema.users);
      const user = (await tableClient.getById(id)) as User | null;
      if (!user) return null;
      return normalizeTimestampsToString(user) as User;
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
      const tableClient = client.from<User>('users', schema.users);
      const updatedUser = await tableClient.update(id, data);
      if (!updatedUser) {
        return null;
      }
      return normalizeTimestampsToString(updatedUser) as User;
    } else {
      const db = getDrizzleClient();
      const safeUpdateData = stripTimestamps(data);
      const updatedUsersArray = await db
        .update(schema.users)
        .set({ ...safeUpdateData, updated_at: new Date() })
        .where(eq(schema.users.id, id))
        .returning();
      if (
        !updatedUsersArray ||
        updatedUsersArray.length === 0 ||
        !updatedUsersArray[0]
      ) {
        return null;
      }
      return normalizeTimestampsToString(updatedUsersArray[0]) as User;
    }
  } catch (err) {
    throw err;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('users', schema.users);
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
      const tableClient = client.from('tools', schema.tools);
      const upstashOptions: {
        limit?: number;
        offset?: number;
        where?: Partial<Tool>;
        orderBy?: { column: keyof Tool; ascending: boolean };
      } = {};
      if (params?.limit !== undefined) {
        upstashOptions.limit = params.limit;
      }
      if (params?.offset !== undefined) {
        upstashOptions.offset = params.offset;
      }
      if (params?.where) {
        upstashOptions.where = params.where;
      }
      if (params?.orderBy) {
        upstashOptions.orderBy = {
          column: params.orderBy,
          ascending: false,
        };
      }
      const results = (await tableClient.getAll(upstashOptions)) as unknown[];
      return results.map((item) => {
        const toolItem = item as Record<string, unknown>;
        const norm = normalizeTimestampsToString(toolItem as Tool);
        return {
          ...norm,
          parameters_schema:
            typeof norm.parameters_schema === 'object' &&
            norm.parameters_schema !== null
              ? norm.parameters_schema
              : {},
          tags:
            typeof norm.tags === 'object' && norm.tags !== null
              ? norm.tags
              : {},
        } as Tool;
      });
    } else {
      const db = getDrizzleClient();
      let query = db.select().from(schema.tools);
      if (params?.where) {
        const filters = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => {
            const col = schema.tools[
              key as keyof typeof schema.tools
            ] as Column;
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
      const tableClient = client.from('tools', schema.tools);
      const tool = (await tableClient.getById(id)) as Tool | null;
      if (!tool) return null;
      const norm = normalizeTimestampsToString(tool);
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
      const tools = await db
        .select()
        .from(schema.tools)
        .where(eq(schema.tools.id, id))
        .limit(1);
      if (!tools[0]) return null;
      const norm = normalizeTimestampsToString(tools[0]);
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

export async function createTool(data: NewTool): Promise<Tool> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('tools', schema.tools);
      const createdToolData = await tableClient.create(data);
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
      const insertData = stripTimestamps(data);
      const inserted = await db
        .insert(schema.tools)
        .values(insertData)
        .returning();
      const norm = normalizeTimestampsToString(inserted[0]);
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

export async function updateTool(
  id: string,
  data: Partial<Tool>
): Promise<Tool | null> {
  try {
    if (shouldUseUpstash()) {
      const client = getUpstashClient();
      const tableClient = client.from('tools', schema.tools);
      const updatedResult = await tableClient.update(id, data);
      if (
        !updatedResult ||
        !Array.isArray(updatedResult) ||
        updatedResult.length === 0 ||
        !updatedResult[0]
      ) {
        return null;
      }
      const row = updatedResult[0];
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

      if (
        !updated ||
        !Array.isArray(updated) ||
        updated.length === 0 ||
        !updated[0]
      ) {
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
