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
  QueryOptions
} from './index';
import {
  entityApi,
  upsertItem,
  existsItem,
  countItems,
  batchGetItems,
  VectorMetadata,
  VectorQueryOptions
} from './supabase-adapter';

// --- Enhanced Type-Safe TableClient ---
export interface TableClient<T extends TableRow = TableRow> {
  getAll(options?: QueryOptions): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(item: Omit<T, 'id'> & { id?: string }): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  upsert(item: T): Promise<T>;
  exists(id: string): Promise<boolean>;
  count(options?: QueryOptions): Promise<number>;
  batchGet(ids: string[]): Promise<(T | null)[]>;
  select(...columns: (keyof T)[]): TableClient<T>;
  filter(field: keyof T, operator: FilterOptions['operator'], value: unknown): TableClient<T>;
  order(column: keyof T, ascending?: boolean): TableClient<T>;
  limit(limit: number): TableClient<T>;
  offset(offset: number): TableClient<T>;
}

export interface VectorClient {
  search(
    query: number[] | string,
    options?: VectorQueryOptions
  ): Promise<Array<Record<string, unknown>>>;
  upsert(
    vectors: Array<{
      id: string;
      vector: number[];
      metadata?: Record<string, unknown>;
    }>,
    options?: { namespace?: string }
  ): Promise<Record<string, unknown>>;
  upsertTexts(
    texts: Array<{ id: string; text: string; metadata?: VectorMetadata }>,
    options?: { namespace?: string }
  ): Promise<unknown>;
  semanticSearch(
    text: string,
    options?: VectorQueryOptions
  ): Promise<unknown[]>;
}

export interface SupabaseClient {
  from<T extends TableRow = TableRow>(tableName: string): TableClient<T>;
  vector: VectorClient;
  entity: typeof entityApi;
}

export function createSupabaseClient(): SupabaseClient {
  function createTableClient<T extends TableRow = TableRow>(tableName: string): TableClient<T> {
    let options: QueryOptions = {};
    const client: TableClient<T> = {
      getAll: async (queryOptions?: QueryOptions) => {
        return getData(tableName, { ...options, ...queryOptions }) as Promise<T[]>;
      },
      getById: async (id: string) => {
        return getItemById(tableName, id) as Promise<T | null>;
      },
      create: async (item: Omit<T, 'id'> & { id?: string }) => {
        return createItem(tableName, item) as Promise<T>;
      },
      update: async (id: string, updates: Partial<T>) => {
        return updateItem(tableName, id, updates) as Promise<T>;
      },
      delete: async (id: string) => {
        return deleteItem(tableName, id);
      },
      upsert: async (item: T) => {
        return upsertItem(tableName, item) as Promise<T>;
      },
      exists: async (id: string) => {
        return existsItem(tableName, id);
      },
      count: async (queryOptions?: QueryOptions) => {
        return countItems(tableName, queryOptions);
      },
      batchGet: async (ids: string[]) => {
        return batchGetItems(tableName, ids) as Promise<(T | null)[]>;
      },
      select: (...columns: (keyof T)[]) => {
        options = { ...options, select: columns as string[] };
        return client;
      },
      filter: (field: keyof T, operator: FilterOptions['operator'], value: unknown) => {
        const filters = options.filters || [];
        filters.push({ field: field as string, operator, value });
        options = { ...options, filters };
        return client;
      },
      order: (column: keyof T, ascending?: boolean) => {
        options = { ...options, orderBy: { column: column as string, ascending } };
        return client;
      },
      limit: (limit: number) => {
        options = { ...options, limit };
        return client;
      },
      offset: (offset: number) => {
        options = { ...options, offset };
        return client;
      }
    };
    return client;
  }

  function createVectorClient(): VectorClient {
    return {
      search: async (query, options) => {
        return vectorSearch(query, options) as Promise<Record<string, unknown>[]>;
      },
      upsert: async (vectors, options) => {
        const vectorsWithSparse = vectors.map(v => ({
          ...v,
          sparseVector: {
            indices: Array.from(v.vector.keys()),
            values: v.vector
          }
        }));
        return upsertSupabaseVectors(vectorsWithSparse, options) as Promise<Record<string, unknown>>;
      },
      upsertTexts: async (texts, options) => {
        return entityApi.upsertTexts(texts, options);
      },
      semanticSearch: async (text, options) => {
        return entityApi.semanticSearch(text, options);
      }
    };
  }

  return {
    from: createTableClient,
    vector: createVectorClient(),
    entity: entityApi
  };
}

export default createSupabaseClient;
