/**
 * Drizzle ORM client for both Supabase (Postgres) and LibSQL
 * Provides a unified interface for database operations
 */

import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleLibSql } from 'drizzle-orm/libsql';
import postgres from 'postgres';
import { createClient as createLibSqlClient } from '@libsql/client';
import { eq, and, or, inArray, desc, asc, type SQL, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';
import type { AnyPgTable, AnySQLiteTable } from 'drizzle-orm';

// Helper types for database tables
type AnyTable = AnyPgTable | AnySQLiteTable;

// Import all entity types from both databases
import type {
  // Supabase types
  User as SupabaseUser,
  App as SupabaseApp,
  AppCodeBlock as SupabaseAppCodeBlock,
  Integration as SupabaseIntegration,
  File as SupabaseFile,
  TerminalSession as SupabaseTerminalSession,
  Workflow as SupabaseWorkflow,
  Model as SupabaseModel,
  Provider as SupabaseProvider,
  AgentPersona as SupabaseAgentPersona,
  Agent as SupabaseAgent,
  Tool as SupabaseTool,
  WorkflowStep as SupabaseWorkflowStep,
  AgentTool as SupabaseAgentTool,
  Setting as SupabaseSetting,
  BlogPost as SupabaseBlogPost,
  MdxDocument as SupabaseMdxDocument,
  // Add other Supabase types as needed
} from '@/types/supabase';

import type {
  // LibSQL types
  MemoryThread as LibsqlMemoryThread,
  Message as LibsqlMessage,
  Embedding as LibsqlEmbedding,
  AgentState as LibsqlAgentState,
  Workflow as LibsqlWorkflow,
  WorkflowStep as LibsqlWorkflowStep,
  GqlCache as LibsqlGqlCache,
  App as LibsqlApp,
  User as LibsqlUser,
  Integration as LibsqlIntegration,
  AppCodeBlock as LibsqlAppCodeBlock,
  File as LibsqlFile,
  TerminalSession as LibsqlTerminalSession,
  // Add other LibSQL types as needed
} from '@/types/libsql';

// Re-export for convenience
export { eq, and, or, inArray, desc, asc };
export type { SQL };

// Combined database schema types
type DatabaseSchema = {
  // Supabase tables
  users: { $inferSelect: SupabaseUser; $inferInsert: any };
  apps: { $inferSelect: SupabaseApp; $inferInsert: any };
  app_code_blocks: { $inferSelect: SupabaseAppCodeBlock; $inferInsert: any };
  integrations: { $inferSelect: SupabaseIntegration; $inferInsert: any };
  files: { $inferSelect: SupabaseFile; $inferInsert: any };
  terminal_sessions: {
    $inferSelect: SupabaseTerminalSession;
    $inferInsert: any;
  };
  workflows: { $inferSelect: SupabaseWorkflow; $inferInsert: any };
  models: { $inferSelect: SupabaseModel; $inferInsert: any };
  providers: { $inferSelect: SupabaseProvider; $inferInsert: any };
  agent_personas: { $inferSelect: SupabaseAgentPersona; $inferInsert: any };
  agents: { $inferSelect: SupabaseAgent; $inferInsert: any };
  tools: { $inferSelect: SupabaseTool; $inferInsert: any };
  workflow_steps: { $inferSelect: SupabaseWorkflowStep; $inferInsert: any };
  agent_tools: { $inferSelect: SupabaseAgentTool; $inferInsert: any };
  settings: { $inferSelect: SupabaseSetting; $inferInsert: any };
  blog_posts: { $inferSelect: SupabaseBlogPost; $inferInsert: any };
  mdx_documents: { $inferSelect: SupabaseMdxDocument; $inferInsert: any };

  // LibSQL tables
  memory_threads: { $inferSelect: LibsqlMemoryThread; $inferInsert: any };
  messages: { $inferSelect: LibsqlMessage; $inferInsert: any };
  embeddings: { $inferSelect: LibsqlEmbedding; $inferInsert: any };
  agent_states: { $inferSelect: LibsqlAgentState; $inferInsert: any };
  libsql_workflows: { $inferSelect: LibsqlWorkflow; $inferInsert: any };
  libsql_workflow_steps: {
    $inferSelect: LibsqlWorkflowStep;
    $inferInsert: any;
  };
  gql_cache: { $inferSelect: LibsqlGqlCache; $inferInsert: any };
  libsql_apps: { $inferSelect: LibsqlApp; $inferInsert: any };
  libsql_users: { $inferSelect: LibsqlUser; $inferInsert: any };
  libsql_integrations: { $inferSelect: LibsqlIntegration; $inferInsert: any };
  libsql_app_code_blocks: {
    $inferSelect: LibsqlAppCodeBlock;
    $inferInsert: any;
  };
  libsql_files: { $inferSelect: LibsqlFile; $inferInsert: any };
  libsql_terminal_sessions: {
    $inferSelect: LibsqlTerminalSession;
    $inferInsert: any;
  };
};

type TableName = keyof DatabaseSchema;
type TableType<T extends TableName> = DatabaseSchema[T]['$inferSelect'];
type TableInsertType<T extends TableName> = DatabaseSchema[T]['$inferInsert'];

// Singleton instances
let supabaseDrizzleInstance: PostgresJsDatabase<DatabaseSchema> | null = null;
let libsqlDrizzleInstance: LibSQLDatabase<DatabaseSchema> | null = null;

/**
 * Get or create a Drizzle client for Supabase (Postgres)
 * @returns Drizzle Postgres client instance
 */
export function getSupabaseDrizzleClient(): PostgresJsDatabase<DatabaseSchema> {
  if (supabaseDrizzleInstance) {
    return supabaseDrizzleInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is required for Supabase'
    );
  }

  const pgClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

  supabaseDrizzleInstance = drizzlePg(pgClient);
  return supabaseDrizzleInstance;
}

