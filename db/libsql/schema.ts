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