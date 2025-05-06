import {
  pgTable,
  text,
  varchar,
  jsonb,
  boolean,
  timestamp,
  integer,
  numeric,
  primaryKey,
  foreignKey
} from 'drizzle-orm/pg-core'

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
  max_tokens: integer('max_tokens').notNull().default(4096),
  input_cost_per_token: numeric('input_cost_per_token').notNull().default('0.0'),
  output_cost_per_token: numeric('output_cost_per_token').notNull().default('0.0'),
  supports_vision: boolean('supports_vision').notNull().default(false),
  supports_functions: boolean('supports_functions').notNull().default(false),
  supports_streaming: boolean('supports_streaming').notNull().default(true),
  default_temperature: numeric('default_temperature').notNull().default('0.7'),
  default_top_p: numeric('default_top_p').notNull().default('1.0'),
  default_frequency_penalty: numeric('default_frequency_penalty').notNull().default('0.0'),
  default_presence_penalty: numeric('default_presence_penalty').notNull().default('0.0'),
  context_window: integer('context_window').notNull().default(8192),
  description: text('description'),
  category: text('category').notNull().default('text'),
  capabilities: jsonb('capabilities').notNull().default({
    text: true,
    vision: false,
    audio: false,
    video: false,
    functions: false,
    streaming: true,
    json_mode: false,
    fine_tuning: false,
    thinking: false,
    search_grounding: false,
    code_execution: false,
    structured_output: false,
    image_generation: false,
    video_generation: false,
    audio_generation: false
  }),
  metadata: jsonb('metadata'),
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

// Observability tables
export const traces = pgTable('traces', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  startTime: timestamp('startTime', { withTimezone: true }).notNull(),
  endTime: timestamp('endTime', { withTimezone: true }).notNull(),
  duration: numeric('duration').notNull(),
  status: text('status').notNull(),
  userId: varchar('userId', { length: 36 }).notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const spans = pgTable('spans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  traceId: varchar('traceId', { length: 36 }).notNull().references(() => traces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startTime: timestamp('startTime', { withTimezone: true }).notNull(),
  endTime: timestamp('endTime', { withTimezone: true }).notNull(),
  duration: numeric('duration').notNull(),
  status: text('status').notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const events = pgTable('events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  traceId: varchar('traceId', { length: 36 }).notNull().references(() => traces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const system_metrics = pgTable('system_metrics', {
  id: varchar('id', { length: 36 }).primaryKey(),
  timeRange: text('timeRange').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  cpu_usage: numeric('cpu_usage').notNull(),
  memory_usage: numeric('memory_usage').notNull(),
  database_connections: integer('database_connections').notNull(),
  api_requests_per_minute: integer('api_requests_per_minute').notNull(),
  average_response_time_ms: numeric('average_response_time_ms').notNull(),
  active_users: integer('active_users').notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const model_performance = pgTable('model_performance', {
  id: varchar('id', { length: 36 }).primaryKey(),
  modelId: varchar('modelId', { length: 36 }).notNull().references(() => models.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  displayName: text('displayName').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  latency_ms: numeric('latency_ms').notNull(),
  tokens_per_second: numeric('tokens_per_second').notNull(),
  success_rate: numeric('success_rate').notNull(),
  request_count: integer('request_count').notNull(),
  total_tokens: integer('total_tokens').notNull(),
  error_count: integer('error_count').notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const model_costs = pgTable('model_costs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  modelId: varchar('modelId', { length: 36 }).notNull().references(() => models.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  displayName: text('displayName').notNull(),
  costPerInputToken: numeric('costPerInputToken').notNull(),
  costPerOutputToken: numeric('costPerOutputToken').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  cost: numeric('cost').notNull(),
  inputTokens: integer('inputTokens').notNull(),
  outputTokens: integer('outputTokens').notNull(),
  requests: integer('requests').notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const model_evaluations = pgTable('model_evaluations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  modelId: varchar('modelId', { length: 36 }).notNull().references(() => models.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  displayName: text('displayName').notNull(),
  version: text('version').notNull(),
  evaluationDate: timestamp('evaluationDate', { withTimezone: true }).notNull(),
  datasetName: text('datasetName').notNull(),
  datasetSize: integer('datasetSize').notNull(),
  overallScore: numeric('overallScore').notNull(),
  previousScore: numeric('previousScore'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const evaluation_metrics = pgTable('evaluation_metrics', {
  id: varchar('id', { length: 36 }).primaryKey(),
  evaluationId: varchar('evaluationId', { length: 36 }).notNull().references(() => model_evaluations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  value: numeric('value').notNull(),
  threshold: numeric('threshold').notNull(),
  weight: numeric('weight').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const evaluation_examples = pgTable('evaluation_examples', {
  id: varchar('id', { length: 36 }).primaryKey(),
  evaluationId: varchar('evaluationId', { length: 36 }).notNull().references(() => model_evaluations.id, { onDelete: 'cascade' }),
  input: text('input').notNull(),
  expectedOutput: text('expectedOutput').notNull(),
  actualOutput: text('actualOutput').notNull(),
  scores: jsonb('scores').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
