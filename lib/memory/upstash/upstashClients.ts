import { z } from 'zod';
import { upstashLogger } from './upstash-logger';
import { Query } from '@upstash/query';
import { Redis } from '@upstash/redis';
import { Index } from '@upstash/vector';
import {
  RediSearchHybridQuery,
  QStashTaskPayload,
  WorkflowNode,
  UpstashEntityBase,
  UpstashEntitySchema,
  VectorIndexConfig,
  RediSearchHybridResult
} from './upstashTypes';

export type IndexConfig = VectorIndexConfig;

// --- Zod Schemas ---

/**
 * Schema for Redis client configuration
 */
export const RedisConfigSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1),
});

/**
 * Schema for Vector client configuration
 */
export const VectorConfigSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1),
  dimensions: z.number().positive().optional(),
  similarity: z.enum(['cosine', 'euclidean', 'dot']).optional(),
  indexName: z.string().optional(),
});

/**
 * Schema for environment variables
 */
export const EnvVarsSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().min(1).optional(),
});

let redisClientInstance: Redis | null = null;
let vectorClientInstance: Index | null = null;
let upstashQueryClient: Query | null = null;

/**
 * Custom error class for Upstash client-related issues.
 */
export class UpstashClientError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'UpstashClientError';
    Object.setPrototypeOf(this, UpstashClientError.prototype);
  }
}

/**
 * Validates environment variables using Zod schema
 *
 * @returns Validated environment variables
 * @throws UpstashClientError if validation fails
 */
export function validateEnvVars() {
  try {
    const result = EnvVarsSchema.safeParse(process.env);
    if (!result.success) {
      throw new UpstashClientError(`Environment variables validation failed: ${result.error.message}`);
    }
    return result.data;
  } catch (error: unknown) {
    if (error instanceof UpstashClientError) {
      throw error;
    }
    throw new UpstashClientError('Failed to validate environment variables', error);
  }
}

/**
 * Initializes and returns a singleton Upstash Redis client instance.
 * Reads configuration from environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * @throws {UpstashClientError} if Redis credentials are not found or initialization fails.
 */
export const getRedisClient = (): Redis => {
  if (redisClientInstance) {
    return redisClientInstance;
  }

  const env = validateEnvVars();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    upstashLogger.error('upstashClients', 'Upstash Redis credentials not found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.');
    throw new UpstashClientError("Upstash Redis credentials not found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.");
  }

  try {
    const configValidation = RedisConfigSchema.safeParse({ url, token });
    if (!configValidation.success) {
      upstashLogger.error('upstashClients', `Invalid Redis configuration: ${configValidation.error.message}`);
      throw new UpstashClientError(`Invalid Redis configuration: ${configValidation.error.message}`);
    }
    redisClientInstance = new Redis({
      url,
      token,
    });
    upstashLogger.info('upstashClients', 'Upstash Redis client initialized.');
  } catch (error: unknown) {
    upstashLogger.error('upstashClients', 'Failed to initialize Upstash Redis client.', error instanceof Error ? error : { message: String(error) });
    throw new UpstashClientError("Failed to initialize Upstash Redis client.", error);
  }

  return redisClientInstance;
};

/**
 * Initializes and returns an Upstash Vector client instance.
 * If a configuration is provided or no instance exists, a new one is created.
 * Otherwise, the existing singleton instance is returned.
 * Reads configuration from environment variables:
 * - UPSTASH_VECTOR_REST_URL
 * - UPSTASH_VECTOR_REST_TOKEN
 * @param config Optional configuration for the Upstash Vector Index.
 * @throws {UpstashClientError} if Vector credentials are not found or initialization fails.
 */
export const getVectorClient = (config?: IndexConfig): Index => {
  if (config || !vectorClientInstance) {
    const env = validateEnvVars();
    const url = env.UPSTASH_VECTOR_REST_URL;
    const token = env.UPSTASH_VECTOR_REST_TOKEN;

    if (!url || !token) {
      upstashLogger.error('upstashClients', 'Upstash Vector credentials not found. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.');
      throw new UpstashClientError("Upstash Vector credentials not found. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.");
    }

    try {
      const configToValidate = {
        url,
        token,
        ...config
      };

      const configValidation = VectorConfigSchema.safeParse(configToValidate);
      if (!configValidation.success) {
        upstashLogger.error('upstashClients', `Invalid Vector configuration: ${configValidation.error.message}`);
        throw new UpstashClientError(`Invalid Vector configuration: ${configValidation.error.message}`);
      }

      const newInstance = new Index({
        url,
        token,
        ...config
      });
      vectorClientInstance = newInstance;
      upstashLogger.info('upstashClients', 'Upstash Vector client initialized.');
      return vectorClientInstance;
    } catch (error: unknown) {
      upstashLogger.error('upstashClients', 'Failed to initialize Upstash Vector client.', error instanceof Error ? error : { message: String(error) });
      throw new UpstashClientError("Failed to initialize Upstash Vector client.", error);
    }
  }
  return vectorClientInstance;
};

