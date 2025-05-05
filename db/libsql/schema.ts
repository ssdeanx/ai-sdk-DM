import { sqliteTable, text, integer, blob, primaryKey } from 'drizzle-orm/sqlite-core';

// Schema for LibSQL memory tables
export const memoryThreads = sqliteTable('memory_threads', {
  id: text('id').primaryKey(),
  agent_id: text('agent_id'),
  name: text('name'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  thread_id: text('thread_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  name: text('name'),
  tool_call_id: text('tool_call_id'),
  created_at: text('created_at').notNull(),
  embedding: blob('embedding'),
  token_count: integer('token_count'),
});

export const agentState = sqliteTable('agent_state', {
  thread_id: text('thread_id').notNull(),
  agent_id: text('agent_id').notNull(),
  state: text('state').notNull(),
  updated_at: text('updated_at').notNull(),
}, table => ({
  primaryKey: primaryKey(table.thread_id, table.agent_id),
}));

export const embeddings = sqliteTable('embeddings', {
  id: text('id').primaryKey(),
  vector: blob('vector').notNull(),
  model: text('model').notNull(),
  dimensions: integer('dimensions').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});