/**
 * Get or create a Drizzle client for LibSQL
 * @returns Drizzle LibSQL client instance
 */
export function getLibsqlDrizzleClient(): LibSQLDatabase<DatabaseSchema> {
  if (libsqlDrizzleInstance) {
    return libsqlDrizzleInstance;
  }

  const dbUrl = process.env.LIBSQL_DATABASE_URL;
  const authToken = process.env.LIBSQL_AUTH_TOKEN;

  if (!dbUrl) {
    throw new Error('LIBSQL_DATABASE_URL environment variable is required');
  }

  if (
    dbUrl.startsWith('libsql://') &&
    dbUrl.includes('.turso.io') &&
    !authToken
  ) {
    throw new Error('LIBSQL_AUTH_TOKEN is required for Turso databases');
  }

  const client = createLibSqlClient({
    url: dbUrl,
    authToken: authToken,
  });

  libsqlDrizzleInstance = drizzleLibSql(client);
  return libsqlDrizzleInstance;
}

/**
 * Check if Supabase Drizzle client is available
 * @returns boolean indicating if Supabase is configured
 */
export function isSupabaseDrizzleAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Check if LibSQL Drizzle client is available
 * @returns boolean indicating if LibSQL is configured
 */
export function isLibsqlDrizzleAvailable(): boolean {
  return !!process.env.LIBSQL_DATABASE_URL;
}

/**
 * Get the appropriate Drizzle client based on configuration
 * @returns Drizzle client instance (Supabase or LibSQL)
 * @throws Error if neither client is configured
 */
export function getDrizzleClient() {
  if (isSupabaseDrizzleAvailable()) {
    return getSupabaseDrizzleClient();
  }
  if (isLibsqlDrizzleAvailable()) {
    return getLibsqlDrizzleClient();
  }
  throw new Error(
    'No database configuration found. Please configure either Supabase or LibSQL.'
  );
}

/**
 * Base CRUD operations that work with both Supabase and LibSQL
 */
// Type utilities for Drizzle tables
type InferSelectModel<T> = T extends { $inferSelect: infer U } ? U : never;
type InferInsertModel<T> = T extends { $inferInsert: infer U } ? U : never;

type DatabaseClient =
  | PostgresJsDatabase<DatabaseSchema>
  | LibSQLDatabase<DatabaseSchema>;

// Type-safe table access
type TableAccessor<T extends DatabaseClient, K extends keyof DatabaseSchema> =
  T extends PostgresJsDatabase<infer S>
  ? S[K] extends { $inferSelect: infer U }
  ? U
  : never
  : T extends LibSQLDatabase<infer S>
  ? S[K] extends { $inferSelect: infer U }
  ? U
  : never
  : never;

export class DrizzleCRUD<
  TSchema extends DatabaseSchema,
  TTableName extends keyof TSchema,
