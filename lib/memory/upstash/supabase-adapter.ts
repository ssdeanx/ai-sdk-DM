/**
 * Upstash Supabase Adapter
 *
 * This module provides a compatibility layer to use Upstash Redis and Vector
 * as a replacement for Supabase. It implements similar interfaces and functionality
 * to make the transition seamless.
 *
 * @module upstash-supabase-adapter
 */

import { getRedisClient, getVectorClient } from './upstashClients';
import { Redis } from '@upstash/redis';
import { Index } from '@upstash/vector';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { generateEmbedding } from '../../ai-integration';

// --- Zod Schemas ---

/**
 * Schema for vector data
 */
export const VectorDataSchema = z.object({
  id: z.string(),
  vector: z.array(z.number()),
  metadata: z.record(z.any()).optional(),
  sparseVector: z.object({
    indices: z.array(z.number()),
    values: z.array(z.number())
  }).optional(),
  data: z.string().optional()
});

/**
 * Schema for vector search options
 */
export const VectorSearchOptionsSchema = z.object({
  topK: z.number().positive().optional().default(10),
  filter: z.union([z.record(z.any()), z.string()]).optional(),
  includeMetadata: z.boolean().optional().default(true),
  includeVectors: z.boolean().optional().default(false),
  namespace: z.string().optional()
});

// --- Error Handling ---

/**
 * Error class for Upstash Supabase adapter operations
 */
export class UpstashAdapterError extends Error {
  /**
   * Creates a new UpstashAdapterError
   *
   * @param message - Error message
   * @param cause - Optional cause of the error
   */
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "UpstashAdapterError";
    Object.setPrototypeOf(this, UpstashAdapterError.prototype);
  }
}

// --- Redis Key Prefixes ---

const TABLE_PREFIX = 'table:';
const INDEX_PREFIX = 'index:';
const RELATION_PREFIX = 'relation:';

// --- Type Definitions ---

/**
 * Generic table row type
 */
export type TableRow<T extends string> = Record<string, any>;

/**
 * Filter options for querying data
 */
export interface FilterOptions {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: any;
}

/**
 * Order options for sorting data
 */
export interface OrderOptions {
  column: string;
  ascending?: boolean;
}

/**
 * Query options for fetching data
 */
export interface QueryOptions {
  select?: string[];
  filters?: FilterOptions[];
  limit?: number;
  offset?: number;
  orderBy?: OrderOptions;
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  topK?: number;
  filter?: Record<string, any> | string;
  includeMetadata?: boolean;
  includeVectors?: boolean;
  namespace?: string;
}

/**
 * Vector data for upserting
 */
export interface VectorData {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
  sparseVector?: { indices: number[]; values: number[] };
  data?: string;
}

// --- Helper Functions ---

/**
 * Generates a Redis key for a table
 *
 * @param tableName - Table name
 * @returns Redis key for the table
 */
function getTableKey(tableName: string): string {
  return `${TABLE_PREFIX}${tableName}`;
}

/**
 * Generates a Redis key for a table row
 *
 * @param tableName - Table name
 * @param id - Row ID
 * @returns Redis key for the table row
 */
function getRowKey(tableName: string, id: string): string {
  return `${getTableKey(tableName)}:${id}`;
}

/**
 * Generates a Redis key for a table index
 *
 * @param tableName - Table name
 * @param indexName - Index name
 * @returns Redis key for the table index
 */
function getIndexKey(tableName: string, indexName: string): string {
  return `${INDEX_PREFIX}${tableName}:${indexName}`;
}

/**
 * Applies filters to a list of items
 *
 * @param items - Items to filter
 * @param filters - Filters to apply
 * @returns Filtered items
 */
