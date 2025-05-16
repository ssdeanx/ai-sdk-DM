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
} from './index';
import {
  entityApi,
  upsertItem,
  existsItem,
  countItems,
  batchGetItems,
  VectorMetadata,
  VectorQueryOptions,
  TableName,
  TableRow,
  TableInsert,
  TableUpdate,
  FilterOptions,
  QueryOptions
} from './supabase-adapter';

// --- Enhanced Type-Safe TableClient ---
export interface TableClient<T extends TableName = TableName> {
  getAll(options?: QueryOptions): Promise<TableRow<T>[]>;
  getById(id: string): Promise<TableRow<T> | null>;
  create(item: TableInsert<T>): Promise<TableRow<T>>;
  update(id: string, updates: TableUpdate<T>): Promise<TableRow<T>>;
  delete(id: string): Promise<boolean>;
  upsert(item: TableRow<T>): Promise<TableRow<T>>;
  exists(id: string): Promise<boolean>;
  count(options?: QueryOptions): Promise<number>;
  batchGet(ids: string[]): Promise<(TableRow<T> | null)[]>;
  select(...columns: (keyof TableRow<T>)[]): TableClient<T>;
  filter(field: keyof TableRow<T>, operator: FilterOptions['operator'], value: unknown): TableClient<T>;
  order(column: keyof TableRow<T>, ascending?: boolean): TableClient<T>;
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
  from<T extends TableName>(tableName: T): TableClient<T>;
  vector: VectorClient;
  entity: typeof entityApi;
}

export function createSupabaseClient(): SupabaseClient {
  function createTableClient<T extends TableName>(tableName: T): TableClient<T> {
    let options: QueryOptions = {};
    const client: TableClient<T> = {
      getAll: async (queryOptions?: QueryOptions) => {
        return getData<T>(tableName, { ...options, ...queryOptions });
      },
      getById: async (id: string) => {
        return getItemById<T>(tableName, id);
      },
      create: async (item: TableInsert<T>) => {
        return createItem<T>(tableName, item);
      },
      update: async (id: string, updates: TableUpdate<T>) => {
        return updateItem<T>(tableName, id, updates);
      },
      delete: async (id: string) => {
        return deleteItem<T>(tableName, id);
      },
      upsert: async (item: TableRow<T>) => {
        return upsertItem<T>(tableName, item);
      },
      exists: async (id: string) => {
        return existsItem<T>(tableName, id);
      },
      count: async (queryOptions?: QueryOptions) => {
        return countItems<T>(tableName, queryOptions);
      },
      batchGet: async (ids: string[]) => {
        return batchGetItems<T>(tableName, ids);
      },
      select: (...columns: (keyof TableRow<T>)[]) => {
        options = { ...options, select: columns as string[] };
        return client;
      },
      filter: (field: keyof TableRow<T>, operator: FilterOptions['operator'], value: unknown) => {
        const filters = options.filters || [];
        filters.push({ field: field as string, operator, value });
        options = { ...options, filters };
        return client;
      },
      order: (column: keyof TableRow<T>, ascending?: boolean) => {
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
