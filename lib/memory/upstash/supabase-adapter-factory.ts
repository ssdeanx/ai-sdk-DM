/**
 * Supabase Adapter Factory
 *
 * This module provides a factory for creating Supabase-like clients using Upstash Redis and Vector.
 * It implements similar interfaces and functionality to make the transition seamless.
 *
 * @module supabase-adapter-factory
 */

import {
  getData,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  vectorSearch,
  upsertSupabaseVectors,
  TableRow,
  FilterOptions,
  OrderOptions,
  QueryOptions,
  UpstashAdapterError
} from './index';
import { z } from 'zod'; // Keep this import as requested

// --- Type Definitions ---

/**
 * Supabase-like client for a specific table
 */
export interface TableClient {
  /**
   * Gets all items from the table
   *
   * @param options - Query options
   * @returns Promise resolving to an array of table rows
   */
  getAll(options?: QueryOptions): Promise<Array<TableRow>>;

  /**
   * Gets an item by ID from the table
   *
   * @param id - Item ID
   * @returns Promise resolving to the item or null if not found
   */
  getById(id: string): Promise<TableRow | null>;

  /**
   * Creates an item in the table
   *
   * @param item - Item to create
   * @returns Promise resolving to the created item
   */
  create(item: Omit<TableRow, 'id'> & { id?: string }): Promise<TableRow>;

  /**
   * Updates an item in the table
   *
   * @param id - Item ID
   * @param updates - Updates to apply
   * @returns Promise resolving to the updated item
   */
  update(id: string, updates: Partial<TableRow>): Promise<TableRow>;

  /**
   * Deletes an item from the table
   *
   * @param id - Item ID
   * @returns Promise resolving to true if successful
   */
  delete(id: string): Promise<boolean>;

  /**
   * Selects specific columns from the table
   *
   * @param columns - Columns to select
   * @returns Table client with select option
   */
  select(...columns: string[]): TableClient;

  /**
   * Filters items in the table
   *
   * @param field - Field to filter on
   * @param operator - Filter operator
   * @param value - Filter value
   * @returns Table client with filter option
   */
  filter(field: string, operator: FilterOptions['operator'], value: any): TableClient;

  /**
   * Orders items in the table
   *
   * @param column - Column to order by
   * @param ascending - Whether to order in ascending order
   * @returns Table client with order option
   */
  order(column: string, ascending?: boolean): TableClient;

  /**
   * Limits the number of items returned
   *
   * @param limit - Maximum number of items to return
   * @returns Table client with limit option
   */
  limit(limit: number): TableClient;

  /**
   * Skips a number of items
   *
   * @param offset - Number of items to skip
   * @returns Table client with offset option
   */
  offset(offset: number): TableClient;
}

/**
 * Supabase-like client for vector operations
 */
export interface VectorClient {
  /**
   * Performs a vector search
   *
   * @param query - Vector query
   * @param options - Search options
   * @returns Promise resolving to search results
   */
  search(
    query: number[],
    options?: {
      topK?: number;
      filter?: Record<string, any>;
      includeMetadata?: boolean;
      includeVectors?: boolean;
      namespace?: string;
    }
  ): Promise<any[]>;

  /**
   * Upserts vectors
   *
   * @param vectors - Vectors to upsert
   * @param options - Upsert options
   * @returns Promise resolving to upsert results
   */
  upsert(
    vectors: Array<{
      id: string;
      vector: number[];
      metadata?: Record<string, any>;
    }>,
    options?: {
      namespace?: string;
    }
  ): Promise<any>;
}

/**
 * Supabase-like client
 */
export interface SupabaseClient {
  /**
   * Gets a table client for a specific table
   *
   * @param tableName - Table name
   * @returns Table client
   */
  from(tableName: string): TableClient;

  /**
   * Gets the vector client
   *
   * @returns Vector client
   */
  vector: VectorClient;
}

// Use the imports in type annotations to prevent unused import warnings
type OrderOptionsType = OrderOptions;
type UpstashAdapterErrorType = UpstashAdapterError;
// Use z in a type to prevent unused import warning
type ZodType = typeof z;

// --- Factory Function ---

/**
 * Creates a Supabase-like client using Upstash Redis and Vector
 *
 * @returns Supabase-like client
 */
export function createSupabaseClient(): SupabaseClient {
  /**
   * Creates a table client for a specific table
   *
   * @param tableName - Table name
   * @returns Table client
   */
  function createTableClient(tableName: string): TableClient {
    let options: QueryOptions = {};

    const client: TableClient = {
      getAll: async (queryOptions?: QueryOptions) => {
        return getData(tableName, {
          ...options,
          ...queryOptions
        });
      },

      getById: async (id: string) => {
        return getItemById(tableName, id);
      },

      create: async (item: Omit<TableRow, 'id'> & { id?: string }) => {
        return createItem(tableName, item);
      },

      update: async (id: string, updates: Partial<TableRow>) => {
        return updateItem(tableName, id, updates);
      },

      delete: async (id: string) => {
        return deleteItem(tableName, id);
      },

      select: (...columns: string[]) => {
        options = {
          ...options,
          select: columns
        };
        return client;
      },

      filter: (field: string, operator: FilterOptions['operator'], value: any) => {
        const filters = options.filters || [];
        filters.push({
          field,
          operator,
          value
        });

        options = {
          ...options,
          filters
        };

        return client;
      },

      order: (column: string, ascending?: boolean) => {
        options = {
          ...options,
          orderBy: {
            column,
            ascending
          } as OrderOptionsType // Use the type to prevent unused import warning
        };

        return client;
      },

      limit: (limit: number) => {
        options = {
          ...options,
          limit
        };

        return client;
      },

      offset: (offset: number) => {
        options = {
          ...options,
          offset
        };

        return client;
      }
    };

    return client;
  }

  /**
   * Creates a vector client
   *
   * @returns Vector client
   */
  function createVectorClient(): VectorClient {
    return {
      search: async (query, options) => {
        return vectorSearch(query, options);
      },

      upsert: async (vectors, options) => {
        const vectorsWithSparse = vectors.map(v => ({
          ...v,
          sparseVector: {
            indices: Array.from(v.vector.keys()),
            values: v.vector
          }
        }));
        return upsertSupabaseVectors(vectorsWithSparse, options);
      }    };
  }

  return {
    from: createTableClient,
    vector: createVectorClient()
  };
}

export default createSupabaseClient;
