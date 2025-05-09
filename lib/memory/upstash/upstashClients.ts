import { Redis } from '@upstash/redis';
import { Index, type IndexConfig as UpstashVectorIndexConfig } from "@upstash/vector";

// Re-export IndexConfig for convenience if consumers need to specify it.
export type IndexConfig = UpstashVectorIndexConfig;

let redisClientInstance: Redis | null = null;
let vectorClientInstance: Index | null = null;

/**
 * Custom error class for Upstash client-related issues.
 */
export class UpstashClientError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'UpstashClientError';
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, UpstashClientError.prototype);
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

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new UpstashClientError("Upstash Redis credentials not found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.");
  }

  try {
    redisClientInstance = new Redis({
      url,
      token,
    });
  } catch (error) {
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
    const url = process.env.UPSTASH_VECTOR_REST_URL;
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

    if (!url || !token) {
      throw new UpstashClientError("Upstash Vector credentials not found. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.");
    }

    try {
      // Create a new instance if config is provided or none exists
      const newInstance = new Index({
        url,
        token,
        ...config
      });
      // If config was provided, this new instance becomes the singleton for subsequent calls without config.
      // If no config was provided but instance didn't exist, it also becomes the singleton.
      vectorClientInstance = newInstance;
      return vectorClientInstance;
    } catch (error) {
      throw new UpstashClientError("Failed to initialize Upstash Vector client.", error);
    }
  } 
  // No new config, and an instance exists, so return the existing one.
  return vectorClientInstance;
};

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

  // Check Redis
  try {
    const redis = getRedisClient();
    await redis.ping();
    redisAvailable = true;
    console.log("Upstash Redis connection successful.");
  } catch (error) {
    console.error("Upstash Redis connection failed:", error);
    redisError = error instanceof UpstashClientError ? error : new UpstashClientError("Redis availability check failed.", error);
    redisAvailable = false;
  }

  // Check Vector
  try {
    const vector = getVectorClient(); // Get client (potentially new if called with config elsewhere, but usually singleton here)
    await vector.info(); // Attempt to fetch index info as a concrete check.
    vectorAvailable = true;
    console.log("Upstash Vector connection successful (checked via info()).");
  } catch (error) {
    console.error("Upstash Vector connection failed or info() call issue:", error);
    vectorError = error instanceof UpstashClientError ? error : new UpstashClientError("Vector availability check failed.", error);
    vectorAvailable = false;
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