function applyFilters<T>(items: T[], filters?: FilterOptions[]): T[] {
  if (!filters || filters.length === 0) {
    return items;
  }

  return items.filter(item => {
    return filters.every(filter => {
      const { field, operator, value } = filter;
      const itemValue = (item as any)[field];

      switch (operator) {
        case 'eq':
          return itemValue === value;
        case 'neq':
          return itemValue !== value;
        case 'gt':
          return itemValue > value;
        case 'gte':
          return itemValue >= value;
        case 'lt':
          return itemValue < value;
        case 'lte':
          return itemValue <= value;
        case 'like':
          return typeof itemValue === 'string' && typeof value === 'string' &&
                 itemValue.includes(value);
        case 'ilike':
          return typeof itemValue === 'string' && typeof value === 'string' &&
                 itemValue.toLowerCase().includes(value.toLowerCase());
        case 'in':
          return Array.isArray(value) && value.includes(itemValue);
        case 'is':
          if (value === null) {
            return itemValue === null;
          }
          return itemValue === value;
        default:
          return true;
      }
    });
  });
}

/**
 * Applies ordering to a list of items
 *
 * @param items - Items to order
 * @param orderBy - Order options
 * @returns Ordered items
 */
function applyOrdering<T>(items: T[], orderBy?: OrderOptions): T[] {
  if (!orderBy) {
    return items;
  }

  const { column, ascending = true } = orderBy;

  return [...items].sort((a, b) => {
    const aValue = (a as any)[column];
    const bValue = (b as any)[column];

    if (aValue === bValue) {
      return 0;
    }

    if (aValue === null || aValue === undefined) {
      return ascending ? -1 : 1;
    }

    if (bValue === null || bValue === undefined) {
      return ascending ? 1 : -1;
    }

    if (ascending) {
      return aValue < bValue ? -1 : 1;
    } else {
      return aValue > bValue ? -1 : 1;
    }
  });
}

/**
 * Applies pagination to a list of items
 *
 * @param items - Items to paginate
 * @param limit - Maximum number of items to return
 * @param offset - Number of items to skip
 * @returns Paginated items
 */
function applyPagination<T>(items: T[], limit?: number, offset?: number): T[] {
  let result = items;

  if (offset !== undefined && offset > 0) {
    result = result.slice(offset);
  }

  if (limit !== undefined && limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

/**
 * Selects specific fields from an item
 *
 * @param item - Item to select fields from
 * @param select - Fields to select
 * @returns Item with only selected fields
 */
function selectFields<T extends object>(item: T, select?: string[]): Partial<T> {
  if (!select || select.length === 0) {
    return item;
  }

  const result: Partial<T> = {};

  for (const field of select) {
    if (field in item) {
      (result as any)[field] = (item as any)[field];
    }
  }

  return result;
}

/**
 * Generates embeddings for text using AI integration
 * 
 * @param text - Text to generate embeddings for
 * @returns Promise resolving to embeddings array
 */
async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const embedding = await generateEmbedding(text);
    
    // Handle different possible return types
    if (embedding instanceof Float32Array) {
      return Array.from(embedding);
    } else if (Array.isArray(embedding)) {
      return embedding;
    } else {
      return Array.isArray(embedding.data) ? embedding.data : Array.from(embedding.data);
    }
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new UpstashAdapterError('Failed to generate embeddings', error);
  }
}

// --- Main API Functions ---

/**
 * Gets data from a table
 *
 * @param tableName - Table name
 * @param options - Query options
 * @returns Promise resolving to an array of table rows
 * @throws UpstashAdapterError if fetching fails
 */
