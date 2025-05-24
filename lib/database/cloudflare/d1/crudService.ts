import { D1Orm } from './client';
import * as schema from './schema';
import { eq, and, SQL } from 'drizzle-orm';
import { SQLiteTable, TableConfig } from 'drizzle-orm/sqlite-core';
import { generateId } from 'ai';

/**
 * CfD1CrudService
 *
 * Generic helper for CRUD operations on Cloudflare D1 tables.
 * Uses Drizzle ORM with project schema for type-safe database operations.
 *
 * @example
 * ```typescript
 * const crudService = new CfD1CrudService(orm);
 * const user = await crudService.create('users', { email: 'test@example.com' });
 * ```
 */
export class CfD1CrudService {
  private orm: D1Orm;

  constructor(orm: D1Orm) {
    this.orm = orm;
  }
  /**
   * Create a new record in the specified table.
   * @param tableName - The table to insert into
   * @param data - The data to insert
   * @returns Promise<unknown> The created record
   */
  async create(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const table = this.getTable(tableName);
      const recordWithId = {
        ...data,
        id: data.id || generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await this.orm
        .insert(table)
        .values(recordWithId)
        .returning();
      return result[0];
    } catch (error) {
      throw new Error(`Failed to create record in ${tableName}: ${error}`);
    }
  }

  /**
   * Read records from the specified table.
   * @param tableName - The table to query
   * @param query - Query/filter parameters
   * @returns Promise<unknown> The found record or null
   */
  async read(
    tableName: string,
    query: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const table = this.getTable(tableName);
      const conditions = this.buildWhereConditions(tableName, query);

      const result = await this.orm
        .select()
        .from(table)
        .where(conditions)
        .limit(1);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to read from ${tableName}: ${error}`);
    }
  }

  /**
   * Update records in the specified table.
   * @param tableName - The table to update
   * @param query - Query/filter parameters
   * @param data - The data to update
   * @returns Promise<unknown> The updated record
   */
  async update(
    tableName: string,
    query: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const table = this.getTable(tableName);
      const conditions = this.buildWhereConditions(tableName, query);
      const updateData = {
        ...data,
        updatedAt: Date.now(),
      };

      const result = await this.orm
        .update(table)
        .set(updateData)
        .where(conditions)
        .returning();
      return result[0];
    } catch (error) {
      throw new Error(`Failed to update ${tableName}: ${error}`);
    }
  }

  /**
   * Delete records from the specified table.
   * @param tableName - The table to delete from
   * @param query - Query/filter parameters
   * @returns Promise<unknown> The deleted record
   */
  async delete(
    tableName: string,
    query: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const table = this.getTable(tableName);
      const conditions = this.buildWhereConditions(tableName, query);

      const result = await this.orm.delete(table).where(conditions).returning();
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      throw new Error(`Failed to delete from ${tableName}: ${error}`);
    }
  }

  /**
   * List records from the specified table.
   * @param tableName - The table to list from
   * @param options - Pagination or filter options
   * @returns Promise<unknown[]> Array of records
   */
  async list(
    tableName: string,
    options: {
      where?: Record<string, unknown>;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<unknown[]> {
    try {
      const table = this.getTable(tableName);
      let queryBuilder = this.orm.select().from(table) as any;

      if (options.where) {
        const conditions = this.buildWhereConditions(tableName, options.where);
        if (conditions) {
          queryBuilder = queryBuilder.where(conditions);
        }
      }

      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      if (options.offset) {
        queryBuilder = queryBuilder.offset(options.offset);
      }

      const result = await queryBuilder;
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      throw new Error(`Failed to list from ${tableName}: ${error}`);
    }
  }
  /**
   * Get table reference by name
   * @private
   */ private getTable(tableName: string): SQLiteTable<TableConfig> {
    const table = (schema as Record<string, unknown>)[tableName];
    if (!table) {
      throw new Error(`Table '${tableName}' not found in schema`);
    }
    return table as SQLiteTable<TableConfig>;
  }

  /**
   * Build WHERE conditions from query object
   * @private
   */
  private buildWhereConditions(
    tableName: string,
    query: Record<string, unknown>
  ): SQL | undefined {
    const conditions: SQL[] = [];
    const table = this.getTable(tableName);

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        const column = (table as any)[key];
        if (column && typeof column === 'object' && 'getSQL' in column) {
          conditions.push(eq(column as any, value));
        }
      }
    }

    if (conditions.length === 0) return undefined;
    return conditions.length > 1 ? and(...conditions)! : conditions[0];
  }
}
