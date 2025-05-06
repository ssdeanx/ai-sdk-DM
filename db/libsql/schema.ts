import { sqliteTable, text, integer, blob, primaryKey } from 'drizzle-orm/sqlite-core'

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