export async function getData<T extends string>(
  tableName: T,
  options?: QueryOptions
): Promise<Array<TableRow<T>>> {
  try {
    const redis = getRedisClient();
    const tableKey = getTableKey(tableName);

    // Get all row IDs for the table
    const rowIds = await redis.smembers(`${tableKey}:ids`);

    if (!rowIds || rowIds.length === 0) {
      return [];
    }

    // Get all rows
    const pipeline = redis.pipeline();
    for (const id of rowIds) {
      pipeline.hgetall(getRowKey(tableName, id));
    }

    const rowsData = await pipeline.exec();

    // Parse rows and apply filters, ordering, and pagination
    let rows = rowsData
      .filter((row): row is Record<string, any> => row !== null && row !== undefined && Object.keys(row).length > 0)
      .map(row => {
        // Parse JSON fields
        const parsedRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
              parsedRow[key] = JSON.parse(value);
            } catch (e) {
              parsedRow[key] = value;
            }
          } else {
            parsedRow[key] = value;
          }
        }
        return parsedRow;
      });

    // Apply filters
    if (options?.filters) {
      rows = applyFilters(rows, options.filters);
    }

    // Apply ordering
    if (options?.orderBy) {
      rows = applyOrdering(rows, options.orderBy);
    }

    // Apply pagination
    rows = applyPagination(rows, options?.limit, options?.offset);

    // Select fields
    if (options?.select) {
      rows = rows.map(row => selectFields(row, options.select));
    }

    return rows as Array<TableRow<T>>;
  } catch (error) {
    console.error(`Error getting data from table ${tableName}:`, error);
    throw new UpstashAdapterError(`Failed to get data from table ${tableName}`, error);
  }
}

/**
 * Gets an item by ID from a table
 *
 * @param tableName - Table name
 * @param id - Item ID
 * @returns Promise resolving to the item or null if not found
 * @throws UpstashAdapterError if fetching fails
 */
export async function getItemById<T extends string>(
  tableName: T,
  id: string
): Promise<TableRow<T> | null> {
  try {
    const redis = getRedisClient();
    const rowKey = getRowKey(tableName, id);

    const row = await redis.hgetall(rowKey);

    if (!row || Object.keys(row).length === 0) {
      return null;
    }

    // Parse JSON fields
    const parsedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          parsedRow[key] = JSON.parse(value);
        } catch (e) {
          parsedRow[key] = value;
        }
      } else {
        parsedRow[key] = value;
      }
    }

    return parsedRow as TableRow<T>;
  } catch (error) {
    console.error(`Error getting item ${id} from table ${tableName}:`, error);
    throw new UpstashAdapterError(`Failed to get item ${id} from table ${tableName}`, error);
  }
}

/**
 * Creates an item in a table
 *
 * @param tableName - Table name
 * @param item - Item to create
 * @returns Promise resolving to the created item
 * @throws UpstashAdapterError if creation fails
 */
export async function createItem<T extends string>(
  tableName: T,
  item: Omit<TableRow<T>, 'id'> & { id?: string }
): Promise<TableRow<T>> {
  try {
    const redis = getRedisClient();
    const tableKey = getTableKey(tableName);

    // Generate ID if not provided
    const id = item.id || uuidv4();
    const rowKey = getRowKey(tableName, id);

    // Prepare item for Redis (stringify objects)
    const itemForRedis: Record<string, string> = {
      id,
    };

    for (const [key, value] of Object.entries(item)) {
      if (key === 'id') continue; // Skip ID as we already handled it

      if (value === null || value === undefined) {
        itemForRedis[key] = '';
      } else if (typeof value === 'object') {
        itemForRedis[key] = JSON.stringify(value);
      } else {
        itemForRedis[key] = String(value);
      }
    }

    // Add timestamps if not provided
    const now = new Date().toISOString();
    if (!itemForRedis.created_at) {
      itemForRedis.created_at = now;
    }
    if (!itemForRedis.updated_at) {
      itemForRedis.updated_at = now;
    }

    // Save item and update table index
    const pipeline = redis.pipeline();
    pipeline.hset(rowKey, itemForRedis);
    pipeline.sadd(`${tableKey}:ids`, id);

    // Add to indexes if any
    for (const [key, value] of Object.entries(itemForRedis)) {
      if (key === 'id') continue;

      // Add to index
      pipeline.sadd(getIndexKey(tableName, key), `${value}:${id}`);
    }

    await pipeline.exec();

    // Return the created item
    return {
      ...item,
      id,
    } as TableRow<T>;
  } catch (error) {
    console.error(`Error creating item in table ${tableName}:`, error);
    throw new UpstashAdapterError(`Failed to create item in table ${tableName}`, error);
  }
}

