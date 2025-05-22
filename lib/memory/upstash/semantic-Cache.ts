import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { SemanticCache } from '@upstash/semantic-cache';
import { Index } from '@upstash/vector';

let semanticCacheInstance: SemanticCache | null = null;

/**
 * Initializes and returns a singleton instance of the Upstash Semantic Cache.
 * Requires UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.
 * @returns {SemanticCache} The initialized SemanticCache instance.
 * @throws {Error} If required environment variables are not set.
 */
export function getSemanticCacheClient(): SemanticCache {
  if (semanticCacheInstance) {
    return semanticCacheInstance;
  }
  const upstashVectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
  const upstashVectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!upstashVectorUrl || !upstashVectorToken) {
    upstashLogger.error(
      'semantic-cache',
      'Missing Upstash Vector environment variables. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN.'
    );
    throw new Error(
      'Upstash Vector URL or Token not configured. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.'
    );
  }
  try {
    const index = new Index({
      url: upstashVectorUrl,
      token: upstashVectorToken,
    });
    semanticCacheInstance = new SemanticCache({
      index,
      minProximity: 0.95,
    });
    upstashLogger.info(
      'semantic-cache',
      'Upstash Semantic Cache client initialized successfully.'
    );
    return semanticCacheInstance;
  } catch (error: unknown) {
    upstashLogger.error(
      'semantic-cache',
      'Failed to initialize Upstash Semantic Cache client.',
      error as Error | null
    );
    throw new Error(
      `Failed to initialize SemanticCache: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Sets a value in the semantic cache.
 * @param {string} key - The key or question.
 * @param {string} value - The value or answer.
 * @returns {Promise<void>}
 * @throws {Error} If the cache operation fails.
 */
export async function setSemanticCache(
  key: string,
  value: string
): Promise<void> {
  const cache = getSemanticCacheClient();
  await cache.set(key, value);
  upstashLogger.info('semantic-cache', `Set cache for key: ${key}`);
}

/**
 * Gets a value from the semantic cache.
 * @param {string} query - The query or question.
 * @returns {Promise<string | null>} - The cached value or null if not found or on error.
 */
export async function getSemanticCache(query: string): Promise<string | null> {
  const cache = getSemanticCacheClient();
  const result = await cache.get(query);
  if (result !== undefined) {
    upstashLogger.info('semantic-cache', `Cache hit for query: ${query}`);
    return result;
  }
  upstashLogger.info('semantic-cache', `Cache miss for query: ${query}`);
  return null;
}

/**
 * Deletes a value from the semantic cache.
 * @param {string} key - The key or question to delete.
 * @returns {Promise<void>}
 * @throws {Error} If the cache operation fails.
 */
export async function deleteSemanticCache(key: string): Promise<void> {
  const cache = getSemanticCacheClient();
  await cache.delete(key);
  upstashLogger.info('semantic-cache', `Deleted cache for key: ${key}`);
}