/**
 * Initializes and returns a singleton Upstash Query client instance.
 * Uses the Upstash Redis REST client for RediSearch and advanced querying.
 * Throws if credentials are missing or invalid.
 * All config is validated and errors are logged with upstashLogger.
 */
export const getUpstashQueryClient = (): Query => {
  if (upstashQueryClient) return upstashQueryClient;
  const env = validateEnvVars();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url) {
    upstashLogger.error('upstashClients', 'Upstash Query URL not found. Please set UPSTASH_REDIS_REST_URL environment variable.');
    throw new UpstashClientError('Upstash Query URL not found.');
  }
  // Correct config for @upstash/query: expects { url, token }
  upstashQueryClient = new Query({ url, token });
  upstashLogger.info('upstashClients', 'Upstash Query client initialized.');
  return upstashQueryClient;
};

/**
 * Check if Upstash Redis is available based on environment variables
 * @returns Whether Upstash Redis is available
 */
export function isUpstashRedisAvailable(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

/**
 * Check if Upstash Vector is available based on environment variables
 * @returns Whether Upstash Vector is available
 */
export function isUpstashVectorAvailable(): boolean {
  return !!process.env.UPSTASH_VECTOR_REST_URL && !!process.env.UPSTASH_VECTOR_REST_TOKEN;
}

/**
 * Check if Upstash adapter should be used based on environment variables
 * @returns Whether Upstash adapter should be used
 */
export function shouldUseUpstashAdapter(): boolean {
  return process.env.USE_UPSTASH_ADAPTER === 'true';
}

/**
 * Checks the availability of Upstash services (Redis and Vector).
 * @returns A promise that resolves to an object indicating the availability of each service
 *          and any errors encountered.
 */
export const checkUpstashAvailability = async (): Promise<{
  redisAvailable: boolean;
  vectorAvailable: boolean;
  redisError?: UpstashClientError | Error | unknown;
  vectorError?: UpstashClientError | Error | unknown;
  overallStatusMessage: string;
}> => {
  let redisAvailable = false;
  let vectorAvailable = false;
  let redisError: UpstashClientError | Error | unknown = undefined;
  let vectorError: UpstashClientError | Error | unknown = undefined;

  if (!isUpstashRedisAvailable()) {
    redisError = new UpstashClientError("Upstash Redis environment variables not set");
    redisAvailable = false;
  } else {
    try {
      const redis = getRedisClient();
      await redis.ping();
      redisAvailable = true;
      upstashLogger.info('upstashClients', 'Upstash Redis connection successful.');
    } catch (error: unknown) {
      upstashLogger.error('upstashClients', 'Upstash Redis connection failed', error instanceof Error ? error : { message: String(error) });
      redisError = error instanceof UpstashClientError ? error : new UpstashClientError("Redis availability check failed.", error);
      redisAvailable = false;
    }
  }

  if (!isUpstashVectorAvailable()) {
    vectorError = new UpstashClientError("Upstash Vector environment variables not set");
    vectorAvailable = false;
  } else {
    try {
      const vector = getVectorClient();
      await vector.info();
      vectorAvailable = true;
      upstashLogger.info('upstashClients', 'Upstash Vector connection successful (checked via info()).');
    } catch (error: unknown) {
      upstashLogger.error('upstashClients', 'Upstash Vector connection failed or info() call issue', error instanceof Error ? error : { message: String(error) });
      vectorError = error instanceof UpstashClientError ? error : new UpstashClientError("Vector availability check failed.", error);
      vectorAvailable = false;
    }
  }

  let overallStatusMessage = "";
  if (redisAvailable && vectorAvailable) {
    overallStatusMessage = "All Upstash services (Redis, Vector) are available.";
  } else if (redisAvailable) {
    overallStatusMessage = "Upstash Redis is available, but Vector is unavailable.";
  } else if (vectorAvailable) {
    overallStatusMessage = "Upstash Vector is available, but Redis is unavailable.";
  } else {
    overallStatusMessage = "Both Upstash Redis and Vector services are unavailable.";
  }

  return { redisAvailable, vectorAvailable, redisError, vectorError, overallStatusMessage };
};

/**
 * Validates a Redis configuration object using Zod schema
 *
 * @param config - Redis configuration to validate
 * @returns Validated Redis configuration
 * @throws UpstashClientError if validation fails
 */
export function validateRedisConfig(config: unknown): z.infer<typeof RedisConfigSchema> {
  try {
    return RedisConfigSchema.parse(config);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw new UpstashClientError(`Invalid Redis configuration: ${error.message}`, error);
    }
    throw new UpstashClientError('Failed to validate Redis configuration', error);
  }
}

/**
 * Validates a Vector configuration object using Zod schema
 *
 * @param config - Vector configuration to validate
 * @returns Validated Vector configuration
 * @throws UpstashClientError if validation fails
 */
export function validateVectorConfig(config: unknown): z.infer<typeof VectorConfigSchema> {
  try {
    return VectorConfigSchema.parse(config);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw new UpstashClientError(`Invalid Vector configuration: ${error.message}`, error);
    }
    throw new UpstashClientError('Failed to validate Vector configuration', error);
  }
}