/**
 * Updates an item in a table
 *
 * @param tableName - Table name
 * @param id - Item ID
 * @param updates - Updates to apply
 * @returns Promise resolving to the updated item
 * @throws UpstashAdapterError if update fails
 */
export async function updateItem<T extends string>(
  tableName: T,
  id: string,
  updates: Partial<TableRow<T>>
): Promise<TableRow<T>> {
  try {
    const redis = getRedisClient();
    const rowKey = getRowKey(tableName, id);

    // Get existing item
    const existingItem = await getItemById(tableName, id);

    if (!existingItem) {
      throw new UpstashAdapterError(`Item ${id} not found in table ${tableName}`);
    }

    // Prepare updates for Redis (stringify objects)
    const updatesForRedis: Record<string, string> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue; // Skip ID as we can't update it

      if (value === null || value === undefined) {
        updatesForRedis[key] = '';
      } else if (typeof value === 'object') {
        updatesForRedis[key] = JSON.stringify(value);
      } else {
        updatesForRedis[key] = String(value);
      }
    }

    // Add updated_at timestamp
    updatesForRedis.updated_at = new Date().toISOString();

    // Update item
    await redis.hset(rowKey, updatesForRedis);

    // Return the updated item
    return {
      ...existingItem,
      ...updates,
      updated_at: updatesForRedis.updated_at,
    } as TableRow<T>;
  } catch (error) {
    console.error(`Error updating item ${id} in table ${tableName}:`, error);
    throw new UpstashAdapterError(`Failed to update item ${id} in table ${tableName}`, error);
  }
}

/**
 * Deletes an item from a table
 *
 * @param tableName - Table name
 * @param id - Item ID
 * @returns Promise resolving to true if successful
 * @throws UpstashAdapterError if deletion fails
 */
export async function deleteItem<T extends string>(
  tableName: T,
  id: string
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const tableKey = getTableKey(tableName);
    const rowKey = getRowKey(tableName, id);

    // Get existing item to remove from indexes
    const existingItem = await getItemById(tableName, id);

    if (!existingItem) {
      return false; // Item not found
    }

    // Delete item and update table index
    const pipeline = redis.pipeline();
    pipeline.del(rowKey);
    pipeline.srem(`${tableKey}:ids`, id);

    // Remove from indexes
    for (const [key, value] of Object.entries(existingItem)) {
      if (key === 'id') continue;

      const indexValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      pipeline.srem(getIndexKey(tableName, key), `${indexValue}:${id}`);
    }

    await pipeline.exec();

    return true;
  } catch (error) {
    console.error(`Error deleting item ${id} from table ${tableName}:`, error);
    throw new UpstashAdapterError(`Failed to delete item ${id} from table ${tableName}`, error);
  }
}

/**
 * Performs a vector search using Upstash Vector
 *
 * @param query - Vector query
 * @param options - Search options
 * @returns Promise resolving to search results
 * @throws UpstashAdapterError if search fails
 */
export async function vectorSearch(
  query: number[] | string,
  options?: VectorSearchOptions
): Promise<any[]> {
  try {
    const vector = getVectorClient();

    if (!vector) {
      throw new UpstashAdapterError('Vector client not available');
    }

    // If query is a string, generate embeddings for it
    const queryVector = typeof query === 'string' 
      ? await generateEmbeddings(query) 
      : query;

    // Parse options using Zod schema
    const validatedOptions = VectorSearchOptionsSchema.parse(options || {});

    // Convert filter to string if it's an object
    const filterStr = typeof validatedOptions.filter === 'object' && validatedOptions.filter !== null
      ? JSON.stringify(validatedOptions.filter)
      : validatedOptions.filter as string | undefined;

    const results = await vector.query({
      vector: queryVector,
      topK: validatedOptions.topK,
      ...(filterStr ? { filter: filterStr } : {}),
      includeMetadata: validatedOptions.includeMetadata,
      includeVectors: validatedOptions.includeVectors,
      ...(validatedOptions.namespace ? { namespace: validatedOptions.namespace } : {})
    });

    return results;
  } catch (error) {
    console.error('Error performing vector search:', error);
    throw new UpstashAdapterError('Failed to perform vector search', error);
  }
}

