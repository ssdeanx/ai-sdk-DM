import { Redis } from '@upstash/redis';
import { Index, type IndexConfig as UpstashVectorIndexConfig } from "@upstash/vector";
import { z } from 'zod';
import { upstashLogger } from './upstash-logger';
import { Query } from '@upstash/query';

// Re-export IndexConfig for convenience if consumers need to specify it.
export type IndexConfig = UpstashVectorIndexConfig;

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
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, UpstashClientError.prototype);
  }
}

/**
 * Validates environment variables using Zod schema
 *
 * @returns Validated environment variables
 * @throws UpstashClientError if validation fails
 */
function validateEnvVars() {
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

  // Validate environment variables
  const env = validateEnvVars();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    upstashLogger.error('upstashClients', 'Upstash Redis credentials not found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.');
    throw new UpstashClientError("Upstash Redis credentials not found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.");
  }

  try {
    // Validate Redis configuration
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
  // If a config is provided, or no instance exists, create/re-create one.
  if (config || !vectorClientInstance) {
    // Validate environment variables
    const env = validateEnvVars();
    const url = env.UPSTASH_VECTOR_REST_URL;
    const token = env.UPSTASH_VECTOR_REST_TOKEN;

    if (!url || !token) {
      upstashLogger.error('upstashClients', 'Upstash Vector credentials not found. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.');
      throw new UpstashClientError("Upstash Vector credentials not found. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.");
    }

    try {
      // Validate Vector configuration
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

      // Create a new instance if config is provided or none exists
      const newInstance = new Index({
        url,
        token,
        ...config
      });
      // If config was provided, this new instance becomes the singleton for subsequent calls without config.
      // If no config was provided but instance didn't exist, it also becomes the singleton.
      vectorClientInstance = newInstance;
      upstashLogger.info('upstashClients', 'Upstash Vector client initialized.');
      return vectorClientInstance;
    } catch (error: unknown) {
      upstashLogger.error('upstashClients', 'Failed to initialize Upstash Vector client.', error instanceof Error ? error : { message: String(error) });
      throw new UpstashClientError("Failed to initialize Upstash Vector client.", error);
    }
  }
  // No new config, and an instance exists, so return the existing one.
  return vectorClientInstance;
};

/**
 * Initializes and returns a singleton Upstash Query client instance.
 * Reads configuration from environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * @throws {UpstashClientError} if Query credentials are not found or initialization fails.
 */
export const getUpstashQueryClient = (): Query => {
  if (upstashQueryClient) return upstashQueryClient;
  const env = validateEnvVars();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    upstashLogger.error('upstashClients', 'Upstash Query credentials not found.');
    throw new UpstashClientError('Upstash Query credentials not found.');
  }
  upstashQueryClient = new Query({
    redis: getRedisClient(),
  });
  upstashLogger.info('upstashClients', 'Upstash Query client initialized.');
  return upstashQueryClient;
};

/**
 * Check if Upstash Redis is available based on environment variables
 * @returns Whether Upstash Redis is available
 */
export function isUpstashRedisAvailable(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REST_TOKEN;
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

  // Check if Redis is available based on environment variables
  if (!isUpstashRedisAvailable()) {
    redisError = new UpstashClientError("Upstash Redis environment variables not set");
    redisAvailable = false;
  } else {
    // Check Redis connection
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

  // Check if Vector is available based on environment variables
  if (!isUpstashVectorAvailable()) {
    vectorError = new UpstashClientError("Upstash Vector environment variables not set");
    vectorAvailable = false;
  } else {
    // Check Vector connection
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

// --- Upstash as Main DB, Fallback Detection ---

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

// --- Ensure all exports are up-to-date and type-safe ---
// (No changes needed, all exports are already present and type-safe)

// --- Onboarding/graph extraction doc ---
/**
 * This file is the canonical entry point for Upstash client management.
 * - Always use getRedisClient/getVectorClient/getUpstashQueryClient for singleton access.
 * - All config is validated with Zod and errors are logged with upstashLogger.
 * - Use isUpstashMainDb() to check if Upstash is the main DB.
 * - Use shouldFallbackToBackup() to check if fallback to Supabase/LibSQL is allowed.
 * - All changes here must be reflected in upstash.json and README.md.
 */
