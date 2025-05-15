/**
 * Upstash Supabase Adapter
 *
 * This module provides a compatibility layer to use Upstash Redis and Vector
 * as a replacement for Supabase. It implements similar interfaces and functionality
 * to make the transition seamless.
 *
 * @module upstash-supabase-adapter
 */

import {
  getRedisClient,
  getVectorClient
} from './upstashClients';
import {
  VectorDocument,
  VectorMetadata,
  VectorQueryOptions,
  VectorDocumentSchema,
  VectorStoreError
} from './upstashTypes';
import { upstashLogger } from './upstash-logger';
import { z } from 'zod';
import { generateEmbedding } from '../../ai-integration';

// --- Helper Functions ---

/**
 * Generates a Redis key for a table
 *
 * @param tableName - Table name
 * @returns Redis key for the table
 */
function getTableKey(tableName: string): string {
  return `table:${tableName}`;
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
 * Generates embeddings for text using AI integration
 * 
 * @param text - Text to generate embeddings for
 * @returns Promise resolving to embeddings array
 */
async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const embedding = await generateEmbedding(text);
    // generateEmbedding returns Float32Array or number[]
    return Array.isArray(embedding) ? embedding : Array.from(embedding);
  } catch (error) {
    upstashLogger.error('supabase-adapter', 'Error generating embeddings', error instanceof Error ? error : { message: String(error) });
    throw new VectorStoreError('Failed to generate embeddings');
  }
}

/**
 * Applies filters to a list of items
 *
 * @param items - List of items
 * @param filters - Filter options
 * @returns Filtered list of items
 */
function applyFilters<T>(items: T[], filters?: Array<{ field: string; operator: string; value: unknown }>): T[] {
  if (!filters || filters.length === 0) return items;
  return items.filter(item => {
    return filters.every(filter => {
      const value = (item as Record<string, unknown>)[filter.field];
      switch (filter.operator) {
        case 'eq': return value === filter.value;
        case 'neq': return value !== filter.value;
        case 'gt': return typeof value === 'number' && typeof filter.value === 'number' && value > filter.value;
        case 'gte': return typeof value === 'number' && typeof filter.value === 'number' && value >= filter.value;
        case 'lt': return typeof value === 'number' && typeof filter.value === 'number' && value < filter.value;
        case 'lte': return typeof value === 'number' && typeof filter.value === 'number' && value <= filter.value;
        case 'like': return typeof value === 'string' && typeof filter.value === 'string' && value.includes(filter.value);
        case 'ilike': return typeof value === 'string' && typeof filter.value === 'string' && value.toLowerCase().includes(filter.value.toLowerCase());
        case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
        case 'is': return value === filter.value;
        default: return false;
      }
    });
  });
}

/**
 * Applies ordering to a list of items
 *
 * @param items - List of items
 * @param orderBy - Order options
 * @returns Ordered list of items
 */
function applyOrdering<T>(items: T[], orderBy?: { column: string; ascending?: boolean }): T[] {
  if (!orderBy) return items;
  const { column, ascending = true } = orderBy;
  return [...items].sort((a, b) => {
    const aValue = (a as Record<string, unknown>)[column];
    const bValue = (b as Record<string, unknown>)[column];
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return ascending ? 1 : -1;
    if (bValue === null || bValue === undefined) return ascending ? -1 : 1;
    if (ascending) return aValue > bValue ? 1 : -1;
    return aValue < bValue ? 1 : -1;
  });
}

/**
 * Applies pagination to a list of items
 *
 * @param items - List of items
 * @param limit - Limit of items
 * @param offset - Offset of items
 * @returns Paginated list of items
 */
function applyPagination<T>(items: T[], limit?: number, offset?: number): T[] {
  let result = items;
  if (offset !== undefined && offset > 0) result = result.slice(offset);
  if (limit !== undefined && limit > 0) result = result.slice(0, limit);
  return result;
}

/**
 * Selects specific fields from an item
 *
 * @param item - Item to select fields from
 * @param select - Fields to select
 * @returns Item with selected fields
 */
function selectFields<T extends object>(item: T, select?: string[]): Partial<T> {
  if (!select || select.length === 0) return item;
  const result: Partial<T> = {};
  for (const field of select) {
    if (field in item) {
      result[field as keyof T] = item[field as keyof T];
    }
  }
  return result;
}

// --- Types ---
export type TableRow = Record<string, unknown> & { id: string };
export type FilterOptions = { field: string; operator: string; value: unknown };
export type OrderOptions = { column: string; ascending?: boolean };
export type QueryOptions = {
  filters?: FilterOptions[];
  orderBy?: OrderOptions;
  limit?: number;
  offset?: number;
  select?: string[];
};

