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
import {
  VectorDocument,
  VectorMetadata,
  VectorQueryOptions,
  VectorStoreError,
} from './upstashTypes';
import { upstashLogger } from './upstash-logger';
import { generateEmbedding } from '../../ai-integration';
import {
  createRedisEntity,
  getRedisEntityById,
  updateRedisEntity,
  deleteRedisEntity,
  listRedisEntities,
  batchGetThreads,
  searchThreadsByMetadata,
  ListEntitiesOptions,
} from './redis-store';
import {
  Thread,
  Message,
  AgentState,
  ToolExecutionEntity,
  WorkflowNode,
  LogEntry,
} from './upstashTypes';
import type { Database } from '@/types/supabase';

export type TableName = keyof Database['public']['Tables'];
export type TableRow<T extends TableName = TableName> =
  Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends TableName = TableName> =
  Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends TableName = TableName> =
  Database['public']['Tables'][T]['Update'];

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
    upstashLogger.error(
      'supabase-adapter',
      'Error generating embeddings',
      error instanceof Error ? error : { message: String(error) }
    );
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
function applyFilters<T>(
  items: T[],
  filters?: Array<{ field: string; operator: string; value: unknown }>
): T[] {
  if (!filters || filters.length === 0) return items;
  return items.filter((item) => {
    return filters.every((filter) => {
      const value = (item as Record<string, unknown>)[filter.field];
      switch (filter.operator) {
        case 'eq':
          return value === filter.value;
        case 'neq':
          return value !== filter.value;
        case 'gt':
          return (
            typeof value === 'number' &&
            typeof filter.value === 'number' &&
            value > filter.value
          );
        case 'gte':
          return (
            typeof value === 'number' &&
            typeof filter.value === 'number' &&
            value >= filter.value
          );
        case 'lt':
          return (
            typeof value === 'number' &&
            typeof filter.value === 'number' &&
            value < filter.value
          );
        case 'lte':
          return (
            typeof value === 'number' &&
            typeof filter.value === 'number' &&
            value <= filter.value
          );
        case 'like':
          return (
            typeof value === 'string' &&
            typeof filter.value === 'string' &&
            value.includes(filter.value)
          );
        case 'ilike':
          return (
            typeof value === 'string' &&
            typeof filter.value === 'string' &&
            value.toLowerCase().includes(filter.value.toLowerCase())
          );
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(value);
        case 'is':
          return value === filter.value;
        default:
          return false;
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
function applyOrdering<T>(
  items: T[],
  orderBy?: { column: string; ascending?: boolean }
): T[] {
  if (!orderBy) return items;
  const { column, ascending = true } = orderBy;
  return [...items].sort((a, b) => {
    const aValue = (a as Record<string, unknown>)[column];
    const bValue = (b as Record<string, unknown>)[column];
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return ascending ? 1 : -1;
    if (bValue === null || bValue === undefined) return ascending ? -1 : 1;
    if (ascending) return aValue > bValue ? 1 : -1;
    return aValue < bValue ? -1 : 1;
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
function selectFields<T extends object>(
  item: T,
  select?: string[]
): Partial<T> {
  if (!select || select.length === 0) return item;
  const result: Partial<T> = {};
  for (const field of select) {
    if (field in item) {
      result[field as keyof T] = item[field as keyof T];
    }
  }
  return result;
}

// --- Primary Key Helper ---
/**
 * Returns the primary key field(s) for a given table/entity name.
 * For most entities, this is 'id', but for some (e.g. agent_tools, settings) it is a composite key.
 * Returns an array of key field names (for composite keys) or a single string for simple keys.
 */
export function getPrimaryKeyForTable(tableName: string): string | string[] {
  switch (tableName) {
    case 'agent_tools':
      return ['agent_id', 'tool_id'];
    case 'settings':
      return ['user_id', 'key'];
    default:
      return 'id';
  }
}

// --- Helper to extract primary key value(s) from an item ---
/**
 * Given a table name and an item, returns the primary key value(s) for that item.
 * For composite keys, returns an array of values in the correct order.
 * For single key, returns the value directly.
 */
export function getPrimaryKeyValue(
  tableName: string,
  item: unknown
): string | string[] {
  const key = getPrimaryKeyForTable(tableName);
  if (Array.isArray(key)) {
    return key.map((k) => (item as Record<string, string>)[k]);
  }
  return (item as Record<string, string>)[key];
}

// --- Types ---
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
export async function getItemById<T extends TableName>(
  tableName: T,
  id: string | string[]
): Promise<TableRow<T> | null> {
  try {
    const redis = getRedisClient();
    const rowKey = getRowKey(tableName, Array.isArray(id) ? id.join(':') : id);
    const row = await redis.hgetall(rowKey);
    if (!row || Object.keys(row).length === 0) return null;
    const parsed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      try {
        parsed[k] = JSON.parse(v as string);
      } catch {
        parsed[k] = v;
      }
    }
    return { ...parsed, id } as TableRow<T>;
  } catch (error) {
    await upstashLogger.error(
      'supabase-adapter',
      `Error getting item by id from table ${String(tableName)}`,
      error instanceof Error ? error : { message: String(error) }
    );
    return null;
  }
}

/**
 * Creates an item in a table (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function createItem<T extends TableName>(
  tableName: T,
  item: TableInsert<T>
): Promise<TableRow<T>> {
  try {
    const redis = getRedisClient();
    const keyValue = getPrimaryKeyValue(tableName, item);
    let id: string;
    if (Array.isArray(keyValue)) {
      id = keyValue.join(':');
    } else {
      id = keyValue;
    }
    const rowKey = getRowKey(tableName, id);
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) {
      row[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    await redis.hset(rowKey, row);
    await redis.sadd(`${getTableKey(tableName)}:ids`, id);
    return { ...item, id } as TableRow<T>;
  } catch (error) {
    await upstashLogger.error(
      'supabase-adapter',
      `Error creating item in table ${String(tableName)}`,
      error instanceof Error ? error : { message: String(error) }
    );
    throw error;
  }
}

/**
 * Updates an item in a table (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function updateItem<T extends TableName>(
  tableName: T,
  id: string | string[],
  updates: TableUpdate<T>
): Promise<TableRow<T>> {
  try {
    const redis = getRedisClient();
    const keyValue = Array.isArray(id) ? id.join(':') : id;
    const rowKey = getRowKey(tableName, keyValue);
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(updates)) {
      row[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    await redis.hset(rowKey, row);
    const updated = await redis.hgetall(rowKey);
    if (!updated || Object.keys(updated).length === 0)
      throw new Error('Update failed');
    const parsed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updated)) {
      try {
        parsed[k] = JSON.parse(v as string);
      } catch {
        parsed[k] = v;
      }
    }
    return { ...parsed, id: keyValue } as TableRow<T>;
  } catch (error) {
    await upstashLogger.error(
      'supabase-adapter',
      `Error updating item in table ${String(tableName)}`,
      error instanceof Error ? error : { message: String(error) }
    );
    throw error;
  }
}

/**
 * Deletes an item from a table (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function deleteItem<T extends TableName>(
  tableName: T,
  id: string | string[]
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const keyValue = Array.isArray(id) ? id.join(':') : id;
    const rowKey = getRowKey(tableName, keyValue);
    await redis.del(rowKey);
    await redis.srem(`${getTableKey(tableName)}:ids`, keyValue);
    return true;
  } catch (error) {
    await upstashLogger.error(
      'supabase-adapter',
      `Error deleting item in table ${String(tableName)}`,
      error instanceof Error ? error : { message: String(error) }
    );
    return false;
  }
}

/**
 * Gets data from a table (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function getData<T extends TableName>(
  tableName: T,
  options?: QueryOptions
): Promise<Array<TableRow<T>>> {
  try {
    const redis = getRedisClient();
    const ids = await redis.smembers(`${getTableKey(tableName)}:ids`);
    if (!ids || ids.length === 0) return [];
    const pipeline = redis.pipeline();
    for (const id of ids) {
      pipeline.hgetall(getRowKey(tableName, id));
    }
    const results = await pipeline.exec();
    const rows = (results as Array<Record<string, unknown> | null>)
      .map((data, i) => {
        if (!data) return null;
        const parsed: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          try {
            parsed[k] = JSON.parse(v as string);
          } catch {
            parsed[k] = v;
          }
        }
        return { ...parsed, id: ids[i] } as TableRow<T>;
      })
      .filter(Boolean) as TableRow<T>[];
    let filtered = rows;
    if (options?.filters) filtered = applyFilters(filtered, options.filters);
    if (options?.orderBy) filtered = applyOrdering(filtered, options.orderBy);
    filtered = applyPagination(filtered, options?.limit, options?.offset);
    if (options?.select)
      filtered = filtered.map(
        (e) => selectFields(e, options.select) as TableRow<T>
      );
    return filtered;
  } catch (error) {
    await upstashLogger.error(
      'supabase-adapter',
      `Error getting data from table ${String(tableName)}`,
      error instanceof Error ? error : { message: String(error) }
    );
    return [];
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
    const searchQuery = Array.isArray(query)
      ? query
      : await generateEmbeddings(query);
    const result = await vector.query({
      vector: searchQuery,
      topK,
      includeMetadata,
      includeVectors,
      filter,
    });
    return result;
  } catch (error: unknown) {
    await upstashLogger.error(
      'supabase-adapter',
      'Error performing vector search',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new Error('Vector search failed');
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
    return await vector.upsert(vectors, options);
  } catch (error: unknown) {
    await upstashLogger.error(
      'supabase-adapter',
      'Error upserting vectors',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new Error('Upsert vectors failed');
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
    return await vector.upsert(vectors, options);
  } catch (error: unknown) {
    await upstashLogger.error(
      'supabase-adapter',
      'Error upserting supabase vectors',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new Error('Upsert supabase vectors failed');
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
    const vectors = await Promise.all(
      texts.map(async ({ id, text, metadata }) => ({
        id,
        vector: await generateEmbeddings(text),
        metadata,
      }))
    );
    return await upsertSupabaseVectors(vectors, options);
  } catch (error: unknown) {
    await upstashLogger.error(
      'supabase-adapter',
      'Error upserting texts',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new Error('Upsert texts failed');
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
    return await vectorSearch(embedding, options);
  } catch (error: unknown) {
    await upstashLogger.error(
      'supabase-adapter',
      'Error performing semantic search',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new Error('Semantic search failed');
  }
}

// --- Enhanced Generic Entity CRUD API ---
export const entityApi = {
  create: createRedisEntity,
  getById: getRedisEntityById,
  update: updateRedisEntity,
  delete: deleteRedisEntity,
  list: listRedisEntities,
  batchGetThreads,
  searchThreadsByMetadata,
  upsertTexts,
  semanticSearch,
};

// --- Enhanced Table CRUD helpers ---
export async function upsertItem<T extends TableName>(
  tableName: T,
  item: TableRow<T>
): Promise<TableRow<T>> {
  const key = getPrimaryKeyForTable(tableName);
  const id = Array.isArray(key)
    ? key.map((k) => (item as Record<string, string>)[k])
    : (item as Record<string, string>)[key];
  const found = await getItemById(tableName, id);
  if (found) {
    return updateItem(tableName, id, item as TableUpdate<T>);
  }
  return createItem(tableName, item as TableInsert<T>);
}

export async function existsItem<T extends TableName>(
  tableName: T,
  id: string
): Promise<boolean> {
  const found = await getItemById(tableName, id);
  return !!found;
}

export async function countItems<T extends TableName>(
  tableName: T,
  options?: QueryOptions
): Promise<number> {
  const all = await getData(tableName, options);
  return all.length;
}

export async function batchGetItems<T extends TableName>(
  tableName: T,
  ids: string[]
): Promise<(TableRow<T> | null)[]> {
  return Promise.all(
    ids.map((id) => getItemById(tableName, id) as Promise<TableRow<T> | null>)
  );
}

// --- Export all types for downstream use ---
export type {
  ListEntitiesOptions,
  Thread,
  Message,
  AgentState,
  ToolExecutionEntity,
  WorkflowNode,
  LogEntry,
  VectorDocument,
  VectorMetadata,
  VectorQueryOptions,
};

export { applyFilters, applyOrdering, applyPagination, selectFields };
