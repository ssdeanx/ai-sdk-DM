import { pgTable, text, varchar, integer, timestamp, json, primaryKey } from 'drizzle-orm/pg-core';

// TODO: Define your Supabase tables and columns below
export const agents = pgTable('agents', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  model_id: varchar('model_id').notNull(),
  tool_ids: json('tool_ids').$type<string[]>(),
  system_prompt: text('system_prompt'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const models = pgTable('models', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  model_id: text('model_id').notNull(),
  status: text('status').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const tools = pgTable('tools', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parameters_schema: json('parameters_schema').$type<Record<string, unknown>>(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const agent_tools = pgTable('agent_tools', {
  agent_id: varchar('agent_id').notNull(),
  tool_id: varchar('tool_id').notNull(),
  created_at: timestamp('created_at').defaultNow(),
}, table => ({
  primaryKey: primaryKey(table.agent_id, table.tool_id),
}));

export const settings = pgTable('settings', {
  category: text('category').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
}, table => ({
  primaryKey: primaryKey(table.category, table.key),
}));

// Add any additional tables here