// --- CRUD Functions ---

/**
 * Gets an item by ID from a table (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function getItemById(tableName: string, id: string): Promise<TableRow | null> {
  try {
    const redis = getRedisClient();
    const row = await redis.hgetall(getRowKey(tableName, id));
    if (!row || Object.keys(row).length === 0) return null;
    const parsed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      try { parsed[k] = JSON.parse(v as string); } catch { parsed[k] = v; }
    }
    return { ...parsed, id };
  } catch (error) {
    upstashLogger.error('supabase-adapter', `Error getting item by id from table ${tableName}`, error instanceof Error ? error : { message: String(error) });
    // TODO: fallback to Supabase/LibSQL here
    return null;
  }
}

/**
 * Creates an item in a table (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function createItem(tableName: string, item: Omit<TableRow, 'id'> & { id?: string }): Promise<TableRow> {
  try {
    const redis = getRedisClient();
    const id = item.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    const rowKey = getRowKey(tableName, id);
    const toStore: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) {
      if (k !== 'id') toStore[k] = JSON.stringify(v);
    }
    await redis.hset(rowKey, toStore);
    await redis.sadd(`${getTableKey(tableName)}:ids`, id);
    return { ...item, id };
  } catch (error) {
    upstashLogger.error('supabase-adapter', `Error creating item in table ${tableName}`, error instanceof Error ? error : { message: String(error) });
    // TODO: fallback to Supabase/LibSQL here
    throw new VectorStoreError(`Failed to create item in table ${tableName}`);
  }
}

/**
 * Updates an item in a table (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function updateItem(tableName: string, id: string, updates: Partial<TableRow>): Promise<TableRow> {
  try {
    const redis = getRedisClient();
    const rowKey = getRowKey(tableName, id);
    const toStore: Record<string, string> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k !== 'id') toStore[k] = JSON.stringify(v);
    }
    await redis.hset(rowKey, toStore);
    const updated = await redis.hgetall(rowKey);
    if (!updated) throw new VectorStoreError('No data found after update');
    const parsed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updated)) {
      try { parsed[k] = JSON.parse(v as string); } catch { parsed[k] = v; }
    }
    return { ...parsed, id };
  } catch (error) {
    upstashLogger.error('supabase-adapter', `Error updating item in table ${tableName}`, error instanceof Error ? error : { message: String(error) });
    // TODO: fallback to Supabase/LibSQL here
    throw new VectorStoreError(`Failed to update item in table ${tableName}`);
  }
}

/**
 * Deletes an item from a table (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function deleteItem(tableName: string, id: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const rowKey = getRowKey(tableName, id);
    await redis.del(rowKey);
    await redis.srem(`${getTableKey(tableName)}:ids`, id);
    return true;
  } catch (error) {
    upstashLogger.error('supabase-adapter', `Error deleting item from table ${tableName}`, error instanceof Error ? error : { message: String(error) });
    // TODO: fallback to Supabase/LibSQL here
    return false;
  }
}

// --- Main API Functions ---

/**
 * Gets data from a table
 *
 * @param tableName - Table name
 * @param options - Query options
 * @returns Promise resolving to an array of table rows
 * @throws VectorStoreError if fetching fails
 */
export async function getData(
  tableName: string,
  options?: QueryOptions
): Promise<Array<TableRow>> {
  try {
    const redis = getRedisClient();
    const tableKey = getTableKey(tableName);
    const rowIds = await redis.smembers(`${tableKey}:ids`);
    if (!rowIds || rowIds.length === 0) return [];
    const pipeline = redis.pipeline();
    for (const id of rowIds) {
      pipeline.hgetall(getRowKey(tableName, id));
    }
    const rowsData = await pipeline.exec();
    let rows = rowsData
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && Object.keys(row).length > 0)
      .map(row => {
        const parsed: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          try {
            parsed[k] = JSON.parse(v as string);
          } catch {
            parsed[k] = v;
          }
        }
        return parsed;
      });
    if (options?.filters) rows = applyFilters(rows, options.filters);
    if (options?.orderBy) rows = applyOrdering(rows, options.orderBy);
    rows = applyPagination(rows, options?.limit, options?.offset);
    if (options?.select) rows = rows.map(row => selectFields(row, options.select));
    return rows.map(row => ({ ...row, id: row.id as string })) as Array<TableRow>;
  } catch (error) {
    upstashLogger.error('supabase-adapter', `Error getting data from table ${tableName}`, error instanceof Error ? error : { message: String(error) });
    throw new VectorStoreError(`Failed to get data from table ${tableName}`);
  }
}