> {
  private readonly db: DatabaseClient;
  private readonly tableName: TTableName;
  private readonly table: AnyTable;

  constructor(db: DatabaseClient, tableName: TTableName) {
    if (!db) {
      throw new Error('Database client is required');
    }
    if (!tableName) {
      throw new Error('Table name is required');
    }

    this.db = db;
    this.tableName = tableName;

    // Safe type assertion for table access
    const table = (db as any)[tableName];
    if (!table) {
      throw new Error(
        `Table ${String(tableName)} not found in database schema`
      );
    }
    this.table = table as AnyTable;
  }

  /**
   * Create a new record
   * @param data The data to insert
   * @returns The created record or null if an error occurs
   */
  async create(
    data: InferInsertModel<TSchema[TTableName]>
  ): Promise<InferSelectModel<TSchema[TTableName]> | null> {
    try {
      // Use type assertion to handle dynamic table access
      const table = this.table as any;
      const result = await (this.db as any)
        .insert(table)
        .values(data)
        .returning();

      return Array.isArray(result) ? result[0] : result || null;
    } catch (error) {
      console.error(
        `Error creating record in ${String(this.tableName)}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get a record by ID
   * @param id The ID of the record to retrieve
   * @returns The record if found, null otherwise
   */
  async get(id: string): Promise<InferSelectModel<TSchema[TTableName]> | null> {
    if (!id) {
      throw new Error('ID is required');
    }

    try {
      const table = this.table as any;
      const result = await (this.db as any)
        .select()
        .from(table)
        .where(eq(table.id, id));

      return Array.isArray(result) ? result[0] || null : result || null;
    } catch (error) {
      console.error(
        `Error getting record from ${String(this.tableName)}:`,
        error
      );
      return null;
    }
  }

  /**
   * Update a record
   * @param id The ID of the record to update
   * @param data The data to update
   * @returns The updated record or null if an error occurs
   */
  async update(
    id: string,
    data: Partial<InferInsertModel<TSchema[TTableName]>>
  ): Promise<InferSelectModel<TSchema[TTableName]> | null> {
    if (!id) {
      throw new Error('ID is required');
    }
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Update data is required');
    }

    try {
      const table = this.table as any;
      const result = await (this.db as any)
        .update(table)
        .set(data)
        .where(eq(table.id, id))
        .returning();

      return Array.isArray(result) ? result[0] || null : result || null;
    } catch (error) {
      console.error(
        `Error updating record in ${String(this.tableName)}:`,
        error
      );
      return null;
    }
  }

  /**
   * Delete a record
   * @param id The ID of the record to delete
   * @returns True if deletion was successful, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('ID is required');
    }

    try {
      const table = this.table as any;
      await (this.db as any).delete(table).where(eq(table.id, id));
      return true;
    } catch (error) {
      console.error(
        `Error deleting record from ${String(this.tableName)}:`,
        error
      );
      return false;
    }
  }

  /**
   * List records with optional filtering, sorting and pagination
   * @param options Query options
   * @returns Array of records matching the criteria
   */
  async list({
    where,
    limit = 100,
    offset = 0,
    orderBy,
  }: {
    where?: SQL;
    limit?: number;
    offset?: number;
    orderBy?: { column: string; direction: 'asc' | 'desc' };
  } = {}): Promise<InferSelectModel<TSchema[TTableName]>[]> {
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    if (offset < 0) {
      throw new Error('Offset must be a non-negative number');
    }

    try {
      const table = this.table as any;
      // Use type assertion to handle dynamic table access
      let query = (this.db as any).select().from(table);

      if (where) {
        query = query.where(where);
      }

      if (orderBy) {
        const column = table[orderBy.column];
        if (!column) {
          throw new Error(
            `Column ${orderBy.column} not found in table ${String(this.tableName)}`
          );
        }
        const orderFn = orderBy.direction === 'asc' ? asc : desc;
        query = query.orderBy(orderFn(column));
      }

      const results = await query.limit(limit).offset(offset);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error(
        `Error listing records from ${String(this.tableName)}:`,
        error
      );
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Count records matching the given conditions
   * @param where Optional where clause to filter records
   * @returns The count of matching records
   */
  async count(where?: SQL): Promise<number> {
    try {
      const table = this.table as any;
      // Use type assertion to handle dynamic table access
      const result = await (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(where || sql`1=1`);

      const countResult = Array.isArray(result) ? result[0] : result;
      return countResult?.count ?? 0;
    } catch (error) {
      console.error(
        `Error counting records in ${String(this.tableName)}:`,
        error
      );
      throw error; // Re-throw to allow caller to handle
    }
  }
}
