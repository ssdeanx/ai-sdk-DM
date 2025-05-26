import * as schema from './schema';
import {
  eq,
  and,
  SQL,
  InferSelectModel,
  InferInsertModel,
  getTableColumns,
  AnyColumn,
} from 'drizzle-orm';
import { D1Orm } from './client';
import { generateId } from 'ai';

// Define standard audit keys that are commonly used
type StandardAuditKeys = 'id' | 'createdAt' | 'updatedAt';

// Only include table exports (not relations, helpers, etc.)
const tables = {
  users: schema.users,
  accounts: schema.accounts,
  sessions: schema.sessions,
  verificationTokens: schema.verificationTokens,
  models: schema.models,
  tools: schema.tools,
  traces: schema.traces,
  spans: schema.spans,
  events: schema.events,
  modelPerformance: schema.modelPerformance,
  modelCosts: schema.modelCosts,
  modelEvaluations: schema.modelEvaluations,
  evaluationMetrics: schema.evaluationMetrics,
  evaluationExamples: schema.evaluationExamples,
  databaseConnections: schema.databaseConnections,
  databaseTransactions: schema.databaseTransactions,
  databaseQueries: schema.databaseQueries,
  scheduledTasks: schema.scheduledTasks,
  scheduledTaskRuns: schema.scheduledTaskRuns,
  // ...add all other tables you want to support
};
type TableName = keyof typeof tables;

export class CfD1CrudService {
  private orm: D1Orm;

  constructor(orm: D1Orm) {
    this.orm = orm;
  }

  async create<T extends TableName>(
    tableName: T,
    data: Omit<
      InferInsertModel<(typeof tables)[T]>,
      Extract<keyof InferInsertModel<(typeof tables)[T]>, StandardAuditKeys>
    > &
      Partial<
        Pick<
          InferInsertModel<(typeof tables)[T]>,
          Extract<keyof InferInsertModel<(typeof tables)[T]>, StandardAuditKeys>
        >
      >
  ): Promise<InferSelectModel<(typeof tables)[T]>> {
    const table = tables[tableName];
    const now = Date.now();
    const record = {
      ...data,
      id: 'id' in data ? data.id : generateId(),
      createdAt: 'createdAt' in data ? data.createdAt : now,
      updatedAt: 'updatedAt' in data ? data.updatedAt : now,
    } as InferInsertModel<(typeof tables)[T]>;
    const [created] = await this.orm
      .insert(table)
      .values(record as (typeof tables)[T]['$inferInsert'])
      .returning();
    return created as InferSelectModel<(typeof tables)[T]>;
  }
  /**
   * Read a single record matching query
   */
  async read<T extends TableName>(
    tableName: T,
    query: Partial<InferSelectModel<(typeof tables)[T]>>
  ): Promise<InferSelectModel<(typeof tables)[T]> | null> {
    const table = tables[tableName];
    const cond = this.buildWhere(table, query);
    const [found] = await this.orm
      .select()
      .from(table)
      .where(cond ?? undefined)
      .limit(1);
    return found ? (found as InferSelectModel<(typeof tables)[T]>) : null;
  }

  /**
   * Update record(s) matching query
   */
  async update<T extends TableName>(
    tableName: T,
    query: Partial<InferSelectModel<(typeof tables)[T]>>,
    data: Partial<InferInsertModel<(typeof tables)[T]>>
  ): Promise<InferSelectModel<(typeof tables)[T]>> {
    const table = tables[tableName];
    // Call the internal method with the specifically typed table
    return this._updateInternal(table, query, data);
  }

  /**
   * Internal update method with more specific table typing.
   */
  private async _updateInternal<TTable extends (typeof tables)[TableName]>(
    table: TTable,
    query: Partial<InferSelectModel<TTable>>,
    data: Partial<InferInsertModel<TTable>>
  ): Promise<InferSelectModel<TTable>> {
    const cond = this.buildWhere(table, query);
    const updateData = {
      ...data,
      updatedAt: Date.now(),
    } as unknown as Parameters<
      ReturnType<typeof this.orm.update<TTable>>['set']
    >[0];

    const [updated] = await this.orm
      .update(table)
      .set(updateData)
      .where(cond!)
      .returning();
    return updated as InferSelectModel<TTable>;
  }
  /**
   * Delete record(s) matching query
   */
  async delete<T extends TableName>(
    tableName: T,
    query: Partial<InferSelectModel<(typeof tables)[T]>>
  ): Promise<InferSelectModel<(typeof tables)[T]>> {
    const table = tables[tableName];
    const cond = this.buildWhere(table, query);
    const [deleted] = await this.orm.delete(table).where(cond!).returning();
    return deleted as InferSelectModel<(typeof tables)[T]>;
  }

  /**
   * List records with optional filters and pagination
   */
  async list<T extends TableName>(
    tableName: T,
    options: {
      where?: Partial<InferSelectModel<(typeof tables)[T]>>;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<InferSelectModel<(typeof tables)[T]>[]> {
    const table = tables[tableName];
    let dbQuery = this.orm.select().from(table).$dynamic();

    if (options.where) {
      const condition = this.buildWhere(table, options.where);
      if (condition) {
        dbQuery = dbQuery.where(condition);
      }
    }

    if (typeof options.limit === 'number') {
      dbQuery = dbQuery.limit(options.limit);
    }
    if (typeof options.offset === 'number') {
      dbQuery = dbQuery.offset(options.offset);
    }
    return (await dbQuery) as InferSelectModel<(typeof tables)[T]>[];
  }

  /**
   * Build a WHERE clause from a partial record
   */
  private buildWhere<T extends TableName>(
    table: (typeof tables)[T],
    query: Partial<InferSelectModel<(typeof tables)[T]>>
  ): SQL | undefined {
    const conds: SQL[] = [];
    const tableColumns = getTableColumns(table);

    for (const key in query) {
      const value = query[key as keyof typeof query];
      // Ensure `key` is a column name present in the table schema and query
      if (value != null && Object.prototype.hasOwnProperty.call(query, key)) {
        // `key` is known to be a key of `tableColumns` (a valid column name)
        // `tableColumns[key]` is guaranteed to be a Column object
        // Cast to AnyColumn to help TypeScript resolve overloads for `eq`
        conds.push(
          eq(tableColumns[key as keyof typeof tableColumns] as AnyColumn, value)
        );
      }
    }
    if (conds.length === 0) return undefined; // Explicitly return undefined
    if (conds.length === 0) return undefined; // Explicitly return undefined
    return conds.length > 1 ? and(...conds) : conds[0];
  }
}

// ---
// SUGGESTION: Add a table for schema metadata management
// This helps track schema versions, migrations, and table documentation.
// Example:
// export const tableMetadata = sqliteTable('table_metadata', {
//   id: text('id').primaryKey().$defaultFn(() => generateId()),
//   tableName: text('table_name').notNull().unique(),
//   description: text('description'),
//   version: integer('version').notNull().default(1),
//   createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
//   updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
// });
// ---
