/**
 * Drizzle ORM integration for Supabase
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/supabase/schema';

// Singleton instance for connection reuse
let drizzleClient: ReturnType<typeof drizzle> | null = null;

/**
 * Get a Drizzle ORM client for Supabase
 * @returns Drizzle ORM client
 */
export const getDrizzleClient = () => {
  if (drizzleClient) {
    return drizzleClient;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Database connection string not found. Please set DATABASE_URL environment variable."
    );
  }

  // Create a Postgres client
  const client = postgres(connectionString, { max: 10 });

  // Create a Drizzle client
  drizzleClient = drizzle(client, { schema });

  return drizzleClient;
};

/**
 * Check if Drizzle is available
 * @returns True if Drizzle is available
 */
export const isDrizzleAvailable = async () => {
  try {
    const db = getDrizzleClient();
    await db.select().from(schema.models).limit(1);
    return true;
  } catch (error) {
    console.error("Error checking Drizzle availability:", error);
    return false;
  }
};

/**
 * Generic function to get data from Drizzle
 * @param table The table to query
 * @param options Query options
 * @returns Array of results
 */
export async function getDataWithDrizzle<T>(
  table: any,
  options?: {
    select?: any;
    filters?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: { column: string; ascending?: boolean };
  }
): Promise<T[]> {
  const db = getDrizzleClient();

  try {
    // For simplicity, we'll just get all data and filter in memory
    const allData = await db.select().from(table);

    let result = allData;

    // Apply filters in memory if provided
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (key === 'search') {
          // Handle search filter specially - this would need to be customized
          // This is a simplified example that searches in name or title columns
          result = result.filter((item: any) =>
            (item.name && item.name.toLowerCase().includes(value.toLowerCase())) ||
            (item.title && item.title.toLowerCase().includes(value.toLowerCase()))
          );
        } else {
          result = result.filter((item: any) => item[key] === value);
        }
      });
    }

    // Apply ordering if provided
    if (options?.orderBy) {
      const { column, ascending = true } = options.orderBy;
      result.sort((a: any, b: any) => {
        if (a[column] < b[column]) return ascending ? -1 : 1;
        if (a[column] > b[column]) return ascending ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination in memory
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const start = options?.offset || 0;
      const end = options?.limit ? start + options.limit : undefined;
      result = result.slice(start, end);
    }

    return result as T[];
  } catch (error) {
    console.error(`Error fetching data with Drizzle:`, error);
    throw error;
  }
}
/**
 * Get a model by ID using Drizzle
 * @param modelId The model ID
 * @returns The model or null if not found
 */
export async function getModelConfigWithDrizzle(modelId: string) {
  const db = getDrizzleClient();

  try {
    // Get all models and find the one with matching ID
    const allModels = await db.select().from(schema.models);
    const model = allModels.find(m => m.id === modelId);

    if (!model) {
      return null;
    }

    return model;
  } catch (error) {
    console.error("Error fetching model config with Drizzle:", error);
    throw error;
  }
}
