// filepath: db/supabase/schema.ts
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
  foreignKey,
  uuid,
  index,
  ExtraConfigColumn
} from 'drizzle-orm/pg-core'
import { ColumnBaseConfig, ColumnDataType, relations, SQL } from 'drizzle-orm';

// Reusable column definitions
const standardTimestamps = () => ({
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

const withMetadata = () => ({
  metadata: jsonb('metadata').default({}),
});

/**
 * Users table for authentication and roles.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar_url: text('avatar_url'),
  role: text('role').notNull().default('user'), // 'user' or 'admin'
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Apps table for AppBuilder.
 */
export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  type: text('type').notNull(),
  code: text('code').notNull(),
  parameters_schema: jsonb('parameters_schema').default({}),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * App code blocks table for codeBlock.tsx.
 */
export const app_code_blocks = pgTable('app_code_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  app_id: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  language: text('language').notNull(), // e.g. 'typescript', 'javascript', 'json'
  code: text('code').notNull(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Integrations table for external service connections (e.g., GitHub, Google, Notion, Neon, Vercel).
 */
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(), // or app_id if integration is app-wide
  provider: text('provider').notNull(), // e.g. 'github', 'google', 'vercel', 'notion', 'neon'
  name: text('name'),
  config: jsonb('config').default({}),        // Arbitrary config (e.g. repo, org, workspace, etc.)
  credentials: jsonb('credentials').default({}), // Encrypted tokens, API keys, etc.
  status: text('status').notNull().default('inactive'), // 'active', 'inactive', 'error'
  last_synced_at: timestamp('last_synced_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Files table for file tree.
 */
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  app_id: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  parent_id: uuid('parent_id'),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'file' or 'folder'
  content: text('content'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Terminal sessions table.
 */
export const terminal_sessions = pgTable('terminal_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  app_id: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  command: text('command').notNull(),
  output: text('output'),
  status: text('status').notNull().default('pending'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Workflows table
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  current_step_index: integer('current_step_index').notNull().default(0),
  status: text('status').notNull(), // Consider an enum if status values are fixed
  ...withMetadata(),
  ...standardTimestamps(),
});

// Models table
export const models = pgTable('models', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  provider_id: uuid('provider_id').notNull().references(() => providers.id, { onDelete: 'restrict' }), // FK to providers
  model_id: text('model_id').notNull(), // Provider's specific model ID/name
  max_tokens: integer('max_tokens').notNull().default(8192),
  input_cost_per_token: numeric('input_cost_per_token', { precision: 10, scale: 7 }).notNull().default('0.0'),
  output_cost_per_token: numeric('output_cost_per_token', { precision: 10, scale: 7 }).notNull().default('0.0'),
  supports_vision: boolean('supports_vision').notNull().default(false),
  supports_functions: boolean('supports_functions').notNull().default(false),
  supports_streaming: boolean('supports_streaming').notNull().default(true),
  default_temperature: numeric('default_temperature', { precision: 3, scale: 2 }).notNull().default('0.7'),
  default_top_p: numeric('default_top_p', { precision: 3, scale: 2 }).notNull().default('1.0'),
  default_frequency_penalty: numeric('default_frequency_penalty', { precision: 3, scale: 2 }).notNull().default('0.0'),
  default_presence_penalty: numeric('default_presence_penalty', { precision: 3, scale: 2 }).notNull().default('0.0'),
  context_window: integer('context_window').notNull().default(8192),
  description: text('description'),
  category: text('category').notNull().default('text'), // e.g., 'text', 'image', 'audio'
  capabilities: jsonb('capabilities').notNull().default({
    text: true, vision: false, audio: false, video: false, functions: false, streaming: true,
    json_mode: false, fine_tuning: false, thinking: false, search_grounding: false,
    dynamic_retrieval: false, hybrid_grounding: false, cached_content: false,
    code_execution: false, structured_output: false, image_generation: false,
    video_generation: false, audio_generation: false, response_modalities: false, file_inputs: false
  }),
  ...withMetadata(),
  base_url: text('base_url'),
  api_key: text('api_key'), // Can be null if using a central proxy or service that handles keys
  status: text('status').notNull().default('active'), // e.g., 'active', 'deprecated', 'beta'
  ...standardTimestamps(),
});

// Providers table
export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  display_name: text('display_name'),
  api_key: text('api_key'), // Can be null if using a central proxy or service that handles keys
  base_url: text('base_url'),
  status: text('status').notNull().default('active'), // e.g., 'active', 'deprecated', 'beta'
  metadata: jsonb('metadata').default({}),
  ...standardTimestamps(),
});

// Agent Personas table
export const agent_personas = pgTable('agent_personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  system_prompt_template: text('system_prompt_template').notNull(),
  model_settings: jsonb('model_settings').default({}),
  capabilities: jsonb('capabilities').default({
    text: true, vision: false, audio: false, video: false, functions: true, streaming: true,
    json_mode: false, fine_tuning: false, thinking: false, search_grounding: false,
    dynamic_retrieval: false, hybrid_grounding: false, cached_content: false,
    code_execution: false, structured_output: false, image_generation: false,
    video_generation: false, audio_generation: false, response_modalities: false, file_inputs: false
  }),
  tags: jsonb('tags'),
  version: integer('version').default(1),
  is_enabled: boolean('is_enabled').default(true),
  ...standardTimestamps(),
});

// Agents table
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  model_id: uuid('model_id').notNull().references(() => models.id, { onDelete: 'restrict' }), // Restrict deletion if model is in use
  system_prompt: text('system_prompt'),
  persona_id: uuid('persona_id').references(() => agent_personas.id, { onDelete: 'set null' }),
  ...standardTimestamps(),
});