/**
 * Performs a vector search using Upstash Vector
 *
 * @param query - Vector query
 * @param options - Search options
 * @returns Promise resolving to search results
 * @throws VectorStoreError if search fails
 */
export async function vectorSearch(
  query: number[] | string,
  options?: VectorQueryOptions
): Promise<unknown[]> {
  try {
    const vector = getVectorClient();
    const topK = options?.topK ?? 10;
    const includeMetadata = options?.includeMetadata ?? true;
    const includeVectors = options?.includeVectors ?? false;
    let filter: string | undefined = undefined;
    if (options?.filter && typeof options.filter === 'object') {
      filter = JSON.stringify(options.filter);
    } else if (typeof options?.filter === 'string') {
      filter = options.filter;
    }
    const searchQuery = Array.isArray(query) ? query : await generateEmbeddings(query);
    const result = await vector.query({
      vector: searchQuery,
      topK,
      includeMetadata,
      includeVectors,
      filter
    });
    return result;
  } catch (error: unknown) {
    upstashLogger.error('supabase-adapter', 'Error performing vector search', error instanceof Error ? error : { message: String(error) });
    throw new VectorStoreError('Failed to perform vector search');
  }
}

/**
 * Upserts vectors into Upstash Vector
 *
 * @param vectors - Vectors to upsert
 * @param options - Upsert options
 * @returns Promise resolving to upsert results
 * @throws VectorStoreError if upsert fails
 */
export async function upsertVectors(
  vectors: VectorDocument[],
  options?: { namespace?: string }
): Promise<unknown> {
  try {
    const vector = getVectorClient();
    const validatedVectors = z.array(VectorDocumentSchema).parse(vectors);
    const upserted = await vector.upsert(validatedVectors, options);
    return upserted;
  } catch (error: unknown) {
    upstashLogger.error('supabase-adapter', 'Error upserting vectors', error instanceof Error ? error : { message: String(error) });
    throw new VectorStoreError('Failed to upsert vectors');
  }
}

/**
 * Upserts vectors with sparse representation into Upstash Vector
 *
 * @param vectors - Vectors to upsert
 * @param options - Upsert options
 * @returns Promise resolving to upsert results
 * @throws VectorStoreError if upsert fails
 */
export async function upsertSupabaseVectors(
  vectors: Array<{ id: string; vector: number[]; metadata?: VectorMetadata }>,
  options?: { namespace?: string }
): Promise<unknown> {
  try {
    const vector = getVectorClient();
    const vectorsWithSparse = vectors.map(v => ({
      ...v,
      sparseVector: {
        indices: Array.from(v.vector.keys()),
        values: v.vector
      }
    }));
    const validatedVectors = z.array(VectorDocumentSchema).parse(vectorsWithSparse);
    const upserted = await vector.upsert(validatedVectors, options);
    return upserted;
  } catch (error: unknown) {
    upstashLogger.error('supabase-adapter', 'Error upserting supabase vectors', error instanceof Error ? error : { message: String(error) });
    throw new VectorStoreError('Failed to upsert supabase vectors');
  }
}

/**
 * Generates embeddings and upserts text to vector store
 * 
 * @param texts - Array of text items with IDs and optional metadata
 * @param options - Upsert options
 * @returns Promise resolving to upsert results
 * @throws VectorStoreError if operation fails
 */
export async function upsertTexts(
  texts: Array<{ id: string; text: string; metadata?: VectorMetadata }>,
  options?: { namespace?: string }
): Promise<unknown> {
  try {
    const vector = getVectorClient();
    const vectors: VectorDocument[] = await Promise.all(
      texts.map(async ({ id, text, metadata }) => ({
        id,
        vector: await generateEmbeddings(text),
        metadata,
        data: text
      }))
    );
    const validatedVectors = z.array(VectorDocumentSchema).parse(vectors);
    const upserted = await vector.upsert(validatedVectors, options);
    return upserted;
  } catch (error: unknown) {
    upstashLogger.error('supabase-adapter', 'Error upserting texts', error instanceof Error ? error : { message: String(error) });
    throw new VectorStoreError('Failed to upsert texts');
  }
}

/**
 * Performs a semantic search using text query
 * 
 * @param text - Text query
 * @param options - Search options
 * @returns Promise resolving to search results
 * @throws VectorStoreError if search fails
 */
export async function semanticSearch(
  text: string,
  options?: VectorQueryOptions
): Promise<unknown[]> {
  try {
    const embedding = await generateEmbeddings(text);
    return vectorSearch(embedding, options);
  } catch (error: unknown) {
    upstashLogger.error('supabase-adapter', 'Error performing semantic search', error instanceof Error ? error : { message: String(error) });
    throw new VectorStoreError('Failed to perform semantic search');
  }
}
