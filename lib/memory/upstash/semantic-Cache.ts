import { SemanticCache } from '@upstash/semantic-cache';
import { Index } from '@upstash/vector';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';

let semanticCacheInstance: SemanticCache | null = null;

/**
 * Initializes and returns a singleton instance of the Upstash Semantic Cache.
 * Requires UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.
 * @returns {SemanticCache} The initialized SemanticCache instance.
 * @throws {Error} If required environment variables are not set.
 */
function getSemanticCacheClient(): SemanticCache {
  // Generated on 2024-07-30
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
      // You can choose a specific embedding model if needed, e.g., retries: 3
    });

    semanticCacheInstance = new SemanticCache({
      index,
      minProximity: 0.95, // Default, can be overridden or made configurable
      // namespace: 'your-namespace' // Optional: if you need multi-tenancy
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
  // Generated on 2024-07-30
  try {
    const cache = getSemanticCacheClient();
    await cache.set(key, value);
    upstashLogger.info('semantic-cache', `Set cache for key: ${key}`);
  } catch (error: unknown) {
    upstashLogger.error(
      'semantic-cache',
      `Error setting cache for key: ${key}`,
      error as Error
    );
    throw new Error(
      `Failed to set cache for key "${key}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Gets a value from the semantic cache.
 * @param {string} query - The query or question.
 * @returns {Promise<string | null>} - The cached value or null if not found or on error.
 */
export async function getSemanticCache(query: string): Promise<string | null> {
  // Generated on 2024-07-30
  try {
    const cache = getSemanticCacheClient();
    const result = await cache.get(query);
    if (result !== undefined) {
      // Upstash SemanticCache returns undefined for no hit
      upstashLogger.info('semantic-cache', `Cache hit for query: ${query}`);
      return result;
    }
    upstashLogger.info('semantic-cache', `Cache miss for query: ${query}`);
    return null;
  } catch (error: unknown) {
    upstashLogger.error(
      'semantic-cache',
      `Error getting cache for query: ${query}`,
      error as Error
    );
    // Decide if to throw or return null on error. Returning null might be safer for cache operations.
    return null;
  }
}

/**
 * Deletes a value from the semantic cache.
 * @param {string} key - The key or question to delete.
 * @returns {Promise<void>}
 * @throws {Error} If the cache operation fails.
 */
export async function deleteSemanticCache(key: string): Promise<void> {
  // Generated on 2024-07-30
  try {
    const cache = getSemanticCacheClient();
    await cache.delete(key);
    upstashLogger.info('semantic-cache', `Deleted cache for key: ${key}`);
  } catch (error: unknown) {
    upstashLogger.error(
      'semantic-cache',
      `Error deleting cache for key: ${key}`,
      error as Error
    );
    throw new Error(
      `Failed to delete cache for key "${key}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
// Example usage (optional, can be removed or adapted for testing/seeding)
// async function exampleUsage() {
//   try {
//     // Ensure environment variables are set before running this example
//     if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
//       console.warn("Skipping semantic cache example: Upstash environment variables not set.");
//       return;
//     }

//     await setSemanticCache('Capital of Turkey', 'Ankara');
//     await setSemanticCache('Capital of France', 'Paris');

//     const turkeyCapital = await getSemanticCache("What is Turkey's capital?");
//     upstashLogger.info('semantic-cache-example', `Turkey's capital: ${turkeyCapital}`);

//     const franceCapital = await getSemanticCache('What is the capital of France?');
//     upstashLogger.info('semantic-cache-example', `France's capital: ${franceCapital}`);

//     await deleteSemanticCache('Capital of Turkey');
//     const deletedTurkeyCapital = await getSemanticCache("What is Turkey's capital?");
//     upstashLogger.info('semantic-cache-example', `Turkey's capital after deletion: ${deletedTurkeyCapital}`);

//   } catch (error) {
//     upstashLogger.error('semantic-cache-example', 'Error in example usage', error);
//   }
// }

// // To run the example, uncomment the line below and ensure .env variables are loaded
// // exampleUsage();
