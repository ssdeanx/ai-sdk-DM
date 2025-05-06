import { pgTable, text, varchar, jsonb, boolean, timestamp, integer } from 'drizzle-orm/pg-core'

// Workflows table for storing workflows
export const workflows = pgTable('workflows', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  current_step_index: integer('current_step_index').notNull().default(0),
  status: text('status').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Workflow steps table for storing workflow steps
export const workflow_steps = pgTable('workflow_steps', {
  id: varchar('id', { length: 36 }).primaryKey(),
  workflow_id: varchar('workflow_id', { length: 36 }).notNull(),
  agent_id: varchar('agent_id', { length: 36 }).notNull(),
  input: text('input'),
  thread_id: varchar('thread_id', { length: 36 }).notNull(),
  status: text('status').notNull(),
  result: text('result'),
  error: text('error'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const models = pgTable('models', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  model_id: text('model_id').notNull(),
  base_url: text('base_url'),
  api_key: text('api_key').notNull(),
  status: text('status').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const tools = pgTable('tools', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  parameters_schema: text('parameters_schema').notNull(),
  category: text('category'),
  implementation: text('implementation'),
  is_enabled: boolean('is_enabled').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const agents = pgTable('agents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  model_id: varchar('model_id', { length: 36 }).notNull(),
  tool_ids: jsonb('tool_ids').default([]),
  system_prompt: text('system_prompt'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const agent_tools = pgTable('agent_tools', {
  agent_id: varchar('agent_id', { length: 36 }).notNull(),
  tool_id: varchar('tool_id', { length: 36 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const settings = pgTable('settings', {
  category: text('category').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const blog_posts = pgTable('blog_posts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  author: text('author'),
  image_url: text('image_url'),
  tags: text('tags'),
  featured: boolean('featured').default(false),
  published_at: timestamp('published_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const mdx_documents = pgTable('mdx_documents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  user_id: varchar('user_id', { length: 36 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const content = pgTable('content', {
  id: varchar('id', { length: 36 }).primaryKey(),
  type: text('type').notNull(),
  title: text('title'),
  subtitle: text('subtitle'),
  description: text('description'),
  content: text('content'),
  data: jsonb('data'),
  image_url: text('image_url'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