// Tools table
export const tools = pgTable('tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  parameters_schema: jsonb('parameters_schema').notNull(), // Storing as JSONB
  category: text('category').default('custom'),
  implementation: text('implementation'), // For custom tools, JS code string
  is_enabled: boolean('is_enabled').default(true),
  version: text('version'),
  tags: jsonb('tags'), // Storing tags as JSONB array
  ...standardTimestamps(),
});

// Workflow Steps table
export const workflow_steps = pgTable('workflow_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflow_id: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  agent_id: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  input: text('input'),
  thread_id: uuid('thread_id'), // This might link to a LibSQL thread ID, so no direct FK here.
  status: text('status').notNull(),
  result: text('result'),
  error: text('error'), // Consider renaming to error_message if 'error' is a reserved word
  ...withMetadata(),
  ...standardTimestamps(),
});

// Junction table for many-to-many relationship between agents and tools
export const agent_tools = pgTable('agent_tools', {
  agent_id: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  tool_id: uuid('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.agent_id, table.tool_id] }),
  }
});

// Settings table
export const settings = pgTable('settings', {
  category: text('category').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(), // Consider jsonb if value can be complex
  ...standardTimestamps(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.category, table.key] }),
  }
});

// Blog Posts table
export const blog_posts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  author_id: uuid('author_id').references(() => users.id, { onDelete: 'set null' }), // Link to users table
  image_url: text('image_url'),
  tags: jsonb('tags'), // Store as JSONB array
  featured: boolean('featured').default(false),
  published_at: timestamp('published_at', { withTimezone: true }),
  ...standardTimestamps(),
});

// MDX Documents table
export const mdx_documents = pgTable('mdx_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ...standardTimestamps(),
});

// Generic Content table
export const content_table = pgTable('content', { // Renamed to avoid conflict with 'content' column name
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  title: text('title'),
  subtitle: text('subtitle'),
  description: text('description'),
  content_data: text('content_data'), // Main textual content, renamed
  data: jsonb('data'), // For structured content or additional fields
  image_url: text('image_url'),
  ...standardTimestamps(),
});

// Observability: Traces table
export const traces = pgTable('traces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  start_time: timestamp('start_time', { withTimezone: true }).notNull(),
  end_time: timestamp('end_time', { withTimezone: true }), // Nullable if trace is ongoing
  duration_ms: numeric('duration_ms'), // Nullable if trace is ongoing
  status: text('status').notNull(), // e.g., 'success', 'error', 'running'
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  session_id: text('session_id'),
  ...withMetadata(),
  ...standardTimestamps(),
});

