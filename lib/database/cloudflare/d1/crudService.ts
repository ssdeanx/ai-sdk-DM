import { D1Orm } from './client';
import * as schema from './schema';
import { eq, and, SQL, sql } from 'drizzle-orm';
import { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { generateId } from 'ai';
import { drizzle } from 'drizzle-orm/d1/driver';

// Type mapping for table names to their schema definitions
type TableMap = typeof schema;
type TableName = keyof TableMap;

// Extract actual table type from schema (excluding relations)
type ExtractTable<T> = T extends {
  $inferSelect: unknown;
  $inferInsert: unknown;
}
  ? T
  : never;
type SchemaTable<T extends TableName> = ExtractTable<TableMap[T]>;

// AI-domain tables use generateId, others use crypto.randomUUID()
const AI_TABLES: Set<string> = new Set([
  'models',
  'tools',
  'agents',
  'threads',
  'messages',
  'workflows',
  'networks',
  'appBuilderProjects',
  'apps',
  'appCodeBlocks',
  'agentPersonas',
  'agentTools',
  'memoryThreads',
  'embeddings',
  'agentStates',
  'workflowSteps',
  'workflowExecutions',
  'vectorEmbeddings',
  'terminalSessions',
  'blogPosts',
  'mdxDocuments',
  'contentTable',
  'traces',
  'spans',
  'events',
  'systemMetrics',
  'modelPerformance',
  'modelCosts',
  'modelEvaluations',
  'evaluationMetrics',
  'evaluationExamples',
]);

/**
 * CfD1CrudService
 *
 * Generic helper for CRUD operations on Cloudflare D1 tables.
 * Uses Drizzle ORM with project schema for type-safe database operations.
 *
 * @example
 *
 *
 *
 */
export class CfD1CrudService {
  private orm!: D1Orm;
  private database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
    this.orm = drizzle(this.database);
  }

  /**
   * Create a new record in the specified table.
   * @param tableName - The table to create in
   * @param data - The data to insert
   * @returns Promise<InferSelectModel<SchemaTable<T>>> The created record
   */
  async create<T extends TableName>(
    tableName: T,
    data: InferInsertModel<SchemaTable<T>>
  ): Promise<InferSelectModel<SchemaTable<T>>> {
    const table = this.getTable(tableName);
    const timestamp = Date.now();

    // Determine ID
    const providedId = (data as Record<string, unknown>).id as
      | string
      | undefined;
    const idValue =
      providedId ||
      (AI_TABLES.has(tableName as string) ? generateId() : crypto.randomUUID());

    // Build insert record with proper typing
    const insertRecord = { ...data } as Record<string, unknown>;

    if ('id' in table && !providedId) {
      insertRecord.id = idValue;
    }
    if ('createdAt' in table) {
      insertRecord.createdAt = timestamp;
    }
    if ('updatedAt' in table) {
      insertRecord.updatedAt = timestamp;
    }

    const [inserted] = await this.orm
      .insert(table)
      .values(insertRecord as SchemaTable<T>['$inferInsert'])
      .returning();

    return inserted as InferSelectModel<SchemaTable<T>>;
  }

  /**
   * Read records from the specified table.
   * @param tableName - The table to query
   * @param query - Query/filter parameters
   * @returns Promise<InferSelectModel<SchemaTable<T>> | null> The found record or null
   */
  async read<T extends TableName>(
    tableName: T,
    query: Partial<InferSelectModel<SchemaTable<T>>>
  ): Promise<InferSelectModel<SchemaTable<T>> | null> {
    const table = this.getTable(tableName);
    const result = await this.orm
      .select()
      .from(table)
      .where(this.buildWhereConditions(table, query)!)
      .limit(1);
    return (result[0] as InferSelectModel<SchemaTable<T>>) || null;
  }

  /**
   * Update records in the specified table.
   * @param tableName - The table to update
   * @param query - Query/filter parameters
   * @param data - The data to update
   * @returns Promise<unknown> The updated record
   */
  async update<T extends TableName>(
    tableName: T,
    query: Partial<InferSelectModel<SchemaTable<T>>>,
    data: Partial<InferInsertModel<SchemaTable<T>>>
  ): Promise<InferSelectModel<SchemaTable<T>>> {
    const table = this.getTable(tableName);
    const conditions = this.buildWhereConditions(table, query);
    const updateData = {
      ...data,
      updatedAt: Date.now(),
    };
    const result = await this.orm
      .update(table)
      .set(updateData)
      .where(conditions)
      .returning();
    return result[0] as InferSelectModel<SchemaTable<T>>;
  }

  /**
   * Delete records from the specified table.
   * @param tableName - The table to delete from
   * @param query - Query/filter parameters
   * @returns Promise<InferSelectModel<SchemaTable<T>>> The deleted record
   */
  async delete<T extends TableName>(
    tableName: T,
    query: Partial<InferSelectModel<SchemaTable<T>>>
  ): Promise<InferSelectModel<SchemaTable<T>>> {
    const table = this.getTable(tableName);
    const conditions = this.buildWhereConditions(table, query);

    const result = await this.orm.delete(table).where(conditions).returning();
    return result[0] as InferSelectModel<SchemaTable<T>>;
  }

  /**
   * List records from the specified table.
   * @param tableName - The table to list from
   * @param options - Pagination or filter options
   * @returns Promise<InferSelectModel<SchemaTable<T>>[]> Array of records
   */
  async list<T extends TableName>(
    tableName: T,
    options: {
      where?: Partial<InferSelectModel<SchemaTable<T>>>;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<InferSelectModel<SchemaTable<T>>[]> {
    const table = this.getTable(tableName);

    // Start with the base select statement.
    let baseSelect = this.orm.select().from(table);

    if (options.where) {
      const conditions = this.buildWhereConditions(table, options.where);
      if (conditions) {
        // Apply where clause. Casting to handle potential type inference issues with Omit<...>.
        baseSelect = baseSelect.where(
          conditions
        ) as unknown as typeof baseSelect;
      }
    }

    // Sequentially apply limit and offset.
    // Each operation can change the query object's type, so we handle it step-by-step.
    let queryWithPossibleLimit;
    if (options.limit !== undefined) {
      queryWithPossibleLimit = baseSelect.limit(options.limit);
    } else {
      queryWithPossibleLimit = baseSelect;
    }

    let finalQueryExecutable;
    if (options.offset !== undefined) {
      finalQueryExecutable = queryWithPossibleLimit.offset(options.offset);
    } else {
      finalQueryExecutable = queryWithPossibleLimit;
    }

    // Execute the fully constructed query.
    // All intermediate types (baseSelect, queryWithPossibleLimit, finalQueryExecutable) are awaitable.
    const result = await finalQueryExecutable;

    return result as InferSelectModel<SchemaTable<T>>[];
  }

  /**
   * Count records in the specified table.
   * @param tableName - The table to count from
   * @param where - Optional filter conditions
   * @returns Promise<number> Count of matching records
   */
  async count<T extends TableName>(
    tableName: T,
    where?: Partial<InferSelectModel<SchemaTable<T>>>
  ): Promise<number> {
    const table = this.getTable(tableName);
    let query = this.orm.select({ count: sql<number>`count(*)` }).from(table);

    if (where) {
      const conditions = this.buildWhereConditions(table, where);
      if (conditions) {
        query = query.where(conditions) as unknown as typeof query;
      }
    }

    const result = await query;
    return result[0]?.count || 0;
  }
  /**
   * Check if record exists in the specified table.
   * @param tableName - The table to check
   * @param query - Query/filter parameters
   * @returns Promise<boolean> Whether record exists
   */
  async exists<T extends TableName>(
    tableName: T,
    query: Partial<InferSelectModel<SchemaTable<T>>>
  ): Promise<boolean> {
    const table = this.getTable(tableName);
    const conditions = this.buildWhereConditions(table, query);

    const result = await this.orm
      .select({ exists: sql<number>`1` })
      .from(table)
      .where(conditions)
      .limit(1);

    return result.length > 0;
  }
  /**
   * Get table reference by name
   * @private
   */
  private getTable<T extends TableName>(tableName: T): SchemaTable<T> {
    const table = (schema as unknown as Record<string, SchemaTable<T>>)[
      tableName
    ];
    if (!table) {
      throw new Error(`Table '${String(tableName)}' not found in schema`);
    }
    return table;
  }

  /**
   * Build WHERE conditions from query object
   * @private
   */
  private buildWhereConditions<T extends TableName>(
    table: SchemaTable<T>,
    query: Partial<InferSelectModel<SchemaTable<T>>>
  ): SQL | undefined {
    const conditions: SQL[] = [];
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        const column = table[key as keyof SchemaTable<T>];
        if (column && typeof column === 'object' && 'getSQL' in column) {
          conditions.push(eq(column as unknown as SQLiteColumn, value));
        }
      }
    }
    if (conditions.length === 0) return undefined;
    return conditions.length > 1 ? and(...conditions)! : conditions[0];
  }
}