/**
 * Upserts vectors into Upstash Vector
 *
 * @param vectors - Vectors to upsert
 * @param options - Upsert options
 * @returns Promise resolving to upsert results
 * @throws UpstashAdapterError if upsert fails
 */
export async function upsertVectors(
  vectors: VectorData[],
  options?: {
    namespace?: string;
  }
): Promise<any> {
  try {
    const vector = getVectorClient();

    if (!vector) {
      throw new UpstashAdapterError('Vector client not available');
    }

    // Validate vectors using Zod schema
    const validatedVectors = vectors.map(v => VectorDataSchema.parse(v));

    const result = await vector.upsert(validatedVectors, {
      ...(options?.namespace ? { namespace: options.namespace } : {})
    });

    return result;
  } catch (error) {
    console.error('Error upserting vectors:', error);
    throw new UpstashAdapterError('Failed to upsert vectors', error);
  }
}

/**
 * Upserts vectors into Upstash Vector (legacy Supabase compatibility)
 * 
 * @param vectors - Vectors to upsert in Supabase format
 * @param options - Upsert options
 * @returns Promise resolving to upsert results
 * @throws UpstashAdapterError if upsert fails
 */
export async function upsertSupabaseVectors(
  vectors: Array<{
    id: string;
    vector: number[];
    metadata?: Record<string, any>;
  }>,
  options?: {
    namespace?: string;
  }
): Promise<any> {
  try {
    // Convert Supabase format to our VectorData format
    const vectorData: VectorData[] = vectors.map(v => ({
      id: v.id,
      vector: v.vector,
      metadata: v.metadata
    }));
    
    // Use the main upsertVectors function
    return await upsertVectors(vectorData, options);
  } catch (error) {
    console.error('Error upserting Supabase vectors:', error);
    throw new UpstashAdapterError('Failed to upsert Supabase vectors', error);
  }
}

/**
 * Generates embeddings and upserts text to vector store
 * 
 * @param texts - Array of text items with IDs and optional metadata
 * @param options - Upsert options
 * @returns Promise resolving to upsert results
 * @throws UpstashAdapterError if operation fails
 */
export async function upsertTexts(
  texts: Array<{
    id: string;
    text: string;
    metadata?: Record<string, any>;
  }>,
  options?: {
    namespace?: string;
  }
): Promise<any> {
  try {
    // Generate embeddings for each text
    const vectors: VectorData[] = await Promise.all(
      texts.map(async ({ id, text, metadata }) => {
        const vector = await generateEmbeddings(text);
        return {
          id,
          vector,
          metadata: {
            ...metadata,
            text // Include the original text in metadata
          }
        };
      })
    );
    
    // Upsert the vectors
    return await upsertVectors(vectors, options);
  } catch (error) {
    console.error('Error upserting texts:', error);
    throw new UpstashAdapterError('Failed to upsert texts', error);
  }
}

/**
 * Performs a semantic search using text query
 * 
 * @param text - Text query
 * @param options - Search options
 * @returns Promise resolving to search results
 * @throws UpstashAdapterError if search fails
 */
export async function semanticSearch(
  text: string,
  options?: VectorSearchOptions
): Promise<any[]> {
  try {
    // Generate embeddings for the text query
    const embeddings = await generateEmbeddings(text);
    
    // Perform vector search with the embeddings
    return await vectorSearch(embeddings, options);
  } catch (error) {
    console.error('Error performing semantic search:', error);
    throw new UpstashAdapterError('Failed to perform semantic search', error);
  }
}