// Observability: Spans table
export const spans = pgTable('spans', {
  id: uuid('id').primaryKey().defaultRandom(),
  trace_id: uuid('trace_id').notNull().references(() => traces.id, { onDelete: 'cascade' }),
  parent_span_id: uuid('parent_span_id'),
  name: text('name').notNull(), // Added name field for better identification
  start_time: timestamp('start_time', { withTimezone: true }).notNull(),
  end_time: timestamp('end_time', { withTimezone: true }),
  duration_ms: numeric('duration_ms'),
  status: text('status').notNull(), // e.g., 'success', 'error'
  attributes: jsonb('attributes').default({}), // OTel alignment
  ...withMetadata(), // Added for consistency with traces
  ...standardTimestamps(),
}, (table) => [
  foreignKey({
    columns: [table.parent_span_id],
    foreignColumns: [table.id],
    name: 'spans_parent_span_id_fk' // Explicitly naming the foreign key constraint
  }).onDelete('cascade'),
  index('spans_trace_id_idx').on(table.trace_id),
  index('spans_parent_span_id_idx').on(table.parent_span_id),
  index('spans_name_idx').on(table.name) // Index on name for faster lookups
])
// Observability: Events table (formerly log_events)
export const events = pgTable('events', {  id: uuid('id').primaryKey().defaultRandom(),
  trace_id: uuid('trace_id').notNull().references(() => traces.id, { onDelete: 'cascade' }),
  span_id: uuid('span_id').references(() => spans.id, { onDelete: 'cascade' }), // Link to span
  name: text('name').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  attributes: jsonb('attributes').default({}), // OTel alignment
  ...standardTimestamps(),
});

// System Metrics table
export const system_metrics = pgTable('system_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  time_range: text('time_range'), // e.g., '1m', '5m', '1h' - consider if this is needed or just timestamp
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  cpu_usage: numeric('cpu_usage', { precision: 5, scale: 2 }),
  memory_usage: numeric('memory_usage', { precision: 10, scale: 2 }), // e.g., in MB
  database_connections: integer('database_connections'),
  api_requests_per_minute: integer('api_requests_per_minute'),
  average_response_time_ms: numeric('average_response_time_ms', { precision: 10, scale: 2 }),
  active_users: integer('active_users'),
  ...withMetadata(),
  ...standardTimestamps(),
});

// Model Performance table
export const model_performance = pgTable('model_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  model_id: uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  latency_ms: numeric('latency_ms', { precision: 10, scale: 2 }),
  tokens_per_second: numeric('tokens_per_second', { precision: 10, scale: 2 }),
  success_rate: numeric('success_rate', { precision: 5, scale: 4 }), // e.g. 0.9999
  request_count: integer('request_count').notNull().default(0),
  total_tokens: integer('total_tokens').notNull().default(0), // Input + Output tokens for this period
  error_count: integer('error_count').notNull().default(0),
  ...withMetadata(),
  ...standardTimestamps(),
});

// Model Costs table
export const model_costs = pgTable('model_costs', {
  id: uuid('id').primaryKey().defaultRandom(),
  model_id: uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true, mode: 'date' }).notNull(), // Date of cost aggregation
  cost: numeric('cost', { precision: 10, scale: 4 }).notNull().default('0.0'),
  input_tokens: integer('input_tokens').notNull().default(0),
  output_tokens: integer('output_tokens').notNull().default(0),
  requests: integer('requests').notNull().default(0),
  ...withMetadata(),
  ...standardTimestamps(),
});

