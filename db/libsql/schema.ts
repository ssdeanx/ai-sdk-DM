import { sqliteTable, text, integer, blob, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const memory_threads = sqliteTable('memory_threads', {
  id: text('id').primaryKey(),
  agent_id: text('agent_id'),
  network_id: text('network_id'),
  name: text('name').notNull(),
  summary: text('summary'),
  metadata: text('metadata'), // JSON string
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  memory_thread_id: text('memory_thread_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  tool_call_id: text('tool_call_id'),
  tool_name: text('tool_name'),
  token_count: integer('token_count'),
  embedding_id: text('embedding_id'),
  metadata: text('metadata'), // JSON string
  created_at: text('created_at').notNull(),
})

export const embeddings = sqliteTable('embeddings', {
  id: text('id').primaryKey(),
  vector: blob('vector').notNull(),
  model: text('model'),
  dimensions: integer('dimensions'),
  created_at: text('created_at').notNull(),
})

export const agent_states = sqliteTable('agent_states', {
  memory_thread_id: text('memory_thread_id').notNull(),
  agent_id: text('agent_id').notNull(),
  state_data: text('state_data').notNull(), // JSON string
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.memory_thread_id, table.agent_id] })
])

// HNSW index for embeddings (run as raw SQL migration):
// CREATE INDEX IF NOT EXISTS embeddings_hnsw ON embeddings USING HNSW (vector) WITH (dims = 384, m = 16, efConstruction = 200);

// Workflows table for storing workflows
export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  current_step_index: integer('current_step_index').notNull().default(0),
  status: text('status').notNull(),
  metadata: text('metadata'), // JSON string
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
})

// Workflow steps table for storing workflow steps
export const workflow_steps = sqliteTable('workflow_steps', {
  id: text('id').primaryKey(),
  workflow_id: text('workflow_id').notNull(),
  agent_id: text('agent_id').notNull(),
  input: text('input'),
  thread_id: text('thread_id').notNull(),
  status: text('status').notNull(),
  result: text('result'),
  error: text('error'),
  metadata: text('metadata'), // JSON string
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
})

export const gqlCache = sqliteTable('gql_cache', {
  id: text('id').primaryKey(),           // key = query + variables JSON
  query: text('query').notNull(),
  variables: text('variables'),          // JSON string
  response: text('response').notNull(),  // JSON string
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Apps table (cross-backend compatible with Supabase)
export const apps = sqliteTable('apps', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  type: text('type').notNull(),
  code: text('code').notNull(),
  parameters_schema: text('parameters_schema'), // Store as JSON string for LibSQL
  metadata: text('metadata'), // Store as JSON string for LibSQL
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar_url: text('avatar_url'),
  role: text('role').notNull(), // 'user' or 'admin'
  password_hash: text('password_hash').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

/**
 * Integrations table for storing third-party integration configs.
 */
export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  provider: text('provider').notNull(), // e.g. 'github', 'google', 'vercel', 'notion', 'neon'
  name: text('name'),
  config: text('config'),        // Store JSON as string for LibSQL (API keys, etc.)
  credentials: text('credentials'), // Store JSON as string for LibSQL (API keys, etc.)
  status: text('status').notNull(), // 'active', 'inactive', 'error'
  last_synced_at: text('last_synced_at'),
  metadata: text('metadata'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

/**
 * App code blocks table for codeBlock.tsx.
 */
export const app_code_blocks = sqliteTable('app_code_blocks', {
  id: text('id').primaryKey(),
  app_id: text('app_id').notNull(), // Foreign key to apps.id
  language: text('language').notNull(), // e.g. 'typescript', 'javascript', 'json'
  code: text('code').notNull(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

/**
 * Files table for file tree.
 */
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  app_id: text('app_id').notNull(),
  parent_id: text('parent_id'),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'file' or 'folder'
  content: text('content'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

/**
 * Terminal sessions table.
 */
export const terminal_sessions = sqliteTable('terminal_sessions', {
  id: text('id').primaryKey(),
  app_id: text('app_id').notNull(),
  user_id: text('user_id').notNull(),
  command: text('command').notNull(),
  output: text('output'),
  status: text('status').notNull().default('pending'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

// Types for the tables
// Assuming your SQLite schema tables are available in the current scope
// (e.g., if this code is at the end of your schema.ts or you've imported them)

// For the 'memory_threads' table
export type MemoryThread = typeof memory_threads.$inferSelect;
export type NewMemoryThread = typeof memory_threads.$inferInsert;

// For the 'messages' table
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// For the 'embeddings' table
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;

// For the 'agent_states' table
export type AgentState = typeof agent_states.$inferSelect;
export type NewAgentState = typeof agent_states.$inferInsert;

// For the 'workflows' table
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

// For the 'workflow_steps' table
export type WorkflowStep = typeof workflow_steps.$inferSelect;
export type NewWorkflowStep = typeof workflow_steps.$inferInsert;

// For the 'gqlCache' table
export type GqlCache = typeof gqlCache.$inferSelect;
export type NewGqlCache = typeof gqlCache.$inferInsert;

// For the 'apps' table
export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;

// For the 'users' table
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// For the 'integrations' table
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

// For the 'app_code_blocks' table
export type AppCodeBlock = typeof app_code_blocks.$inferSelect;
export type NewAppCodeBlock = typeof app_code_blocks.$inferInsert;

// For the 'files' table
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

// For the 'terminal_sessions' table
export type TerminalSession = typeof terminal_sessions.$inferSelect;
export type NewTerminalSession = typeof terminal_sessions.$inferInsert;