/**
 * Returns true if Upstash should be used as the main DB (not just a cache or fallback).
 * Controlled by env var USE_UPSTASH_ADAPTER=true.
 */
export function isUpstashMainDb(): boolean {
  return process.env.USE_UPSTASH_ADAPTER === 'true';
}

/**
 * Returns true if fallback to Supabase/LibSQL should be attempted (if Upstash is unavailable).
 * Controlled by env var USE_UPSTASH_ADAPTER and presence of backup env vars.
 */
export function shouldFallbackToBackup(): boolean {
  return !isUpstashMainDb() && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_KEY;
}

/**
 * Helper: Serialize entity for Redis hset
 */
function serializeEntityForRedis<T extends UpstashEntityBase>(entity: T): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(entity)) {
    if (k === 'metadata' && v != null) {
      result[k] = JSON.stringify(v);
    } else if (typeof v === 'object' && v !== null) {
      result[k] = JSON.stringify(v);
    } else {
      result[k] = v as string | number | boolean | null;
    }
  }
  return result;
}

/** 
 * Generic create or update for any Upstash entity type. 
 * @param entityType - e.g. 'thread', 'message', 'agent_state', etc.
 * @param entity - The entity object (must match schema)
 * @param schema - The Zod schema for validation
 */
export async function upstashUpsertEntity<T extends UpstashEntityBase>(
  entityType: string,
  entity: T,
  schema: z.ZodType<T> = UpstashEntitySchema as z.ZodType<T>
): Promise<T> {
  const redis = getRedisClient();
  const validated = schema.parse(entity);
  const key = `${entityType}:${entity.id}`;
  await redis.hset(key, serializeEntityForRedis(validated));
  return validated;
}

/**
 * Generic get by ID for any Upstash entity type.
 */
export async function upstashGetEntityById<T extends UpstashEntityBase>(
  entityType: string,
  id: string,
  schema: z.ZodType<T> = UpstashEntitySchema as z.ZodType<T>
): Promise<T | null> {
  const redis = getRedisClient();
  const key = `${entityType}:${id}`;
  const data = await redis.hgetall(key);
  if (!data || Object.keys(data).length === 0) return null;
  return schema.parse(data);
}

/**
 * Generic delete for any Upstash entity type.
 */
export async function upstashDeleteEntity(
  entityType: string,
  id: string
): Promise<boolean> {
  const redis = getRedisClient();
  const key = `${entityType}:${id}`;
  const result = await redis.del(key);
  return result > 0;
}

/**
 * Generic list/search for any Upstash entity type (with optional RediSearch/hybrid query)
 */
export async function upstashListEntities<T extends UpstashEntityBase>(
  entityType: string,
  options?: { limit?: number; offset?: number; filters?: Record<string, unknown>; sortBy?: string; sortOrder?: 'ASC' | 'DESC' },
  schema: z.ZodType<T> = UpstashEntitySchema as z.ZodType<T>
): Promise<T[]> {
  if (options?.filters || options?.sortBy) {
    const query: RediSearchHybridQuery = {
      index: entityType,
      query: '*',
      ...options,
    };
    const results = await runRediSearchHybridQuery(query) as RediSearchHybridResult[];
    return results.map(r => schema.parse(r.fields));
  } else {
    const redis = getRedisClient();
    const pattern = `${entityType}:*`;
    let cursor = 0;
    let entities: T[] = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);
      for (const key of keys) {
        const data = await redis.hgetall(key);
        if (data && Object.keys(data).length > 0) {
          entities.push(schema.parse(data));
        }
      }
    } while (cursor !== 0 && (!options?.limit || entities.length < options.limit));
    if (options?.limit) entities = entities.slice(0, options.limit);
    return entities;
  }
}

/**
 * Add RediSearch/Hybrid Query client helper
 */
export const runRediSearchHybridQuery = async (query: RediSearchHybridQuery) => {
  const client: Query = getUpstashQueryClient();
  type FtSearchFn = (index: string, query: string, options: Record<string, unknown>) => Promise<unknown>;
  type SearchFn = (index: string, query: string, options: Record<string, unknown>) => Promise<unknown>;
  const options = {
    vector: query.vector,
    filters: query.filters,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    offset: query.offset,
    limit: query.limit,
  };
  if (typeof ((client as unknown) as { ftSearch?: FtSearchFn }).ftSearch === 'function') {
    return ((client as unknown) as { ftSearch: FtSearchFn }).ftSearch(query.index, query.query, options);
  } else if (typeof ((client as unknown) as { search?: SearchFn }).search === 'function') {
    return ((client as unknown) as { search: SearchFn }).search(query.index, query.query, options);
  } else {
    throw new UpstashClientError('No RediSearch/hybrid search method found on Query client. Please update @upstash/query or implement advanced search integration.');
  }
};

/**
 * QStash/Workflow client placeholder (to be implemented as needed)
 */
export const enqueueQStashTask = async (payload: QStashTaskPayload) => {
  return { status: 'enqueued', id: payload.id };
};

export const trackWorkflowNode = async (node: WorkflowNode) => {
  return { status: node.status, id: node.id };
};