// Model Evaluations table
export const model_evaluations = pgTable('model_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  model_id: uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
  version: text('version'), // Version of the model evaluated
  evaluation_date: timestamp('evaluation_date', { withTimezone: true }).notNull().defaultNow(),
  dataset_name: text('dataset_name'),
  dataset_size: integer('dataset_size'),
  overall_score: numeric('overall_score', { precision: 5, scale: 4 }),
  previous_score: numeric('previous_score', { precision: 5, scale: 4 }),
  metadata: jsonb('metadata').default({}), // Store detailed scores, parameters, etc.
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Evaluation Metrics table (detailed metrics for each evaluation)
export const evaluation_metrics = pgTable('evaluation_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  evaluation_id: uuid('evaluation_id').notNull().references(() => model_evaluations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., 'Accuracy', 'BLEU', 'F1-Score'
  description: text('description'),
  value: numeric('value', { precision: 10, scale: 4 }).notNull(),
  threshold: numeric('threshold', { precision: 10, scale: 4 }),
  weight: numeric('weight', { precision: 5, scale: 2 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Persona Scores table
export const persona_scores = pgTable('persona_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  persona_id: uuid('persona_id').notNull().references(() => agent_personas.id, { onDelete: 'cascade' }),
  usage_count: integer('usage_count').notNull().default(0),
  success_rate: numeric('success_rate', { precision: 5, scale: 4 }).notNull().default('0'),
  average_latency_ms: numeric('average_latency_ms', { precision: 10, scale: 2 }).notNull().default('0'),
  user_satisfaction: numeric('user_satisfaction', { precision: 5, scale: 2 }).notNull().default('0'), // e.g., scale of 1-5
  adaptability_score: numeric('adaptability_score', { precision: 5, scale: 2 }).notNull().default('0'),
  overall_score: numeric('overall_score', { precision: 5, scale: 2 }).notNull().default('0'),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Evaluation Examples table
export const evaluation_examples = pgTable('evaluation_examples', {
  id: uuid('id').primaryKey().defaultRandom(),
  evaluation_id: uuid('evaluation_id').notNull().references(() => model_evaluations.id, { onDelete: 'cascade' }),
  input: text('input').notNull(),
  expected_output: text('expected_output'),
  actual_output: text('actual_output'),
  scores: jsonb('scores'), // JSON object with scores for this specific example
  metadata: jsonb('metadata'), // Any other relevant data for this example
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// GQL Cache table
export const gql_cache = pgTable('gql_cache', {
  id: text('id').primaryKey(), // Typically a hash of query + variables
  query: text('query').notNull(),
  variables: text('variables'), // Consider jsonb if variables are complex
  response: jsonb('response').notNull(), // Store response as JSONB
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Documents table (for RAG / Vector Store)
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  embedding: text('embedding'), // Storing as text; pgvector handles text representation.
  source_url: text('source_url'),
  document_type: text('document_type'),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Memory Threads table (for Supabase backup of chat/agent memory)
export const memory_threads = pgTable('memory_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  agent_id: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  name: text('name'), // Optional name for the thread
  summary: text('summary'), // Optional summary
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Messages table (for Supabase backup of chat/agent memory)
export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    thread_id: uuid('thread_id').notNull().references(() => memory_threads.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user', 'assistant', 'system', 'tool'
    content: text('content').notNull(),
    tool_call_id: text('tool_call_id'),
    tool_name: text('tool_name'),
    tool_arguments: jsonb('tool_arguments'),
    tool_result: jsonb('tool_result'),
    attachments: jsonb('attachments'), // Array of attachment objects { type, content, name, etc. }
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
    is_deleted: boolean('is_deleted').notNull().default(false),
});

// Database Connections table (for tracking connection pools)
export const database_connections = pgTable('database_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  connection_type: text('connection_type').notNull(), // 'session', 'transaction', 'direct', 'drizzle'
  pool_name: text('pool_name').notNull(),
  connection_url: text('connection_url').notNull(), // Mask sensitive parts before storing
  max_connections: integer('max_connections'),
  idle_timeout_ms: integer('idle_timeout_ms'),
  connection_timeout_ms: integer('connection_timeout_ms'),
  status: text('status').notNull().default('active'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Database Transactions table
export const database_transactions = pgTable('database_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  connection_id: uuid('connection_id').references(() => database_connections.id, { onDelete: 'set null' }),
  transaction_type: text('transaction_type'), // 'read', 'write', 'mixed'
  start_time: timestamp('start_time', { withTimezone: true }).notNull().defaultNow(),
  end_time: timestamp('end_time', { withTimezone: true }),
  duration_ms: integer('duration_ms'),
  status: text('status').notNull().default('in_progress'), // 'in_progress', 'committed', 'rolled_back', 'failed'
  query_count: integer('query_count').notNull().default(0),
  error_message: text('error_message'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Database Queries table
export const database_queries = pgTable('database_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  transaction_id: uuid('transaction_id').references(() => database_transactions.id, { onDelete: 'cascade' }),
  query_text: text('query_text').notNull(), // Mask sensitive data
  query_type: text('query_type'), // 'select', 'insert', 'update', 'delete', 'other'
  execution_time_ms: integer('execution_time_ms'),
  row_count: integer('row_count'),
  status: text('status').notNull(), // 'completed', 'failed'
  error_message: text('error_message'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Scheduled Tasks table (for pg_cron or similar)
export const scheduled_tasks = pgTable('scheduled_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  cron_expression: text('cron_expression').notNull(),
  job_name: text('job_name').notNull().unique(), // Name for pg_cron job
  sql_command: text('sql_command').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  last_run_at: timestamp('last_run_at', { withTimezone: true }),
  next_run_at: timestamp('next_run_at', { withTimezone: true }),
  run_count: integer('run_count').notNull().default(0),
  error_count: integer('error_count').notNull().default(0),
  last_error: text('last_error'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Scheduled Task Runs table
export const scheduled_task_runs = pgTable('scheduled_task_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  task_id: uuid('task_id').notNull().references(() => scheduled_tasks.id, { onDelete: 'cascade' }),
  start_time: timestamp('start_time', { withTimezone: true }).notNull(),
  end_time: timestamp('end_time', { withTimezone: true }),
  duration_ms: integer('duration_ms'),
  status: text('status').notNull(), // 'running', 'completed', 'failed'
  result_summary: text('result_summary'),
  error_message: text('error_message'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- Drizzle Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  blogPosts: many(blog_posts, { relationName: 'UserBlogPosts' }),
  mdxDocuments: many(mdx_documents, { relationName: 'UserMdxDocuments' }),
  documents: many(documents, { relationName: 'UserDocuments' }),
  traces: many(traces, { relationName: 'UserTraces' }),
  memoryThreads: many(memory_threads, { relationName: 'UserMemoryThreads' }),
}));

export const workflowsRelations = relations(workflows, ({ many }) => ({
  steps: many(workflow_steps, { relationName: 'WorkflowSteps' }),
}));

export const modelsRelations = relations(models, ({ many, one }) => ({
  agents: many(agents, { relationName: 'ModelAgents' }),
  modelPerformances: many(model_performance, { relationName: 'ModelPerformances' }),
  modelCosts: many(model_costs, { relationName: 'ModelCosts' }),
  modelEvaluations: many(model_evaluations, { relationName: 'ModelEvaluations' }),
  provider: one(providers, { fields: [models.provider_id], references: [providers.id], relationName: 'ProviderModels' }),
}));

export const agentPersonasRelations = relations(agent_personas, ({ many }) => ({
  agents: many(agents, { relationName: 'PersonaAgents' }),
  personaScores: many(persona_scores, { relationName: 'PersonaScores' }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  model: one(models, { fields: [agents.model_id], references: [models.id], relationName: 'ModelAgents' }),
  persona: one(agent_personas, { fields: [agents.persona_id], references: [agent_personas.id], relationName: 'PersonaAgents' }),
  agentTools: many(agent_tools, { relationName: 'AgentToolsJunction' }),
  workflowSteps: many(workflow_steps, { relationName: 'AgentWorkflowSteps' }),
  memoryThreads: many(memory_threads, { relationName: 'AgentMemoryThreads' }),
}));

export const toolsRelations = relations(tools, ({ many }) => ({
  agentTools: many(agent_tools, { relationName: 'ToolAgentsJunction' }),
}));

export const workflowStepsRelations = relations(workflow_steps, ({ one }) => ({
  workflow: one(workflows, { fields: [workflow_steps.workflow_id], references: [workflows.id], relationName: 'WorkflowSteps' }),
  agent: one(agents, { fields: [workflow_steps.agent_id], references: [agents.id], relationName: 'AgentWorkflowSteps' }),
}));

export const agentToolsRelations = relations(agent_tools, ({ one }) => ({
  agent: one(agents, { fields: [agent_tools.agent_id], references: [agents.id], relationName: 'AgentToolsJunction' }),
  tool: one(tools, { fields: [agent_tools.tool_id], references: [tools.id], relationName: 'ToolAgentsJunction' }),
}));

export const blogPostsRelations = relations(blog_posts, ({ one }) => ({
  author: one(users, { fields: [blog_posts.author_id], references: [users.id], relationName: 'UserBlogPosts' }),
}));

export const mdxDocumentsRelations = relations(mdx_documents, ({ one }) => ({
  user: one(users, { fields: [mdx_documents.user_id], references: [users.id], relationName: 'UserMdxDocuments' }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, { fields: [documents.user_id], references: [users.id], relationName: 'UserDocuments' }),
}));

export const tracesRelations = relations(traces, ({ one, many }) => ({
  user: one(users, { fields: [traces.user_id], references: [users.id], relationName: 'UserTraces' }),
  spans: many(spans, { relationName: 'TraceSpans' }),
  events: many(events, { relationName: 'TraceEventsDirect' }),
}));

export const spansRelations = relations(spans, ({ one, many }) => ({
  trace: one(traces, { fields: [spans.trace_id], references: [traces.id], relationName: 'TraceSpans' }),
  parentSpan: one(spans, { fields: [spans.parent_span_id], references: [spans.id], relationName: 'SpanHierarchy' }),
  childSpans: many(spans, { relationName: 'SpanHierarchy' }),
  events: many(events, { relationName: 'SpanEvents' }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  trace: one(traces, { fields: [events.trace_id], references: [traces.id], relationName: 'TraceEventsDirect' }),
  span: one(spans, { fields: [events.span_id], references: [spans.id], relationName: 'SpanEvents' }),
}));

export const modelPerformanceRelations = relations(model_performance, ({ one }) => ({
  model: one(models, { fields: [model_performance.model_id], references: [models.id], relationName: 'ModelPerformances' }),
}));

export const modelCostsRelations = relations(model_costs, ({ one }) => ({
  model: one(models, { fields: [model_costs.model_id], references: [models.id], relationName: 'ModelCosts' }),
}));

export const modelEvaluationsRelations = relations(model_evaluations, ({ one, many }) => ({
  model: one(models, { fields: [model_evaluations.model_id], references: [models.id], relationName: 'ModelEvaluations' }),
  metrics: many(evaluation_metrics, { relationName: 'EvaluationMetrics' }),
  examples: many(evaluation_examples, { relationName: 'EvaluationExamples' }),
}));

export const evaluationMetricsRelations = relations(evaluation_metrics, ({ one }) => ({
  evaluation: one(model_evaluations, { fields: [evaluation_metrics.evaluation_id], references: [model_evaluations.id], relationName: 'EvaluationMetrics' }),
}));

export const personaScoresRelations = relations(persona_scores, ({ one }) => ({
  persona: one(agent_personas, { fields: [persona_scores.persona_id], references: [agent_personas.id], relationName: 'PersonaScores' }),
}));

export const evaluationExamplesRelations = relations(evaluation_examples, ({ one }) => ({
  evaluation: one(model_evaluations, { fields: [evaluation_examples.evaluation_id], references: [model_evaluations.id], relationName: 'EvaluationExamples' }),
}));

export const memoryThreadsRelations = relations(memory_threads, ({ one, many }) => ({
  user: one(users, { fields: [memory_threads.user_id], references: [users.id], relationName: 'UserMemoryThreads' }),
  agent: one(agents, { fields: [memory_threads.agent_id], references: [agents.id], relationName: 'AgentMemoryThreads' }),
  messages: many(messages, { relationName: 'ThreadMessages' }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(memory_threads, { fields: [messages.thread_id], references: [memory_threads.id], relationName: 'ThreadMessages' }),
}));

export const databaseConnectionsRelations = relations(database_connections, ({ many }) => ({
  transactions: many(database_transactions, { relationName: 'ConnectionTransactions' }),
}));

export const databaseTransactionsRelations = relations(database_transactions, ({ one, many }) => ({
  connection: one(database_connections, { fields: [database_transactions.connection_id], references: [database_connections.id], relationName: 'ConnectionTransactions' }),
  queries: many(database_queries, { relationName: 'TransactionQueries' }),
}));

export const databaseQueriesRelations = relations(database_queries, ({ one }) => ({
  transaction: one(database_transactions, { fields: [database_queries.transaction_id], references: [database_transactions.id], relationName: 'TransactionQueries' }),
}));

export const scheduledTasksRelations = relations(scheduled_tasks, ({ many }) => ({
  runs: many(scheduled_task_runs, { relationName: 'TaskRuns' }),
}));

export const scheduledTaskRunsRelations = relations(scheduled_task_runs, ({ one }) => ({
  task: one(scheduled_tasks, { fields: [scheduled_task_runs.task_id], references: [scheduled_tasks.id], relationName: 'TaskRuns' }),
}));

// Note: I renamed the 'content' table to 'content_table' and its 'content' column to 'content_data'
// in the schema above to avoid potential SQL or ORM conflicts if 'content' is a reserved keyword
// or causes ambiguity. Please adjust if your setup handles this differently.

// Assuming your schema tables are available in the current scope
// (e.g., if this code is at the end of your schema.ts or you've imported them)

// For the 'users' table
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// For the 'apps' table
export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;

// For the 'app_code_blocks' table
export type AppCodeBlock = typeof app_code_blocks.$inferSelect;
export type NewAppCodeBlock = typeof app_code_blocks.$inferInsert;

// For the 'integrations' table
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

// For the 'files' table
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

// For the 'terminal_sessions' table
export type TerminalSession = typeof terminal_sessions.$inferSelect;
export type NewTerminalSession = typeof terminal_sessions.$inferInsert;

// For the 'workflows' table
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

// For the 'models' table
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;

// For the 'providers' table
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

// For the 'agent_personas' table
export type AgentPersona = typeof agent_personas.$inferSelect;
export type NewAgentPersona = typeof agent_personas.$inferInsert;

// For the 'agents' table
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

// For the 'tools' table
export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;

// For the 'workflow_steps' table
export type WorkflowStep = typeof workflow_steps.$inferSelect;
export type NewWorkflowStep = typeof workflow_steps.$inferInsert;

// For the 'agent_tools' junction table
export type AgentTool = typeof agent_tools.$inferSelect;
export type NewAgentTool = typeof agent_tools.$inferInsert;

// For the 'settings' table
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

// For the 'blog_posts' table
export type BlogPost = typeof blog_posts.$inferSelect;
export type NewBlogPost = typeof blog_posts.$inferInsert;

// For the 'mdx_documents' table
export type MdxDocument = typeof mdx_documents.$inferSelect;
export type NewMdxDocument = typeof mdx_documents.$inferInsert;

// For the 'content_table' (renamed from 'content')
export type ContentTable = typeof content_table.$inferSelect;
export type NewContentTable = typeof content_table.$inferInsert;

// For the 'traces' table
export type Trace = typeof traces.$inferSelect;
export type NewTrace = typeof traces.$inferInsert;

// For the 'spans' table
export type Span = typeof spans.$inferSelect;
export type NewSpan = typeof spans.$inferInsert;

// For the 'events' table (formerly log_events)
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// For the 'system_metrics' table
export type SystemMetric = typeof system_metrics.$inferSelect;
export type NewSystemMetric = typeof system_metrics.$inferInsert;

// For the 'model_performance' table
export type ModelPerformance = typeof model_performance.$inferSelect;
export type NewModelPerformance = typeof model_performance.$inferInsert;

// For the 'model_costs' table
export type ModelCost = typeof model_costs.$inferSelect;
export type NewModelCost = typeof model_costs.$inferInsert;

// For the 'model_evaluations' table
export type ModelEvaluation = typeof model_evaluations.$inferSelect;
export type NewModelEvaluation = typeof model_evaluations.$inferInsert;

// For the 'evaluation_metrics' table
export type EvaluationMetric = typeof evaluation_metrics.$inferSelect;
export type NewEvaluationMetric = typeof evaluation_metrics.$inferInsert;

// For the 'persona_scores' table
export type PersonaScore = typeof persona_scores.$inferSelect;
export type NewPersonaScore = typeof persona_scores.$inferInsert;

// For the 'evaluation_examples' table
export type EvaluationExample = typeof evaluation_examples.$inferSelect;
export type NewEvaluationExample = typeof evaluation_examples.$inferInsert;

// For the 'gql_cache' table
export type GqlCache = typeof gql_cache.$inferSelect;
export type NewGqlCache = typeof gql_cache.$inferInsert;

// For the 'documents' table
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

// For the 'memory_threads' table
export type MemoryThread = typeof memory_threads.$inferSelect;
export type NewMemoryThread = typeof memory_threads.$inferInsert;

// For the 'messages' table
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// For the 'database_connections' table
export type DatabaseConnection = typeof database_connections.$inferSelect;
export type NewDatabaseConnection = typeof database_connections.$inferInsert;

// For the 'database_transactions' table
export type DatabaseTransaction = typeof database_transactions.$inferSelect;
export type NewDatabaseTransaction = typeof database_transactions.$inferInsert;

// For the 'database_queries' table
export type DatabaseQuery = typeof database_queries.$inferSelect;
export type NewDatabaseQuery = typeof database_queries.$inferInsert;

// For the 'scheduled_tasks' table
export type ScheduledTask = typeof scheduled_tasks.$inferSelect;
export type NewScheduledTask = typeof scheduled_tasks.$inferInsert;

// For the 'scheduled_task_runs' table
export type ScheduledTaskRun = typeof scheduled_task_runs.$inferSelect;
export type NewScheduledTaskRun = typeof scheduled_task_runs.$inferInsert;